import Database from "better-sqlite3";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

// Database connection
const dbPath = path.resolve(process.cwd(), "../database/database.sqlite");
const db = new Database(dbPath);

// Abgeordnetenwatch API integration
interface AbgeordnetenwatchPolitician {
  id: number;
  entity_type: "politician";
  label: string;
  api_url: string;
  abgeordnetenwatch_url: string;
  first_name: string;
  last_name: string;
  birth_name: string | null;
  sex: "m" | "w" | "d" | string;
  year_of_birth: number | null;
  party: {
    id: number;
    entity_type: "party";
    label: string;
    api_url: string;
  } | null;
  party_past: {
    id: number;
    entity_type: "party";
    label: string;
    api_url: string;
  } | null;
  education: string | null;
  residence: string | null;
  occupation: string | null;
  statistic_questions: number;
  statistic_questions_answered: number;
  ext_id_bundestagsverwaltung: string | null;
  qid_wikidata: string | null;
  field_title: string | null;
}

// Cache für API-Calls (in memory cache - könnte später in Redis o.ä. ausgelagert werden)
const politicianCache = new Map<string, AbgeordnetenwatchPolitician | null>();

async function fetchPoliticianDetails(
  first_name: string,
  last_name: string
): Promise<AbgeordnetenwatchPolitician | null> {
  const cacheKey = `${first_name}_${last_name}`;

  // Prüfe Cache
  if (politicianCache.has(cacheKey)) {
    return politicianCache.get(cacheKey) || null;
  }

  try {
    const url = `https://www.abgeordnetenwatch.de/api/v2/politicians?first_name=${encodeURIComponent(
      first_name
    )}&last_name=${encodeURIComponent(last_name)}`;

    const response = await fetch(url, {
      next: { revalidate: 3600 }, // Cache für 1 Stunde
    });

    if (!response.ok) {
      politicianCache.set(cacheKey, null);
      return null;
    }

    const result = await response.json();
    const politicians: AbgeordnetenwatchPolitician[] = result?.data || [];

    if (politicians.length === 0) {
      politicianCache.set(cacheKey, null);
      return null;
    }

    // Nehme ersten/besten Treffer
    const politician = politicians[0];
    politicianCache.set(cacheKey, politician);
    return politician;
  } catch (error) {
    console.error(
      `Error fetching politician details for ${first_name} ${last_name}:`,
      error
    );
    politicianCache.set(cacheKey, null);
    return null;
  }
}

// Types
interface PartyStats {
  party_name: string;
  count: number;
}

interface EpisodeData {
  episode_date: string;
  politician_count: number;
}

interface PoliticianAppearance {
  show_name: string;
  episode_date: string;
  politician_name: string;
  party_name: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "party-stats";

    switch (type) {
      case "party-stats": {
        // Statistiken pro Partei
        const showName = searchParams.get("show");
        let whereClause = "WHERE party_name IS NOT NULL AND party_name != ''";
        const params: string[] = [];

        if (
          showName &&
          (showName === "Markus Lanz" ||
            showName === "Maybrit Illner" ||
            showName === "Caren Miosga")
        ) {
          whereClause += " AND show_name = ?";
          params.push(showName);
        }

        const stmt = db.prepare(`
          SELECT party_name, COUNT(*) as count
          FROM tv_show_politicians 
          ${whereClause}
          GROUP BY party_name
          ORDER BY count DESC
        `);

        const results = stmt.all(...params) as PartyStats[];

        return NextResponse.json({
          success: true,
          data: results,
          total: results.reduce((sum, item) => sum + item.count, 0),
        });
      }

      case "episodes": {
        // Episoden mit Politiker-Anzahl
        const showName = searchParams.get("show") || "Markus Lanz";

        const stmt = db.prepare(`
          SELECT episode_date, COUNT(*) as politician_count
          FROM tv_show_politicians 
          WHERE show_name = ?
          GROUP BY episode_date
          ORDER BY episode_date DESC
          LIMIT 50
        `);

        const results = stmt.all(showName) as EpisodeData[];

        return NextResponse.json({
          success: true,
          data: results,
        });
      }

      case "episodes-with-politicians": {
        // Episoden mit Politiker-Namen
        const showName = searchParams.get("show") || "Markus Lanz";

        const stmt = db.prepare(`
          SELECT episode_date, politician_name, party_name
          FROM tv_show_politicians 
          WHERE show_name = ?
          ORDER BY episode_date DESC
          LIMIT 200
        `);

        const results = stmt.all(showName) as PoliticianAppearance[];

        // Gruppiere nach episode_date
        const episodeMap = new Map<string, string[]>();
        results.forEach((result) => {
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
            politicians: politicianNames.map((name) => {
              const result = results.find(
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
          data: episodesWithPoliticians.slice(0, 50),
        });
      }

      case "recent": {
        // Letzte Auftritte
        const stmt = db.prepare(`
          SELECT show_name, episode_date, politician_name, party_name
          FROM tv_show_politicians 
          ORDER BY episode_date DESC, id DESC
          LIMIT 20
        `);

        const results = stmt.all() as PoliticianAppearance[];

        return NextResponse.json({
          success: true,
          data: results,
        });
      }

      case "summary": {
        // Gesamt-Statistiken
        const showName = searchParams.get("show");
        let whereClause = "";
        let whereClauseWithParty =
          "WHERE party_name IS NOT NULL AND party_name != ''";
        const params: string[] = [];

        if (
          showName &&
          (showName === "Markus Lanz" ||
            showName === "Maybrit Illner" ||
            showName === "Caren Miosga")
        ) {
          whereClause = "WHERE show_name = ?";
          whereClauseWithParty =
            "WHERE party_name IS NOT NULL AND party_name != '' AND show_name = ?";
          params.push(showName);
        }

        const totalStmt = db.prepare(
          `SELECT COUNT(*) as total FROM tv_show_politicians ${whereClause}`
        );
        const episodesStmt = db.prepare(
          `SELECT COUNT(DISTINCT episode_date) as episodes FROM tv_show_politicians ${whereClause}`
        );
        const politiciansStmt = db.prepare(
          `SELECT COUNT(DISTINCT politician_name) as politicians FROM tv_show_politicians ${whereClause}`
        );
        const partiesStmt = db.prepare(
          `SELECT COUNT(DISTINCT party_name) as parties FROM tv_show_politicians ${whereClauseWithParty}`
        );

        const total =
          params.length > 0
            ? (totalStmt.get(params[0]) as { total: number }).total
            : (totalStmt.get() as { total: number }).total;

        const episodes =
          params.length > 0
            ? (episodesStmt.get(params[0]) as { episodes: number }).episodes
            : (episodesStmt.get() as { episodes: number }).episodes;

        const politicians =
          params.length > 0
            ? (politiciansStmt.get(params[0]) as { politicians: number })
                .politicians
            : (politiciansStmt.get() as { politicians: number }).politicians;

        const parties =
          params.length > 0
            ? (partiesStmt.get(params[0]) as { parties: number }).parties
            : (partiesStmt.get() as { parties: number }).parties;

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
        // Detaillierte Auftritte mit Politiker-Infos - JETZT mit direkt gespeicherten Namen
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = parseInt(searchParams.get("offset") || "0");
        const showName = searchParams.get("show");

        let whereClause = "";
        const params: (string | number)[] = [];

        if (
          showName &&
          (showName === "Markus Lanz" ||
            showName === "Maybrit Illner" ||
            showName === "Caren Miosga")
        ) {
          whereClause = "WHERE show_name = ?";
          params.push(showName, limit, offset);
        } else {
          params.push(limit, offset);
        }

        // NEUE QUERY: Direkte Namen aus der Datenbank verwenden
        const stmt = db.prepare(`
          SELECT show_name, episode_date, politician_name, party_name
          FROM tv_show_politicians 
          ${whereClause}
          ORDER BY episode_date DESC, id DESC
          LIMIT ? OFFSET ?
        `);

        const results = stmt.all(...params) as PoliticianAppearance[];

        // Anreicherung mit Abgeordnetenwatch-Daten
        const enrichedResults = await Promise.all(
          results.map(async (appearance) => {
            const nameParts = appearance.politician_name?.split(" ") || [
              "Unbekannt",
            ];
            const firstName = nameParts[0] || "Unbekannt";
            const lastName = nameParts.slice(1).join(" ") || "";

            // Versuche Details von Abgeordnetenwatch zu holen
            let politicianDetails;
            try {
              const awPolitician = await fetchPoliticianDetails(
                firstName,
                lastName
              );
              if (awPolitician) {
                politicianDetails = {
                  first_name: awPolitician.first_name,
                  last_name: awPolitician.last_name,
                  occupation: awPolitician.occupation || "Politiker",
                  year_of_birth: awPolitician.year_of_birth,
                  education: awPolitician.education || "Keine Angabe",
                  sex: awPolitician.sex,
                  abgeordnetenwatch_url: awPolitician.abgeordnetenwatch_url,
                };
              } else {
                // Fallback
                politicianDetails = {
                  first_name: firstName,
                  last_name: lastName,
                  occupation: "Politiker",
                  year_of_birth: null,
                  education: "Keine Angabe",
                  sex: null,
                  abgeordnetenwatch_url: null,
                };
              }
            } catch {
              // Bei Fehlern Fallback verwenden
              politicianDetails = {
                first_name: firstName,
                last_name: lastName,
                occupation: "Politiker",
                year_of_birth: null,
                education: "Keine Angabe",
                sex: null,
                abgeordnetenwatch_url: null,
              };
            }

            return {
              ...appearance,
              politician_name: appearance.politician_name || "Unbekannt",
              party_name: appearance.party_name || "Unbekannt",
              politician_details: politicianDetails,
            };
          })
        );

        const totalCount = showName
          ? db
              .prepare(
                "SELECT COUNT(*) as count FROM tv_show_politicians WHERE show_name = ?"
              )
              .get(showName)
          : db
              .prepare("SELECT COUNT(*) as count FROM tv_show_politicians")
              .get();

        return NextResponse.json({
          success: true,
          data: enrichedResults,
          pagination: {
            limit,
            offset,
            total: totalCount as { count: number },
          },
        });
      }

      case "episode-statistics": {
        // Episoden-Statistiken für eine bestimmte Show
        const showName = searchParams.get("show") || "Markus Lanz";

        // Hole alle Episoden mit Politiker-Anzahl
        const episodeStatsStmt = db.prepare(`
          SELECT episode_date, COUNT(*) as politician_count
          FROM tv_show_politicians 
          WHERE show_name = ?
          GROUP BY episode_date
          ORDER BY episode_date DESC
        `);

        const episodeStats = episodeStatsStmt.all(showName) as {
          episode_date: string;
          politician_count: number;
        }[];

        // Hole auch die Gesamtanzahl der Auftritte
        const totalAppearancesStmt = db.prepare(`
          SELECT COUNT(*) as total_appearances
          FROM tv_show_politicians 
          WHERE show_name = ?
        `);
        const totalAppearances = totalAppearancesStmt.get(showName) as {
          total_appearances: number;
        };

        const statistics = {
          total_episodes: episodeStats.length,
          total_appearances: totalAppearances.total_appearances,
          episodes_with_politicians: episodeStats.length, // Alle haben Politiker (sonst wären sie nicht in der DB)
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
        const stmt = db.prepare(`
          SELECT show_name, COUNT(*) as appearances, 
                 COUNT(DISTINCT episode_date) as episodes,
                 MIN(episode_date) as first_episode,
                 MAX(episode_date) as latest_episode
          FROM tv_show_politicians 
          GROUP BY show_name
          ORDER BY show_name
        `);

        const results = stmt.all();

        return NextResponse.json({
          success: true,
          data: results,
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
