import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Types
interface PartyStats {
  party_name: string;
  count: number;
}

interface EpisodeData {
  episode_date: string;
  politician_count: number;
}

interface MonthlyPoint {
  month: string; // "01".."12"
  count: number;
}

interface ComboStat {
  politician_name: string;
  party_name: string;
  count: number;
}

function applyShowFilter(
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  showName: string | null,
  year?: string | null,
  tv_channel?: string | null,
) {
  // 1️⃣ Erst nach showName filtern
  if (showName !== null) {
    query = query.eq("show_name", showName);
  }

  if (year && year !== "all") {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    query = query.gte("episode_date", startDate).lte("episode_date", endDate);
  }

  if (tv_channel) {
    query = query.eq("tv_channel", tv_channel);
  }

  query = query
    .neq("show_name", "Phoenix Runde")
    .neq("show_name", "Phoenix Persönlich")
    .neq("show_name", "Pinar Atalay")
    .neq("show_name", "Blome & Pfeffer");
  return query;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const showName = searchParams.get("show");

    if (!type) {
      return NextResponse.json(
        { error: "Missing required parameter 'type'" },
        { status: 400 },
      );
    }
    const year = searchParams.get("year");
    const tv_channel = searchParams.get("tv_channel");
    const limit = parseInt(searchParams.get("limit") || "0");
    const offset = parseInt(searchParams.get("offset") || "0");

    switch (type) {
      case "party-stats": {
        let query = supabase
          .from("tv_show_politicians")
          .select("party_name")
          .not("party_name", "is", null)
          .neq("party_name", "");

        query = applyShowFilter(query, showName, year, tv_channel);

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        // Gruppiere und zähle (optimiert mit Map statt Object)
        const partyCount = new Map<string, number>();
        data.forEach((row) => {
          const party = row.party_name;
          partyCount.set(party, (partyCount.get(party) || 0) + 1);
        });

        const results: PartyStats[] = Array.from(partyCount.entries())
          .map(([party_name, count]) => ({ party_name, count }))
          .sort((a, b) => b.count - a.count);

        return NextResponse.json({
          success: true,
          data: results,
          total: results.reduce((sum, item) => sum + item.count, 0),
        });
      }

      case "episodes": {
        let query = supabase.from("tv_show_politicians").select("episode_date");

        query = applyShowFilter(query, showName, year, tv_channel);

        query = query.order("episode_date", { ascending: false });

        if (limit > 0) {
          query = query.limit(limit);
        } else {
          query = query.limit(50);
        }

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        // Gruppiere und zähle mit Map
        const episodeCount = new Map<string, number>();
        data.forEach((row) => {
          const date = row.episode_date;
          episodeCount.set(date, (episodeCount.get(date) || 0) + 1);
        });

        const results: EpisodeData[] = Array.from(episodeCount.entries())
          .map(([episode_date, politician_count]) => ({
            episode_date,
            politician_count,
          }))
          .sort((a, b) => b.episode_date.localeCompare(a.episode_date));

        return NextResponse.json({
          success: true,
          data: results,
        });
      }

      case "episodes-with-politicians": {
        // Erste Abfrage: Hole alle Politiker-Daten
        let politiciansQuery = supabase
          .from("tv_show_politicians")
          .select("episode_date, politician_name, party_name");

        politiciansQuery = applyShowFilter(
          politiciansQuery,
          showName,
          year,
          tv_channel,
        );

        politiciansQuery = politiciansQuery.order("episode_date", {
          ascending: false,
        });

        if (limit > 0) {
          politiciansQuery = politiciansQuery.limit(limit);
        }

        const { data: politiciansData, error: politiciansError } =
          await politiciansQuery;

        if (politiciansError) {
          throw politiciansError;
        }

        // Zweite Abfrage: Hole Episode-URLs für die Show
        const { data: showLinksData, error: showLinksError } = await supabase
          .from("show_links")
          .select("episode_date, episode_url")
          .eq("show_name", showName);

        if (showLinksError) {
          console.warn("Warning: Could not fetch show links:", showLinksError);
        }

        // Erstelle eine Map für schnelle URL-Lookups
        const urlMap = new Map<string, string>();
        if (showLinksData) {
          showLinksData.forEach((link) => {
            urlMap.set(link.episode_date, link.episode_url);
          });
        }

        // Gruppiere nach episode_date
        const episodeMap = new Map<string, string[]>();
        politiciansData.forEach((result) => {
          if (!episodeMap.has(result.episode_date)) {
            episodeMap.set(result.episode_date, []);
          }
          episodeMap.get(result.episode_date)!.push(result.politician_name);
        });

        // Erstelle finale Episoden-Liste
        const episodesWithPoliticians = Array.from(episodeMap.entries()).map(
          ([date, politicianNames]) => ({
            episode_date: date,
            politician_count: politicianNames.length,
            episode_url: urlMap.get(date) || null,
            politicians: politicianNames.map((name) => {
              const result = politiciansData.find(
                (r) => r.politician_name === name && r.episode_date === date,
              );
              return {
                name: name,
                party_name: result?.party_name || "Unbekannt",
              };
            }),
          }),
        );

        return NextResponse.json({
          success: true,
          data: episodesWithPoliticians,
        });
      }

      case "recent": {
        // Letzte Auftritte
        let query = supabase
          .from("tv_show_politicians")
          .select("show_name, episode_date, politician_name, party_name");

        query = applyShowFilter(query, showName, year, tv_channel);

        query = query
          .order("episode_date", { ascending: false })
          .order("id", { ascending: false })
          .limit(limit > 0 ? limit : 20);

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        return NextResponse.json({
          success: true,
          data: data,
        });
      }

      case "summary": {
        let query = supabase.from("tv_show_politicians").select("*");

        query = applyShowFilter(query, showName, year, tv_channel);

        const { data: allData, error } = await query;

        if (error) {
          throw error;
        }

        const total = allData?.length || 0;
        const episodes = new Set(
          allData?.map((d: { episode_date: string }) => d.episode_date),
        ).size;
        const politicians = new Set(
          allData?.map((d: { politician_name: string }) => d.politician_name),
        ).size;
        const parties = new Set(
          allData
            ?.filter((d: { party_name: string | null }) => d.party_name)
            .map((d: { party_name: string }) => d.party_name),
        ).size;

        return NextResponse.json({
          success: true,
          data: {
            total_appearances: total,
            total_episodes: episodes,
            unique_politicians: politicians,
            parties_represented: parties,
            show_name: showName || "Alle Shows",
          },
        });
      }

      case "detailed-appearances": {
        let query = supabase
          .from("tv_show_politicians")
          .select(
            "show_name, episode_date, politician_name, party_name, abgeordnetenwatch_url",
          )
          .order("episode_date", { ascending: false })
          .order("id", { ascending: false })
          .range(offset, offset + limit - 1);

        query = applyShowFilter(query, showName, year, tv_channel);

        const { data, error } = await query;
        if (error) {
          throw error;
        }

        // Hole alle relevanten episode_urls aus show_links
        let showLinksQuery = supabase
          .from("show_links")
          .select("episode_date, episode_url");
        if (showName) {
          showLinksQuery = showLinksQuery.eq("show_name", showName);
        }
        const { data: showLinksData, error: showLinksError } =
          await showLinksQuery;
        if (showLinksError) {
          console.warn("Warning: Could not fetch show links:", showLinksError);
        }
        const urlMap = new Map();
        if (showLinksData) {
          showLinksData.forEach((link) => {
            urlMap.set(link.episode_date, link.episode_url);
          });
        }

        // Füge jeder Zeile die episode_url hinzu
        const dataWithUrls = data.map((row) => ({
          ...row,
          episode_url: urlMap.get(row.episode_date) || null,
        }));

        // Hole Gesamtanzahl für Pagination
        let countQuery = supabase
          .from("tv_show_politicians")
          .select("*", { count: "exact", head: true });
        countQuery = applyShowFilter(countQuery, showName, year, tv_channel);
        const { count: totalCount } = await countQuery;

        return NextResponse.json({
          success: true,
          data: dataWithUrls,
          pagination: {
            limit,
            offset,
            total: { count: totalCount || 0 },
          },
        });
      }

      case "episode-statistics": {
        let query = supabase.from("tv_show_politicians").select("episode_date");

        query = applyShowFilter(query, showName, year, tv_channel);

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        // Gruppiere mit Map
        const episodeCount = new Map<string, number>();
        data.forEach((row) => {
          const date = row.episode_date;
          episodeCount.set(date, (episodeCount.get(date) || 0) + 1);
        });

        const episodeStats = Array.from(episodeCount.entries()).map(
          ([episode_date, politician_count]) => ({
            episode_date,
            politician_count,
          }),
        );

        const totalAppearances = data.length;

        const statistics = {
          total_episodes: episodeStats.length,
          total_appearances: totalAppearances,
          episodes_with_politicians: episodeStats.length,
          average_politicians_per_episode:
            episodeStats.length > 0
              ? parseFloat((totalAppearances / episodeStats.length).toFixed(2))
              : 0,
          max_politicians_in_episode:
            episodeStats.length > 0
              ? Math.max(...episodeStats.map((ep) => ep.politician_count))
              : 0,
        };

        return NextResponse.json({
          success: true,
          data: statistics,
        });
      }

      case "activity-monthly": {
        let query = supabase.from("tv_show_politicians").select("episode_date");

        query = applyShowFilter(query, showName, year, tv_channel);

        const { data, error } = await query;
        if (error) throw error;

        const monthCount = new Map<string, number>();
        data.forEach((row) => {
          const d = new Date(row.episode_date);
          if (Number.isNaN(d.getTime())) return;
          const m = String(d.getMonth() + 1).padStart(2, "0");
          monthCount.set(m, (monthCount.get(m) || 0) + 1);
        });

        const results: MonthlyPoint[] = Array.from({ length: 12 }, (_, i) => {
          const m = String(i + 1).padStart(2, "0");
          return { month: m, count: monthCount.get(m) || 0 };
        });

        return NextResponse.json({
          success: true,
          data: results,
        });
      }

      case "party-monthly": {
        const partiesParam = searchParams.get("parties");
        const partiesFilter = partiesParam
          ? partiesParam
              .split(",")
              .map((p) => p.trim())
              .filter(Boolean)
          : [];

        let query = supabase
          .from("tv_show_politicians")
          .select("party_name, episode_date")
          .not("party_name", "is", null)
          .neq("party_name", "");

        query = applyShowFilter(query, showName, year, tv_channel);

        if (partiesFilter.length > 0) {
          query = query.in("party_name", partiesFilter);
        }

        const { data, error } = await query;
        if (error) throw error;

        const seriesNames = new Set<string>();
        data.forEach((row) => {
          if (row.party_name) seriesNames.add(row.party_name);
        });

        const months = Array.from({ length: 12 }, (_, i) =>
          String(i + 1).padStart(2, "0"),
        );

        const rows = months.map((m) => {
          const base: Record<string, any> = { month: m };
          seriesNames.forEach((name) => {
            base[name] = 0;
          });
          return base;
        });

        const monthIndex = new Map(months.map((m, idx) => [m, idx]));

        data.forEach((row) => {
          const party = row.party_name;
          if (!party) return;
          const d = new Date(row.episode_date);
          if (Number.isNaN(d.getTime())) return;
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const idx = monthIndex.get(m);
          if (idx === undefined) return;
          rows[idx][party] = (rows[idx][party] || 0) + 1;
        });

        return NextResponse.json({
          success: true,
          metadata: { parties: Array.from(seriesNames) },
          data: rows,
        });
      }

      case "shows": {
        let query = supabase
          .from("tv_show_politicians")
          .select("show_name, episode_date");

        query = applyShowFilter(query, showName, year, tv_channel);

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        const showMap = new Map<
          string,
          {
            appearances: number;
            episodes: Set<string>;
            first_episode: string;
            latest_episode: string;
          }
        >();

        data.forEach((row) => {
          const show = row.show_name;
          if (!showMap.has(show)) {
            showMap.set(show, {
              appearances: 0,
              episodes: new Set(),
              first_episode: row.episode_date,
              latest_episode: row.episode_date,
            });
          }

          const stats = showMap.get(show)!;
          stats.appearances++;
          stats.episodes.add(row.episode_date);

          if (row.episode_date < stats.first_episode) {
            stats.first_episode = row.episode_date;
          }
          if (row.episode_date > stats.latest_episode) {
            stats.latest_episode = row.episode_date;
          }
        });

        const results = Array.from(showMap.entries()).map(
          ([show_name, stats]) => ({
            show_name,
            appearances: stats.appearances,
            episodes: stats.episodes.size,
            first_episode: stats.first_episode,
            latest_episode: stats.latest_episode,
          }),
        );

        return NextResponse.json({
          success: true,
          data: results,
        });
      }

      case "politician-party-combos": {
        let query = supabase
          .from("tv_show_politicians")
          .select("politician_name, party_name, episode_date")
          .not("politician_name", "is", null)
          .neq("politician_name", "")
          .not("party_name", "is", null)
          .neq("party_name", "");

        query = applyShowFilter(query, showName, year, tv_channel);

        const { data, error } = await query;
        if (error) throw error;

        const comboMap = new Map<string, ComboStat>();
        data.forEach((row: any) => {
          const key = `${row.politician_name}||${row.party_name}`;
          const existing = comboMap.get(key);
          if (existing) {
            existing.count += 1;
          } else {
            comboMap.set(key, {
              politician_name: row.politician_name,
              party_name: row.party_name,
              count: 1,
            });
          }
        });

        const results = Array.from(comboMap.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, limit > 0 ? limit : 10);

        return NextResponse.json({
          success: true,
          data: results,
        });
      }

      case "politician-rankings": {
        let query = supabase
          .from("tv_show_politicians")
          .select("politician_name, party_name, show_name, episode_date");

        query = applyShowFilter(query, showName, year, tv_channel);

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        const politicianMap = new Map<
          string,
          {
            party_name: string | null;
            total_appearances: number;
            shows: Set<string>;
            latest_appearance: string;
            first_appearance: string;
          }
        >();

        data.forEach((row: any) => {
          const politician = row.politician_name;
          if (!politicianMap.has(politician)) {
            politicianMap.set(politician, {
              party_name: row.party_name,
              total_appearances: 0,
              shows: new Set(),
              latest_appearance: row.episode_date,
              first_appearance: row.episode_date,
            });
          }

          const stats = politicianMap.get(politician)!;
          stats.total_appearances++;
          stats.shows.add(row.show_name);

          if (row.episode_date > stats.latest_appearance) {
            stats.latest_appearance = row.episode_date;
          }
          if (row.episode_date < stats.first_appearance) {
            stats.first_appearance = row.episode_date;
          }
        });

        const results = Array.from(politicianMap.entries())
          .map(([politician_name, stats]) => ({
            politician_name,
            party_name: stats.party_name || "Unbekannt",
            total_appearances: stats.total_appearances,
            shows_appeared_on: stats.shows.size,
            show_names: Array.from(stats.shows),
            latest_appearance: stats.latest_appearance,
            first_appearance: stats.first_appearance,
          }))
          .sort((a, b) => b.total_appearances - a.total_appearances)
          .slice(0, limit);

        return NextResponse.json({
          success: true,
          data: results,
          metadata: {
            total_politicians: politicianMap.size,
            show_filter: showName || "Alle Shows",
            limit: limit,
          },
        });
      }

      case "topic-party-matrix": {
        // 1. Hole alle relevanten Topics (political_areas)
        // Link-Tabelle
        let topicQuery = supabase
          .from("tv_show_episode_political_areas")
          .select("show_name, episode_date, political_area_id");

        topicQuery = applyShowFilter(topicQuery, showName, year, tv_channel);
        const { data: topicData, error: topicError } =
          await topicQuery.limit(10000);

        if (topicError) throw topicError;

        // Hole Topic-Labels aus der DB
        const { data: topicDefinitions, error: defError } = await supabase
          .from("political_area")
          .select("id, label");

        if (defError) throw defError;

        // 2. Hole alle relevanten Politiker/Parteien
        let partyQuery = supabase
          .from("tv_show_politicians")
          .select("show_name, episode_date, party_name")
          .not("party_name", "is", null)
          .neq("party_name", "");

        partyQuery = applyShowFilter(partyQuery, showName, year, tv_channel);
        const { data: partyData, error: partyError } =
          await partyQuery.limit(10000);

        if (partyError) throw partyError;

        // 3. Verknüpfe Daten über Episode (Map für schnellen Zugriff)
        // Map: "Show|Date" -> Set<TopicIDs>
        const episodeTopics = new Map<string, number[]>();

        topicData.forEach((row) => {
          const key = `${row.show_name}|${row.episode_date}`;
          if (!episodeTopics.has(key)) {
            episodeTopics.set(key, []);
          }
          episodeTopics.get(key)!.push(row.political_area_id);
        });

        // 4. Aggregiere Matrix (Topic x Partei)
        const matrix = new Map<string, number>(); // Key: "Party|TopicID" -> Count

        partyData.forEach((row) => {
          const key = `${row.show_name}|${row.episode_date}`;
          const topics = episodeTopics.get(key);

          if (topics && topics.length > 0) {
            // Für JEDES Thema dieser Episode wird dem Politiker/der Partei ein "Punkt" gegeben
            // Das bedeutet: War die SPD in einer Sendung über "Wirtschaft" und "Klima",
            // bekommt sie +1 bei Wirtschaft und +1 bei Klima.
            topics.forEach((topicId) => {
              const matrixKey = `${row.party_name}|${topicId}`;
              matrix.set(matrixKey, (matrix.get(matrixKey) || 0) + 1);
            });
          }
        });

        // 5. Formatiere Ergebnis
        // Nutze dynamische Labels aus der DB
        const TOPIC_MAPPING: Record<number, string> = {};
        topicDefinitions.forEach((def) => {
          if (def.label) TOPIC_MAPPING[def.id] = def.label;
        });

        const resultMatrix = Array.from(matrix.entries()).map(
          ([key, count]) => {
            const [party, topicIdStr] = key.split("|");
            return {
              party,
              topicId: parseInt(topicIdStr),
              count,
            };
          },
        );

        const topicsList = topicDefinitions
          .map((def) => ({
            id: def.id,
            label: def.label || "Unbekannt",
          }))
          .sort((a, b) => a.id - b.id);

        const partiesList = Array.from(
          new Set(resultMatrix.map((r) => r.party)),
        ).sort();

        return NextResponse.json({
          success: true,
          data: {
            topics: topicsList,
            parties: partiesList,
            matrix: resultMatrix,
          },
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: "Unknown type parameter" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
