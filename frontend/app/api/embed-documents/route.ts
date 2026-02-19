import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Sendungen die ignoriert werden sollen
const EXCLUDED_SHOWS = new Set([
  "Phoenix Runde",
  "Phoenix Persönlich",
  "Pinar Atalay",
  "Blome & Pfeffer",
]);

// ─────────────────────────────────────────────
// Embedding-Helper
// ─────────────────────────────────────────────
async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/embed`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input: text }),
    });

    if (!response.ok) {
      console.error(
        "❌ Embedding-Fehler:",
        response.status,
        await response.text(),
      );
      return null;
    }

    const { embedding } = await response.json();
    return embedding;
  } catch (error) {
    console.error("❌ Fehler bei Embedding-Generierung:", error);
    return null;
  }
}

interface Results {
  deleted: number;
  partyStats: number;
  politicianStats: number;
  politicianShowStats: number;
  yearlyStats: number;
  topicStats: number;
  showStats: number;
  episodes: number;
  summary: number;
  errors: string[];
}

interface DocTask {
  content: string;
  metadata: Record<string, unknown>;
  resultKey: keyof Results;
}

// Batch-Processor für effizientere Abarbeitung
class BatchProcessor {
  private queue: DocTask[] = [];

  add(
    content: string,
    metadata: Record<string, unknown>,
    resultKey: keyof Results,
  ) {
    this.queue.push({ content, metadata, resultKey });
  }

  async flush(this: BatchProcessor, results: Results) {
    const BATCH_SIZE = 50;
    const CONCURRENCY = 5; // Gleichzeitige Embedding-Requests

    console.log(
      `🚀 Starte Batch-Verarbeitung für ${this.queue.length} Dokumente...`,
    );

    for (let i = 0; i < this.queue.length; i += BATCH_SIZE) {
      const batch = this.queue.slice(i, i + BATCH_SIZE);
      const validItems: {
        task: DocTask;
        embedding: number[];
      }[] = [];

      // 1. Embeddings generieren (limitiert parallel)
      for (let j = 0; j < batch.length; j += CONCURRENCY) {
        const subBatch = batch.slice(j, j + CONCURRENCY);
        await Promise.all(
          subBatch.map(async (task) => {
            const embedding = await generateEmbedding(task.content);
            if (embedding) {
              validItems.push({ task, embedding });
            } else {
              results.errors.push(
                `Embedding failed: ${task.content.slice(0, 50)}...`,
              );
            }
          }),
        );
      }

      // 2. Batch Insert in Supabase
      if (validItems.length > 0) {
        const { error } = await supabase.from("documents").insert(
          validItems.map((vi) => ({
            content: vi.task.content,
            metadata: vi.task.metadata,
            embedding: vi.embedding,
          })),
        );

        if (error) {
          results.errors.push(`Database error: ${error.message}`);
          console.error("❌ Batch Insert Error:", error);
        } else {
          // Stats updaten
          validItems.forEach((vi) => {
            const key = vi.task.resultKey;
            // TS Check: keyof Results -> number check
            if (typeof results[key] === "number") {
              (results[key] as number)++;
            }
          });
        }
      }

      // Fortschritt loggen
      const currentBatchNum = Math.ceil((i + 1) / BATCH_SIZE);
      const outputTotal = Math.ceil(this.queue.length / BATCH_SIZE);
      console.log(`✅ Batch ${currentBatchNum}/${outputTotal} verarbeitet`);
    }
  }
}

// ─────────────────────────────────────────────
// Haupt-Route
// ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const results: Results = {
    deleted: 0,
    partyStats: 0,
    politicianStats: 0,
    politicianShowStats: 0,
    yearlyStats: 0,
    topicStats: 0,
    showStats: 0,
    episodes: 0,
    summary: 0,
    errors: [],
  };

  // Batcher initialisieren und lokale Helper-Funktion definieren
  const batcher = new BatchProcessor();
  // Wrapper, damit der restliche Code nicht geändert werden muss
  const insertDoc = (
    content: string,
    metadata: Record<string, unknown>,
    _results: Results,
    resultKey: keyof Results,
  ) => {
    // _results wird ignoriert, da der Batcher die Ergebnisse am Ende in `flush` schreibt
    batcher.add(content, metadata, resultKey);
    // Sync return, da wir nur zur Queue hinzufügen
    return Promise.resolve();
  };

  try {
    // ── 0. Alte Dokumente löschen ──────────────────────────────────────────
    const { error: deleteError, count: deletedCount } = await supabase
      .from("documents")
      .delete()
      .neq("id", 0);

    if (deleteError) throw deleteError;
    results.deleted = deletedCount || 0;
    console.log(`🗑️  ${results.deleted} alte Dokumente gelöscht`);

    // ── Rohdaten laden ─────────────────────────────────────────────────────
    const { data: allPoliticians, error: fetchError } = await supabase
      .from("tv_show_politicians")
      .select(
        "party_name, politician_name, show_name, episode_date, tv_channel",
      );

    if (fetchError) throw fetchError;
    if (!allPoliticians) throw new Error("Keine Daten gefunden");

    // Gefilterte Liste (ohne irrelevante Shows)
    const filtered = allPoliticians.filter(
      (p) => !EXCLUDED_SHOWS.has(p.show_name),
    );

    // ── Episoden-Map aufbauen ──────────────────────────────────────────────
    const episodeMap: Record<
      string,
      { show: string; date: string; guests: string[] }
    > = {};
    filtered.forEach((entry) => {
      if (!entry.episode_date) return;
      const key = `${entry.show_name}|${entry.episode_date}`;
      if (!episodeMap[key]) {
        episodeMap[key] = {
          show: entry.show_name,
          date: entry.episode_date,
          guests: [],
        };
      }
      episodeMap[key].guests.push(
        `${entry.politician_name} (${entry.party_name || "parteilos"})`,
      );
    });

    const episodeList = Object.values(episodeMap).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    const shows = [...new Set(episodeList.map((e) => e.show))];

    // ── 1. Show-spezifische Zusammenfassungen ──────────────────────────────
    // "Wer war zuletzt bei Sendung X?" — letzte 5 Episoden pro Show
    console.log("📺 Starte Show-Summaries...");
    for (const showName of shows) {
      const showEps = episodeList
        .filter((e) => e.show === showName)
        .slice(0, 5);
      if (!showEps.length) continue;

      const latestInfo = showEps
        .map(
          (e) =>
            `am ${new Date(e.date).toLocaleDateString("de-DE")} (Gäste: ${e.guests.join(", ")})`,
        )
        .join("; ");

      await insertDoc(
        `Zusammenfassung für ${showName}: Die aktuellsten Sendungen von "${showName}" waren: ${latestInfo}.`,
        {
          type: "show_latest_summary",
          show: showName,
          latest_date: showEps[0].date,
        },
        results,
        "summary",
      );
    }

    // ── 2. Globale "letzte Sendungen"-Zusammenfassung ──────────────────────
    const last5 = episodeList.slice(0, 5);
    const last5Content =
      "Die allerletzten erfassten Sendungen waren: " +
      last5
        .map(
          (e) =>
            `${e.show} am ${new Date(e.date).toLocaleDateString("de-DE")} (Gäste: ${e.guests.join(", ")})`,
        )
        .join("; ");

    // Zweimal embedden: einmal mit Suchterm-Prefix, einmal ohne → bessere Retrieval-Abdeckung
    await insertDoc(
      last5Content,
      { type: "latest_shows_summary", count: 5 },
      results,
      "summary",
    );

    // ── 3. Parteien-Statistiken (Gesamt) ───────────────────────────────────
    console.log("🏛️  Starte Parteien-Statistiken...");
    const partyCounts: Record<string, number> = {};
    filtered.forEach((p) => {
      if (p.party_name)
        partyCounts[p.party_name] = (partyCounts[p.party_name] || 0) + 1;
    });

    // Ranking-Dokument (alle Parteien auf einmal) — hilft bei "Welche Partei war am häufigsten?"
    const partyRanking = Object.entries(partyCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([party, count], i) => `${i + 1}. ${party}: ${count} Auftritte`)
      .join(", ");

    await insertDoc(
      `Parteien-Ranking nach Talkshow-Auftritten gesamt: ${partyRanking}.`,
      { type: "party_ranking", counts: partyCounts },
      results,
      "partyStats",
    );

    // Einzelne Partei-Dokumente
    for (const [party, count] of Object.entries(partyCounts)) {
      await insertDoc(
        `Die Partei ${party} hatte insgesamt ${count} Auftritte in politischen Talkshows.`,
        { type: "party_stats", party, count },
        results,
        "partyStats",
      );
    }

    // ── 4. Politiker-Statistiken (Gesamt) ──────────────────────────────────
    console.log("🧑‍💼 Starte Politiker-Statistiken...");
    const politicianCounts: Record<string, { count: number; party: string }> =
      {};
    filtered.forEach((p) => {
      const key = p.politician_name;
      if (!politicianCounts[key])
        politicianCounts[key] = {
          count: 0,
          party: p.party_name || "parteilos",
        };
      politicianCounts[key].count++;
    });

    const sortedPoliticians = Object.entries(politicianCounts).sort(
      ([, a], [, b]) => b.count - a.count,
    );

    // Top-20-Ranking-Dokument — hilft bei "Wer war am häufigsten in Talkshows?"
    const top20Ranking = sortedPoliticians
      .slice(0, 20)
      .map(([name, s], i) => `${i + 1}. ${name} (${s.party}): ${s.count}x`)
      .join(", ");

    await insertDoc(
      `Top-20 Politiker nach Talkshow-Auftritten gesamt: ${top20Ranking}.`,
      { type: "politician_ranking", top: 20 },
      results,
      "politicianStats",
    );

    // Einzelne Politiker-Dokumente
    for (const [name, stats] of sortedPoliticians) {
      await insertDoc(
        `Der Politiker ${name} (${stats.party}) war insgesamt ${stats.count} mal zu Gast in Talkshows.`,
        {
          type: "politician_stats",
          politician: name,
          party: stats.party,
          count: stats.count,
        },
        results,
        "politicianStats",
      );
    }

    // ── 5. Politiker × Show-Statistiken (NEU) ─────────────────────────────
    // "Wie oft war Merz bei Markus Lanz?" / "Wer war am häufigsten bei Hart aber fair?"
    console.log("🔗 Starte Politiker×Show-Statistiken...");
    const polShowCounts: Record<
      string,
      { count: number; party: string; show: string }
    > = {};
    filtered.forEach((p) => {
      const key = `${p.politician_name}|${p.show_name}`;
      if (!polShowCounts[key]) {
        polShowCounts[key] = {
          count: 0,
          party: p.party_name || "parteilos",
          show: p.show_name,
        };
      }
      polShowCounts[key].count++;
    });

    // Nur Kombinationen mit ≥ 2 Auftritten einbetten (reduziert Rauschen)
    const relevantPolShow = Object.entries(polShowCounts)
      .filter(([, v]) => v.count >= 2)
      .sort(([, a], [, b]) => b.count - a.count);

    for (const [key, stats] of relevantPolShow) {
      const [name] = key.split("|");
      await insertDoc(
        `${name} (${stats.party}) war ${stats.count} mal in der Sendung "${stats.show}" zu Gast.`,
        {
          type: "politician_show_stats",
          politician: name,
          party: stats.party,
          show: stats.show,
          count: stats.count,
        },
        results,
        "politicianShowStats",
      );
    }

    // Pro Show: Top-10-Ranking-Dokument
    for (const showName of shows) {
      const showTop = Object.entries(polShowCounts)
        .filter(([, v]) => v.show === showName)
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 10);

      if (!showTop.length) continue;

      const rankText = showTop
        .map(
          ([key, s], i) =>
            `${i + 1}. ${key.split("|")[0]} (${s.party}): ${s.count}x`,
        )
        .join(", ");

      await insertDoc(
        `Top-Gäste bei "${showName}": ${rankText}.`,
        { type: "show_top_guests", show: showName },
        results,
        "showStats",
      );
    }

    // ── 6. Sendungs-Statistiken (Gesamt) ───────────────────────────────────
    console.log("📡 Starte Sendungs-Statistiken...");
    const showCounts: Record<string, number> = {};
    filtered.forEach((p) => {
      showCounts[p.show_name] = (showCounts[p.show_name] || 0) + 1;
    });

    for (const [show, count] of Object.entries(showCounts)) {
      await insertDoc(
        `Die Sendung "${show}" hat insgesamt ${count} erfasste Gäste-Auftritte.`,
        { type: "show_stats", show, count },
        results,
        "showStats",
      );
    }

    // ── 7. Jahres-Statistiken ──────────────────────────────────────────────
    console.log("📅 Starte Jahres-Statistiken...");
    const years = [
      ...new Set(
        filtered
          .map((p) =>
            p.episode_date ? new Date(p.episode_date).getFullYear() : null,
          )
          .filter((y): y is number => y !== null),
      ),
    ].sort();

    for (const year of years) {
      const polsInYear = filtered.filter(
        (p) =>
          p.episode_date && new Date(p.episode_date).getFullYear() === year,
      );

      // Politiker-Ranking pro Jahr (alle, nicht nur Top 10)
      const yearlyPolCounts: Record<string, { count: number; party: string }> =
        {};
      polsInYear.forEach((p) => {
        const key = p.politician_name;
        if (!yearlyPolCounts[key])
          yearlyPolCounts[key] = {
            count: 0,
            party: p.party_name || "parteilos",
          };
        yearlyPolCounts[key].count++;
      });

      const sortedYear = Object.entries(yearlyPolCounts).sort(
        ([, a], [, b]) => b.count - a.count,
      );

      // Ranking-Dokument pro Jahr (Top 15)
      const yearRanking = sortedYear
        .slice(0, 15)
        .map(([name, s], i) => `${i + 1}. ${name} (${s.party}): ${s.count}x`)
        .join(", ");

      await insertDoc(
        `Top-Politiker in Talkshows im Jahr ${year}: ${yearRanking}.`,
        { type: "yearly_politician_ranking", year },
        results,
        "yearlyStats",
      );

      // Einzelne Einträge (alle, nicht nur Top 10)
      for (const [name, stats] of sortedYear) {
        await insertDoc(
          `Im Jahr ${year} war der Politiker ${name} (${stats.party}) ${stats.count} mal zu Gast in Talkshows.`,
          {
            type: "yearly_politician_stats",
            year,
            politician: name,
            count: stats.count,
          },
          results,
          "yearlyStats",
        );
      }

      // Parteien-Ranking pro Jahr
      const yearlyPartyCounts: Record<string, number> = {};
      polsInYear.forEach((p) => {
        if (p.party_name)
          yearlyPartyCounts[p.party_name] =
            (yearlyPartyCounts[p.party_name] || 0) + 1;
      });

      const yearlyPartyRanking = Object.entries(yearlyPartyCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([party, count], i) => `${i + 1}. ${party}: ${count}x`)
        .join(", ");

      await insertDoc(
        `Parteien-Ranking in Talkshows im Jahr ${year}: ${yearlyPartyRanking}.`,
        { type: "yearly_party_ranking", year },
        results,
        "yearlyStats",
      );

      for (const [party, count] of Object.entries(yearlyPartyCounts)) {
        await insertDoc(
          `Im Jahr ${year} hatte die Partei ${party} ${count} Auftritte in Talkshows.`,
          { type: "yearly_party_stats", year, party, count },
          results,
          "yearlyStats",
        );
      }
    }

    // ── 8. Themen-Statistiken ──────────────────────────────────────────────
    console.log("🏷️  Starte Themen-Statistiken...");
    const { data: politicalAreas } = await supabase
      .from("political_area")
      .select("id, label"); // Spalte heißt "label", nicht "name"
    const { data: episodeAreas } = await supabase
      .from("tv_show_episode_political_areas")
      .select("political_area_id, show_name, episode_date");

    if (politicalAreas && episodeAreas) {
      const areaMap = new Map(politicalAreas.map((a) => [a.id, a.label]));

      // Gesamt-Häufigkeit pro Thema
      const areaCounts: Record<string, number> = {};
      // Häufigkeit pro Thema × Show
      const areaShowCounts: Record<string, Record<string, number>> = {};
      // Häufigkeit pro Thema × Jahr
      const areaYearCounts: Record<string, Record<number, number>> = {};
      // Themen pro Episode (für Episode-Detail-Embeddings)
      const episodeTopics: Record<string, string[]> = {};

      episodeAreas.forEach((ea) => {
        if (EXCLUDED_SHOWS.has(ea.show_name)) return;
        const label = areaMap.get(ea.political_area_id);
        if (!label) return;

        areaCounts[label] = (areaCounts[label] || 0) + 1;

        if (!areaShowCounts[label]) areaShowCounts[label] = {};
        areaShowCounts[label][ea.show_name] =
          (areaShowCounts[label][ea.show_name] || 0) + 1;

        if (ea.episode_date) {
          const year = new Date(ea.episode_date).getFullYear();
          if (!areaYearCounts[label]) areaYearCounts[label] = {};
          areaYearCounts[label][year] = (areaYearCounts[label][year] || 0) + 1;

          const epKey = `${ea.show_name}|${ea.episode_date}`;
          if (!episodeTopics[epKey]) episodeTopics[epKey] = [];
          if (!episodeTopics[epKey].includes(label))
            episodeTopics[epKey].push(label);
        }
      });

      // 8a. Gesamt-Themen-Ranking
      const topicRanking = Object.entries(areaCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([topic, count], i) => `${i + 1}. ${topic}: ${count}x`)
        .join(", ");

      await insertDoc(
        `Themen-Ranking nach Häufigkeit in Talkshows: ${topicRanking}.`,
        { type: "topic_ranking" },
        results,
        "topicStats",
      );

      // 8b. Einzelne Themen-Dokumente (Gesamt)
      for (const [topic, count] of Object.entries(areaCounts)) {
        const showBreakdown = Object.entries(areaShowCounts[topic] || {})
          .sort(([, a], [, b]) => b - a)
          .map(([show, c]) => `${show}: ${c}x`)
          .join(", ");
        await insertDoc(
          `Das Thema "${topic}" wurde insgesamt ${count} Mal in Talkshows behandelt. Aufschlüsselung nach Sendung: ${showBreakdown}.`,
          { type: "topic_stats", topic, count },
          results,
          "topicStats",
        );
      }

      // 8c. Themen-Ranking pro Show
      for (const showName of shows) {
        const showTopics = Object.entries(areaShowCounts)
          .map(([topic, showMap]) => ({ topic, count: showMap[showName] || 0 }))
          .filter((t) => t.count > 0)
          .sort((a, b) => b.count - a.count);
        if (!showTopics.length) continue;
        const rankText = showTopics
          .map((t, i) => `${i + 1}. ${t.topic}: ${t.count}x`)
          .join(", ");
        await insertDoc(
          `Themen-Ranking bei "${showName}": ${rankText}.`,
          { type: "topic_show_ranking", show: showName },
          results,
          "topicStats",
        );
      }

      // 8d. Themen-Ranking pro Jahr
      for (const year of years) {
        const yearTopics = Object.entries(areaYearCounts)
          .map(([topic, yearMap]) => ({ topic, count: yearMap[year] || 0 }))
          .filter((t) => t.count > 0)
          .sort((a, b) => b.count - a.count);
        if (!yearTopics.length) continue;
        const rankText = yearTopics
          .map((t, i) => `${i + 1}. ${t.topic}: ${t.count}x`)
          .join(", ");
        await insertDoc(
          `Themen-Ranking in Talkshows im Jahr ${year}: ${rankText}.`,
          { type: "topic_year_ranking", year },
          results,
          "topicStats",
        );
      }

      // 8f. Thema × Jahr × Show-Aufschlüsselung
      // "Wie oft wurde Sicherheit 2026 besprochen?" → vollständige Antwort
      // Dafür bauen wir: areaYearShowCounts[label][year][show] = count
      const areaYearShowCounts: Record<
        string,
        Record<number, Record<string, number>>
      > = {};
      episodeAreas.forEach((ea) => {
        if (EXCLUDED_SHOWS.has(ea.show_name)) return;
        if (!ea.episode_date) return;
        const label = areaMap.get(ea.political_area_id);
        if (!label) return;
        const year = new Date(ea.episode_date).getFullYear();
        if (!areaYearShowCounts[label]) areaYearShowCounts[label] = {};
        if (!areaYearShowCounts[label][year])
          areaYearShowCounts[label][year] = {};
        areaYearShowCounts[label][year][ea.show_name] =
          (areaYearShowCounts[label][year][ea.show_name] || 0) + 1;
      });

      for (const [topic, yearMap] of Object.entries(areaYearShowCounts)) {
        for (const [yearStr, showMap] of Object.entries(yearMap)) {
          const year = Number(yearStr);
          const total = Object.values(showMap).reduce((a, b) => a + b, 0);
          const showBreakdown = Object.entries(showMap)
            .sort(([, a], [, b]) => b - a)
            .map(([show, c]) => `${show}: ${c}x`)
            .join(", ");
          await insertDoc(
            `Das Thema "${topic}" wurde im Jahr ${year} insgesamt ${total} Mal in Talkshows behandelt. Aufschlüsselung nach Sendung: ${showBreakdown}.`,
            { type: "topic_year_show_stats", topic, year, total },
            results,
            "topicStats",
          );
        }
      }

      // 8e. Episoden-Themen (Episoden mit ihren Themen verknüpfen)
      for (const [epKey, topics] of Object.entries(episodeTopics)) {
        const [showName, dateStr] = epKey.split("|");
        const dateFormatted = new Date(dateStr).toLocaleDateString("de-DE");
        await insertDoc(
          `Die Sendung "${showName}" vom ${dateFormatted} behandelte folgende Themen: ${topics.join(", ")}.`,
          { type: "episode_topics", show: showName, date: dateStr },
          results,
          "topicStats",
        );
      }
    }

    // ── 9. Episoden-Details (alle) ─────────────────────────────────────────
    console.log("🎬 Starte Episoden-Details...");
    for (const ep of episodeList) {
      const dateStr = new Date(ep.date).toLocaleDateString("de-DE");
      await insertDoc(
        `Am ${dateStr} waren in der Sendung "${ep.show}" folgende Gäste: ${ep.guests.join(", ")}.`,
        {
          type: "episode_detail",
          show: ep.show,
          date: ep.date,
          guest_count: ep.guests.length,
        },
        results,
        "episodes",
      );
    }

    // ── 10. Batch-Verarbeitung ausführen ──────────────────────────────────
    await batcher.flush(results);

    const elapsedMs = Date.now() - startTime;
    const elapsedMin = Math.floor(elapsedMs / 60000);
    const elapsedSec = Math.floor((elapsedMs % 60000) / 1000);
    const duration = `${String(elapsedMin).padStart(2, "0")}:${String(elapsedSec).padStart(2, "0")}`;

    console.log(`✅ Fertig! Dauer: ${duration}`, results);
    return NextResponse.json({ success: true, duration, stats: results });
  } catch (error) {
    console.error("❌ Critical Error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
