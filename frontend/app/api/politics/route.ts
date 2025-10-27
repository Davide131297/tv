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

function applyShowFilter(
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  showName: string | null,
  year?: string | null
) {
  // 1️⃣ Erst nach showName filtern
  if (
    showName &&
    [
      "Markus Lanz",
      "Maybrit Illner",
      "Caren Miosga",
      "Maischberger",
      "Hart aber fair",
      "Phoenix Runde",
    ].includes(showName)
  ) {
    query = query.eq("show_name", showName);
  } else {
    query = query.neq("show_name", "Pinar Atalay");
  }

  if (year && year !== "all") {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    query = query.gte("episode_date", startDate).lte("episode_date", endDate);
  }

  return query;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "party-stats";

    switch (type) {
      case "party-stats": {
        // Statistiken pro Partei
        const showName = searchParams.get("show");

        let query = supabase
          .from("tv_show_politicians")
          .select("party_name")
          .not("party_name", "is", null)
          .neq("party_name", "");

        query = applyShowFilter(query, showName);

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        // Gruppiere und zähle die Parteien
        const partyCount = data.reduce((acc: Record<string, number>, row) => {
          const party = row.party_name as string;
          acc[party] = (acc[party] || 0) + 1;
          return acc;
        }, {});

        const results: PartyStats[] = Object.entries(partyCount)
          .map(([party_name, count]) => ({ party_name, count }))
          .sort((a, b) => b.count - a.count);

        return NextResponse.json({
          success: true,
          data: results,
          total: results.reduce((sum, item) => sum + item.count, 0),
        });
      }

      case "episodes": {
        // Episoden mit Politiker-Anzahl
        const showName = searchParams.get("show") || "Markus Lanz";

        const { data, error } = await supabase
          .from("tv_show_politicians")
          .select("episode_date")
          .eq("show_name", showName)
          .order("episode_date", { ascending: false })
          .limit(50);

        if (error) {
          throw error;
        }

        // Gruppiere nach episode_date und zähle
        const episodeCount = data.reduce((acc: Record<string, number>, row) => {
          const date = row.episode_date;
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {});

        const results: EpisodeData[] = Object.entries(episodeCount)
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
        // Episoden mit Politiker-Namen und Episode-URLs
        const showName = searchParams.get("show") || "Markus Lanz";
        const limit = parseInt(searchParams.get("limit") || "0"); // 0 = alle

        // Erste Abfrage: Hole alle Politiker-Daten
        let politiciansQuery = supabase
          .from("tv_show_politicians")
          .select("episode_date, politician_name, party_name")
          .eq("show_name", showName)
          .order("episode_date", { ascending: false });

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
                (r) => r.politician_name === name && r.episode_date === date
              );
              return {
                name: name,
                party_name: result?.party_name || "Unbekannt",
              };
            }),
          })
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
        // Gesamt-Statistiken
        const showName = searchParams.get("show");
        const year = searchParams.get("year");

        let query = supabase.from("tv_show_politicians").select("*");

        query = applyShowFilter(query, showName, year);

        const { data: allData, error } = await query;

        if (error) {
          throw error;
        }

        const total = allData?.length || 0;
        const episodes = new Set(
          allData?.map((d: { episode_date: string }) => d.episode_date)
        ).size;
        const politicians = new Set(
          allData?.map((d: { politician_name: string }) => d.politician_name)
        ).size;
        const parties = new Set(
          allData
            ?.filter((d: { party_name: string | null }) => d.party_name)
            .map((d: { party_name: string }) => d.party_name)
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
        // Detaillierte Auftritte mit Politiker-Infos
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = parseInt(searchParams.get("offset") || "0");
        const showName = searchParams.get("show");

        let query = supabase
          .from("tv_show_politicians")
          .select(
            "show_name, episode_date, politician_name, party_name, abgeordnetenwatch_url"
          )
          .order("episode_date", { ascending: false })
          .order("id", { ascending: false })
          .range(offset, offset + limit - 1);

        query = applyShowFilter(query, showName);

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
        countQuery = applyShowFilter(query, showName);
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
        // Episoden-Statistiken für eine bestimmte Show
        const showName = searchParams.get("show") || "Markus Lanz";

        const { data, error } = await supabase
          .from("tv_show_politicians")
          .select("episode_date")
          .eq("show_name", showName);

        if (error) {
          throw error;
        }

        // Gruppiere nach Episode
        const episodeCount = data.reduce((acc: Record<string, number>, row) => {
          const date = row.episode_date;
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {});

        const episodeStats = Object.entries(episodeCount).map(
          ([episode_date, politician_count]) => ({
            episode_date,
            politician_count,
          })
        );

        const statistics = {
          total_episodes: episodeStats.length,
          total_appearances: data.length,
          episodes_with_politicians: episodeStats.length,
          average_politicians_per_episode:
            episodeStats.length > 0
              ? parseFloat(
                  (
                    episodeStats.reduce(
                      (sum, ep) => sum + ep.politician_count,
                      0
                    ) / episodeStats.length
                  ).toFixed(2)
                )
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

      case "shows": {
        // Liste der verfügbaren Shows
        const { data, error } = await supabase
          .from("tv_show_politicians")
          .select("show_name, episode_date");

        if (error) {
          throw error;
        }

        // Gruppiere nach Show
        const showStats = data.reduce(
          (
            acc: Record<
              string,
              {
                show_name: string;
                appearances: number;
                episodes: Set<string>;
                first_episode: string;
                latest_episode: string;
              }
            >,
            row
          ) => {
            const show = row.show_name;
            if (!acc[show]) {
              acc[show] = {
                show_name: show,
                appearances: 0,
                episodes: new Set(),
                first_episode: row.episode_date,
                latest_episode: row.episode_date,
              };
            }

            acc[show].appearances++;
            acc[show].episodes.add(row.episode_date);

            if (row.episode_date < acc[show].first_episode) {
              acc[show].first_episode = row.episode_date;
            }
            if (row.episode_date > acc[show].latest_episode) {
              acc[show].latest_episode = row.episode_date;
            }

            return acc;
          },
          {}
        );

        const results = Object.values(showStats).map((show) => ({
          show_name: show.show_name,
          appearances: show.appearances,
          episodes: show.episodes.size,
          first_episode: show.first_episode,
          latest_episode: show.latest_episode,
        }));

        return NextResponse.json({
          success: true,
          data: results,
        });
      }

      case "politician-rankings": {
        // Politiker-Rankings nach Anzahl Auftritte
        const showName = searchParams.get("show");
        const limit = parseInt(searchParams.get("limit") || "100");

        let query = supabase
          .from("tv_show_politicians")
          .select("politician_name, party_name, show_name, episode_date");

        query = applyShowFilter(query, showName);

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        // Gruppiere nach Politiker und zähle Auftritte
        const politicianStats = data.reduce(
          (
            acc: Record<
              string,
              {
                politician_name: string;
                party_name: string | null;
                total_appearances: number;
                shows: Set<string>;
                latest_appearance: string;
                first_appearance: string;
              }
            >,
            row
          ) => {
            const politician = row.politician_name;
            if (!acc[politician]) {
              acc[politician] = {
                politician_name: politician,
                party_name: row.party_name,
                total_appearances: 0,
                shows: new Set(),
                latest_appearance: row.episode_date,
                first_appearance: row.episode_date,
              };
            }

            acc[politician].total_appearances++;
            acc[politician].shows.add(row.show_name);

            if (row.episode_date > acc[politician].latest_appearance) {
              acc[politician].latest_appearance = row.episode_date;
            }
            if (row.episode_date < acc[politician].first_appearance) {
              acc[politician].first_appearance = row.episode_date;
            }

            return acc;
          },
          {}
        );

        const results = Object.values(politicianStats)
          .map((politician) => ({
            politician_name: politician.politician_name,
            party_name: politician.party_name || "Unbekannt",
            total_appearances: politician.total_appearances,
            shows_appeared_on: politician.shows.size,
            show_names: Array.from(politician.shows),
            latest_appearance: politician.latest_appearance,
            first_appearance: politician.first_appearance,
          }))
          .sort((a, b) => b.total_appearances - a.total_appearances)
          .slice(0, limit);

        return NextResponse.json({
          success: true,
          data: results,
          metadata: {
            total_politicians: Object.keys(politicianStats).length,
            show_filter: showName || "Alle Shows",
            limit: limit,
          },
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: "Unknown type parameter" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
