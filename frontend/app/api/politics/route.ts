import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { applyShowFilter, getSummaryStats, getDetailedAppearances } from "@/lib/politics-data";

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "party-stats";
    const showName = searchParams.get("show");
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
        let query = supabase
          .from("tv_show_politicians")
          .select("episode_date")
          .eq("show_name", showName)
          .order("episode_date", { ascending: false })
          .limit(50);

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
          .select("episode_date, politician_name, party_name")
          .eq("show_name", showName)
          .order("episode_date", { ascending: false });

        if (limit > 0) {
          politiciansQuery = politiciansQuery.limit(limit);
        }

        if (year && year !== "all") {
          const startDate = `${year}-01-01`;
          const endDate = `${year}-12-31`;
          politiciansQuery = politiciansQuery
            .gte("episode_date", startDate)
            .lte("episode_date", endDate);
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
        const { data, error } = await supabase
          .from("tv_show_politicians")
          .select("show_name, episode_date, politician_name, party_name")
          .order("episode_date", { ascending: false })
          .order("id", { ascending: false })
          .limit(20);

        if (error) {
          throw error;
        }

        return NextResponse.json({
          success: true,
          data: data,
        });
      }

      case "summary": {
        const stats = await getSummaryStats({ show: showName, year, tv_channel });
        return NextResponse.json({
          success: true,
          data: stats,
        });
      }

      case "detailed-appearances": {
        const search = searchParams.get("search");
        const { data, total } = await getDetailedAppearances({
          show: showName,
          year,
          tv_channel,
          search,
          limit,
          offset
        });

        return NextResponse.json({
          success: true,
          data: data,
          pagination: {
            limit,
            offset,
            total: { count: total },
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

      case "topic-party-dominance": {
        // 1. Calculate baseline party representation (total appearances per party)
        let baselineQuery = supabase
          .from("tv_show_politicians")
          .select("party_name")
          .not("party_name", "is", null)
          .neq("party_name", "");

        baselineQuery = applyShowFilter(
          baselineQuery,
          showName,
          year,
          tv_channel,
        );
        const { data: baselineData, error: baselineError } =
          await baselineQuery;

        if (baselineError) throw baselineError;

        // Count total appearances per party
        const baselineCount = new Map<string, number>();
        baselineData.forEach((row) => {
          const party = row.party_name;
          baselineCount.set(party, (baselineCount.get(party) || 0) + 1);
        });

        const totalAppearances = baselineData.length;

        // 2. Get all topics
        const { data: topicDefinitions, error: topicError } = await supabase
          .from("political_area")
          .select("id, label");

        if (topicError) throw topicError;

        // 3. Get topic-episode mappings
        let topicQuery = supabase
          .from("tv_show_episode_political_areas")
          .select("show_name, episode_date, political_area_id");

        topicQuery = applyShowFilter(topicQuery, showName, year, tv_channel);
        const { data: topicData, error: topicDataError } =
          await topicQuery.limit(10000);

        if (topicDataError) throw topicDataError;

        // 4. Get party-episode mappings
        let partyQuery = supabase
          .from("tv_show_politicians")
          .select("show_name, episode_date, party_name")
          .not("party_name", "is", null)
          .neq("party_name", "");

        partyQuery = applyShowFilter(partyQuery, showName, year, tv_channel);
        const { data: partyData, error: partyDataError } =
          await partyQuery.limit(10000);

        if (partyDataError) throw partyDataError;

        // 5. Create episode-to-topics mapping
        const episodeTopics = new Map<string, number[]>();
        topicData.forEach((row) => {
          const key = `${row.show_name}|${row.episode_date}`;
          if (!episodeTopics.has(key)) {
            episodeTopics.set(key, []);
          }
          episodeTopics.get(key)!.push(row.political_area_id);
        });

        // 6. Calculate party appearances per topic
        const topicPartyCount = new Map<string, number>(); // Key: "topicId|party"

        partyData.forEach((row) => {
          const key = `${row.show_name}|${row.episode_date}`;
          const topics = episodeTopics.get(key);

          if (topics && topics.length > 0) {
            topics.forEach((topicId) => {
              const countKey = `${topicId}|${row.party_name}`;
              topicPartyCount.set(
                countKey,
                (topicPartyCount.get(countKey) || 0) + 1,
              );
            });
          }
        });

        // 7. Calculate dominance scores
        const topicsWithDominance = topicDefinitions
          .map((topic) => {
            const parties = Array.from(baselineCount.entries())
              .map(([party_name, baseline]) => {
                const topicCount =
                  topicPartyCount.get(`${topic.id}|${party_name}`) || 0;
                const baselinePercentage = (baseline / totalAppearances) * 100;
                const topicPercentage =
                  topicCount > 0
                    ? (topicCount /
                        Array.from(topicPartyCount.entries())
                          .filter(([key]) => key.startsWith(`${topic.id}|`))
                          .reduce((sum, [, count]) => sum + count, 0)) *
                      100
                    : 0;

                // Dominance score: how much more/less represented compared to baseline
                const dominance_score =
                  baselinePercentage > 0
                    ? (topicPercentage / baselinePercentage) * 100
                    : 0;

                return {
                  party_name,
                  count: topicCount,
                  baseline_count: baseline,
                  baseline_percentage: parseFloat(
                    baselinePercentage.toFixed(1),
                  ),
                  topic_percentage: parseFloat(topicPercentage.toFixed(1)),
                  dominance_score: parseFloat(dominance_score.toFixed(1)),
                  is_overrepresented: dominance_score > 120,
                  is_underrepresented: dominance_score < 80,
                };
              })
              .filter((p) => p.count > 0) // Only include parties that appear in this topic
              .sort((a, b) => b.count - a.count); // Sort by count (most to least)

            return {
              id: topic.id,
              label: topic.label || "Unbekannt",
              parties,
            };
          })
          .filter((topic) => topic.parties.length > 0); // Only include topics with data

        return NextResponse.json({
          success: true,
          data: {
            topics: topicsWithDominance,
            metadata: {
              total_appearances: totalAppearances,
              total_parties: baselineCount.size,
              show_filter: showName || "Alle Shows",
              year_filter: year || "Alle Jahre",
            },
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
