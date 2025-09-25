import Database from "better-sqlite3";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

// Database connection
const dbPath = path.resolve(process.cwd(), "../database/database.sqlite");
const db = new Database(dbPath);

// Types
interface PartyStats {
  party_id: number;
  count: number;
  party_name?: string;
}

interface EpisodeData {
  episode_date: string;
  politician_count: number;
}

interface PoliticianAppearance {
  show_name: string;
  episode_date: string;
  politician_id: number;
  party_id: number | null;
  politician_name?: string; // NEU: Direkt aus Datenbank
  party_name?: string; // NEU: Direkt aus Datenbank
}

// Neue Interfaces für API-Responses und Details
interface PoliticianDetails {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  occupation: string;
  year_of_birth: number | null;
  education: string;
  party_id: number | null;
  party_name: string;
}

interface AbgeordnetenwatchPartyResponse {
  data?: {
    label?: string;
    short_name?: string;
  };
}

interface AbgeordnetenwatchPoliticianResponse {
  data?: {
    id: number;
    first_name: string;
    last_name: string;
    occupation?: string;
    year_of_birth?: number;
    education?: string;
    party?: {
      id: number;
      label: string;
    };
  };
}

// Cache für Parteinamen um API-Calls zu reduzieren
const partyNameCache = new Map<number, string>();

// Hole Parteinamen von der abgeordnetenwatch.de API
async function fetchPartyName(partyId: number): Promise<string> {
  // Prüfe Cache zuerst
  if (partyNameCache.has(partyId)) {
    return partyNameCache.get(partyId)!;
  }

  try {
    const response = await fetch(
      `https://www.abgeordnetenwatch.de/api/v2/parties/${partyId}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data: AbgeordnetenwatchPartyResponse = await response.json();
    const partyName =
      data.data?.label || data.data?.short_name || `Partei ${partyId}`;

    // In Cache speichern
    partyNameCache.set(partyId, partyName);
    return partyName;
  } catch (error) {
    console.error(`Fehler beim Holen der Partei ${partyId}:`, error);
    // Fallback
    const fallbackName = `Partei ${partyId}`;
    partyNameCache.set(partyId, fallbackName);
    return fallbackName;
  }
}

// Hole mehrere Parteinamen parallel
async function fetchMultiplePartyNames(
  partyIds: number[]
): Promise<Record<number, string>> {
  const results: Record<number, string> = {};

  // Filtere bereits gecachte IDs
  const uncachedIds = partyIds.filter((id) => !partyNameCache.has(id));

  // Hole bereits gecachte Namen
  partyIds.forEach((id) => {
    if (partyNameCache.has(id)) {
      results[id] = partyNameCache.get(id)!;
    }
  });

  // Hole fehlende Namen parallel
  if (uncachedIds.length > 0) {
    const promises = uncachedIds.map((id) => fetchPartyName(id));
    const names = await Promise.all(promises);

    uncachedIds.forEach((id, index) => {
      results[id] = names[index];
    });
  }

  return results;
}

// Cache für Politiker-Details
const politicianDetailsCache = new Map<number, PoliticianDetails>();

// Spezielle Ausnahmen für bestimmte Politiker
const POLITICIAN_OVERRIDES: Record<number, PoliticianDetails> = {
  28910: {
    // Manfred Weber - Korrigierte CSU-Zuordnung
    id: 28910,
    first_name: "Manfred",
    last_name: "Weber",
    full_name: "Manfred Weber",
    occupation: "MdEP",
    year_of_birth: 1972,
    education: "Dipl. Ingenieur",
    party_id: 3,
    party_name: "CSU",
  },
};

// Hole Politiker-Details von der API
async function fetchPoliticianDetails(
  politicianId: number
): Promise<PoliticianDetails> {
  // Prüfe zuerst Overrides
  if (POLITICIAN_OVERRIDES[politicianId]) {
    const override = POLITICIAN_OVERRIDES[politicianId];
    politicianDetailsCache.set(politicianId, override);
    return override;
  }

  if (politicianDetailsCache.has(politicianId)) {
    return politicianDetailsCache.get(politicianId)!;
  }

  try {
    const response = await fetch(
      `https://www.abgeordnetenwatch.de/api/v2/politicians/${politicianId}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data: AbgeordnetenwatchPoliticianResponse = await response.json();
    const politician = data.data;

    if (politician) {
      const details: PoliticianDetails = {
        id: politician.id,
        first_name: politician.first_name,
        last_name: politician.last_name,
        full_name: `${politician.first_name} ${politician.last_name}`,
        occupation: politician.occupation || "",
        year_of_birth: politician.year_of_birth || null,
        education: politician.education || "Keine Angabe",
        party_id: politician.party?.id || null,
        party_name: politician.party?.label || "Unbekannt",
      };

      politicianDetailsCache.set(politicianId, details);
      return details;
    }
  } catch (error) {
    console.error(`Fehler beim Holen von Politiker ${politicianId}:`, error);
  }

  // Fallback
  const fallback: PoliticianDetails = {
    id: politicianId,
    first_name: "Unbekannt",
    last_name: "",
    full_name: `Politiker ${politicianId}`,
    occupation: "Unbekannt",
    year_of_birth: null,
    education: "Keine Angabe",
    party_id: null,
    party_name: "Unbekannt",
  };

  politicianDetailsCache.set(politicianId, fallback);
  return fallback;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "party-stats";

    switch (type) {
      case "party-stats": {
        // Statistiken pro Partei
        const showName = searchParams.get("show");
        let whereClause = "WHERE party_id IS NOT NULL";
        const params: string[] = [];

        if (
          showName &&
          (showName === "Markus Lanz" || showName === "Maybrit Illner")
        ) {
          whereClause += " AND show_name = ?";
          params.push(showName);
        }

        const stmt = db.prepare(`
          SELECT party_id, COUNT(*) as count
          FROM tv_show_politicians 
          ${whereClause}
          GROUP BY party_id
          ORDER BY count DESC
        `);

        const results = stmt.all(...params) as PartyStats[];

        // Hole Parteinamen von der API
        const partyIds = results.map((r) => r.party_id);
        const partyNames = await fetchMultiplePartyNames(partyIds);

        // Füge Parteinamen hinzu
        const enrichedResults = results.map((result) => ({
          ...result,
          party_name:
            partyNames[result.party_id] || `Partei ${result.party_id}`,
        }));

        return NextResponse.json({
          success: true,
          data: enrichedResults,
          total: enrichedResults.reduce((sum, item) => sum + item.count, 0),
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
          SELECT episode_date, politician_id, party_id
          FROM tv_show_politicians 
          WHERE show_name = ?
          ORDER BY episode_date DESC
          LIMIT 200
        `);

        const results = stmt.all(showName) as PoliticianAppearance[];

        // Gruppiere nach episode_date
        const episodeMap = new Map<string, number[]>();
        results.forEach((result) => {
          if (!episodeMap.has(result.episode_date)) {
            episodeMap.set(result.episode_date, []);
          }
          episodeMap.get(result.episode_date)!.push(result.politician_id);
        });

        // Hole Politiker-Details für alle einzigartigen IDs
        const allPoliticianIds = [
          ...new Set(results.map((r) => r.politician_id)),
        ];
        const politicianPromises = allPoliticianIds.map((id) =>
          fetchPoliticianDetails(id)
        );
        const politicianDetails = await Promise.all(politicianPromises);

        // Erstelle Map für schnelleren Zugriff
        const politicianMap = new Map<number, PoliticianDetails>();
        politicianDetails.forEach((details) => {
          politicianMap.set(details.id, details);
        });

        // Erstelle finale Episoden-Liste
        const episodesWithPoliticians = Array.from(episodeMap.entries()).map(
          ([date, politicianIds]) => ({
            episode_date: date,
            politician_count: politicianIds.length,
            politicians: politicianIds.map((id) => {
              const details = politicianMap.get(id);
              return {
                id,
                name: details ? details.full_name : `Politiker ${id}`,
                party_name: details ? details.party_name : "Unbekannt",
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
          SELECT show_name, episode_date, politician_id, party_id
          FROM tv_show_politicians 
          ORDER BY episode_date DESC, id DESC
          LIMIT 20
        `);

        const results = stmt.all() as PoliticianAppearance[];

        // Hole Parteinamen für alle party_ids
        const partyIds = [
          ...new Set(results.filter((r) => r.party_id).map((r) => r.party_id!)),
        ];
        const partyNames = await fetchMultiplePartyNames(partyIds);

        const enrichedResults = results.map((result) => ({
          ...result,
          party_name: result.party_id
            ? partyNames[result.party_id] || `Partei ${result.party_id}`
            : "Unbekannt",
        }));

        return NextResponse.json({
          success: true,
          data: enrichedResults,
        });
      }

      case "summary": {
        // Gesamt-Statistiken
        const showName = searchParams.get("show");
        let whereClause = "";
        let whereClauseWithParty = "WHERE party_id IS NOT NULL";
        const params: string[] = [];

        if (
          showName &&
          (showName === "Markus Lanz" || showName === "Maybrit Illner")
        ) {
          whereClause = "WHERE show_name = ?";
          whereClauseWithParty = "WHERE party_id IS NOT NULL AND show_name = ?";
          params.push(showName);
        }

        const totalStmt = db.prepare(
          `SELECT COUNT(*) as total FROM tv_show_politicians ${whereClause}`
        );
        const episodesStmt = db.prepare(
          `SELECT COUNT(DISTINCT episode_date) as episodes FROM tv_show_politicians ${whereClause}`
        );
        const politiciansStmt = db.prepare(
          `SELECT COUNT(DISTINCT politician_id) as politicians FROM tv_show_politicians ${whereClause}`
        );
        const partiesStmt = db.prepare(
          `SELECT COUNT(DISTINCT party_id) as parties FROM tv_show_politicians ${whereClauseWithParty}`
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
          (showName === "Markus Lanz" || showName === "Maybrit Illner")
        ) {
          whereClause = "WHERE show_name = ?";
          params.push(showName, limit, offset);
        } else {
          params.push(limit, offset);
        }

        // NEUE QUERY: Direkte Namen aus der Datenbank verwenden
        const stmt = db.prepare(`
          SELECT show_name, episode_date, politician_id, party_id, politician_name, party_name
          FROM tv_show_politicians 
          ${whereClause}
          ORDER BY episode_date DESC, id DESC
          LIMIT ? OFFSET ?
        `);

        const results = stmt.all(...params) as (PoliticianAppearance & {
          politician_name: string;
          party_name: string;
        })[];

        // KEINE EXTERNEN API-CALLS MEHR - Verwende direkt die Datenbank-Daten
        const enrichedResults = results.map((appearance) => {
          // Fallback für Details (nur für UI-Zwecke, ohne externe API-Calls)
          const nameParts = appearance.politician_name?.split(" ") || [
            "Unbekannt",
          ];
          const firstName = nameParts[0] || "Unbekannt";
          const lastName = nameParts.slice(1).join(" ") || "";

          return {
            ...appearance,
            politician_name:
              appearance.politician_name ||
              `Politiker ${appearance.politician_id}`,
            party_name: appearance.party_name || "Unbekannt",
            politician_details: {
              first_name: firstName,
              last_name: lastName,
              occupation: "Politiker", // Allgemeiner Fallback
              year_of_birth: null,
              education: "Keine Angabe",
            },
          };
        });

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
