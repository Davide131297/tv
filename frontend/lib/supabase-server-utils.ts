import { supabase } from "./supabase";
import axios from "axios";
import type { AbgeordnetenwatchPolitician } from "@/types";

type GuestDetails = {
  name: string;
  isPolitician: boolean;
  politicianId: number | null;
  politicianName?: string;
  party?: number;
  partyName?: string;
};

interface InsertTvShowPoliticianData {
  tv_channel:
    | "Das Erste"
    | "ZDF"
    | "RTL"
    | "NTV"
    | "Phoenix"
    | "WELT"
    | "Pro 7";
  show_name: string;
  episode_date: string;
  politician_id: number;
  politician_name: string;
  party_id?: number;
  party_name?: string;
}

interface InsertShowLinkData {
  show_name: string;
  episode_url: string;
  episode_date: string;
}

// Hilfsfunktion zum Validieren der Abgeordnetenwatch-URL
async function validateAbgeordnetenwatchUrl(
  url: string,
  politicianName: string
): Promise<string> {
  try {
    const response = await axios.head(url, {
      timeout: 10000,
      validateStatus: (status) => status < 500,
    });

    // Wenn 404 oder andere Client-Fehler, verwende Google Search
    if (response.status >= 400 && response.status < 500) {
      console.log(
        `⚠️  Abgeordnetenwatch-URL für ${politicianName} nicht gefunden (${response.status}), verwende Google Search`
      );
      return `https://www.google.com/search?q=${encodeURIComponent(
        politicianName
      )}`;
    }

    return url;
  } catch {
    console.log(
      `⚠️  Fehler beim Validieren der URL für ${politicianName}, verwende Google Search`
    );
    return `https://www.google.com/search?q=${encodeURIComponent(
      politicianName
    )}`;
  }
}

// Spezielle Override-Cases für bestimmte Politiker
export const POLITICIAN_OVERRIDES: Record<string, GuestDetails> = {
  "Manfred Weber": {
    name: "Manfred Weber",
    isPolitician: true,
    politicianId: 28910,
    politicianName: "Manfred Weber",
    party: 3, // CSU
    partyName: "CSU",
  },
  "Michael Kretschmer": {
    name: "Michael Kretschmer",
    isPolitician: true,
    politicianId: 79225,
    politicianName: "Michael Kretschmer",
    party: 2, // CDU
    partyName: "CDU",
  },
  "Philipp Türmer": {
    name: "Philipp Türmer",
    isPolitician: true,
    politicianId: 999001, // Custom ID for politician not in Abgeordnetenwatch
    politicianName: "Philipp Türmer",
    party: 1, // SPD
    partyName: "SPD",
  },
  "Jan van": {
    name: "Jan van Aken",
    isPolitician: true,
    politicianId: 78952,
    politicianName: "Jan van Aken",
    party: 8, // Die Linke
    partyName: "Die Linke",
  },
  "Wolfram Weimer": {
    name: "Wolfram Weimer",
    isPolitician: true,
    politicianId: 9998,
    politicianName: "Wolfram Weimer",
    party: 2,
    partyName: "CDU",
  },
};

// Füge einen Politiker zu einer TV-Sendung hinzu (Supabase Version)
export async function insertTvShowPolitician(
  data: InsertTvShowPoliticianData
): Promise<boolean> {
  try {
    const { error } = await supabase.from("tv_show_politicians").upsert(
      {
        tv_channel: data.tv_channel,
        show_name: data.show_name,
        episode_date: data.episode_date,
        politician_id: data.politician_id,
        politician_name: data.politician_name,
        party_id: data.party_id || null,
        party_name: data.party_name || null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "show_name,episode_date,politician_id",
        ignoreDuplicates: false,
      }
    );

    if (error) {
      console.error("Fehler beim Einfügen:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Fehler beim Einfügen:", error);
    return false;
  }
}

// Hilfsfunktion um Override-Prüfung zu zentralisieren
export function checkPoliticianOverride(name: string): GuestDetails | null {
  if (POLITICIAN_OVERRIDES[name]) {
    console.log(
      `✅ Override angewendet für ${name} -> ${POLITICIAN_OVERRIDES[name].partyName}`
    );
    return POLITICIAN_OVERRIDES[name];
  }
  return null;
}

// Füge mehrere Politiker zu einer Sendung hinzu (Supabase Version)
export async function insertMultipleTvShowPoliticians(
  tvChannel: "Das Erste" | "ZDF" | "RTL" | "NTV" | "Phoenix" | "WELT" | "Pro 7",
  showName: string,
  episodeDate: string,
  politicians: Array<{
    politicianId: number;
    politicianName: string;
    partyId?: number;
    partyName?: string;
  }>
): Promise<number> {
  let insertedCount = 0;

  // Batch insert für bessere Performance
  const dataToInsert = await Promise.all(
    politicians.map(async (politician) => {
      const abgeordnetenwatchUrl = politician.politicianName
        ? `https://www.abgeordnetenwatch.de/profile/${politician.politicianName
            .toLowerCase()
            .replace(/ä/g, "ae")
            .replace(/ö/g, "oe")
            .replace(/ü/g, "ue")
            .replace(/ß/g, "ss")
            .replace(/\s+/g, "-")}`
        : null;

      // Validiere die URL und verwende Google Search als Fallback
      const validatedUrl = abgeordnetenwatchUrl
        ? await validateAbgeordnetenwatchUrl(
            abgeordnetenwatchUrl,
            politician.politicianName
          )
        : null;

      return {
        tv_channel: tvChannel,
        show_name: showName,
        episode_date: episodeDate,
        politician_id: politician.politicianId,
        politician_name: politician.politicianName,
        party_id: politician.partyId || null,
        party_name: politician.partyName || null,
        updated_at: new Date().toISOString(),
        abgeordnetenwatch_url: validatedUrl,
      };
    })
  );

  try {
    const { error } = await supabase
      .from("tv_show_politicians")
      .upsert(dataToInsert, {
        onConflict: "show_name,episode_date,politician_id",
        ignoreDuplicates: false,
      });

    if (error) {
      console.error("Fehler beim Batch-Insert:", error);
      return 0;
    }

    insertedCount = politicians.length;
  } catch (error) {
    console.error("Fehler beim Batch-Insert:", error);

    // Fallback: Einzeln einfügen
    for (const politician of politicians) {
      const success = await insertTvShowPolitician({
        tv_channel: tvChannel,
        show_name: showName,
        episode_date: episodeDate,
        politician_id: politician.politicianId,
        politician_name: politician.politicianName,
        party_id: politician.partyId,
        party_name: politician.partyName,
      });

      if (success) {
        insertedCount++;
      }
    }
  }

  return insertedCount;
}

// Hole das Datum der neuesten Episode für eine bestimmte Sendung (Supabase Version)
export async function getLatestEpisodeDate(
  showName: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("tv_show_politicians")
      .select("episode_date")
      .eq("show_name", showName)
      .order("episode_date", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return data.episode_date;
  } catch (error) {
    console.error("Fehler beim Abrufen des neuesten Datums:", error);
    return null;
  }
}

// Füge Episode-URL zur show_links Tabelle hinzu (Supabase Version)
export async function insertShowLink(
  data: InsertShowLinkData
): Promise<boolean> {
  try {
    const { error } = await supabase.from("show_links").upsert(
      {
        show_name: data.show_name,
        episode_url: data.episode_url,
        episode_date: data.episode_date,
      },
      {
        onConflict: "show_name,episode_date",
        ignoreDuplicates: true,
      }
    );

    if (error) {
      console.error("Fehler beim Einfügen der Episode-URL:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Fehler beim Einfügen der Episode-URL:", error);
    return false;
  }
}

// Füge mehrere Episode-URLs zur show_links Tabelle hinzu (Batch Insert)
export async function insertMultipleShowLinks(
  showName: string,
  episodes: Array<{
    episodeUrl: string;
    episodeDate: string;
  }>
): Promise<number> {
  if (episodes.length === 0) return 0;

  let insertedCount = 0;

  // Batch insert für bessere Performance
  const dataToInsert = episodes.map((episode) => ({
    show_name: showName,
    episode_url: episode.episodeUrl,
    episode_date: episode.episodeDate,
  }));

  try {
    const { error } = await supabase.from("show_links").upsert(dataToInsert, {
      onConflict: "show_name,episode_date",
      ignoreDuplicates: true,
    });

    if (error) {
      console.error("Fehler beim Batch-Insert der Episode-URLs:", error);

      // Fallback: Einzeln einfügen
      for (const episode of episodes) {
        const success = await insertShowLink({
          show_name: showName,
          episode_url: episode.episodeUrl,
          episode_date: episode.episodeDate,
        });

        if (success) {
          insertedCount++;
        }
      }
    } else {
      insertedCount = episodes.length;
    }
  } catch (error) {
    console.error("Fehler beim Batch-Insert der Episode-URLs:", error);

    // Fallback: Einzeln einfügen
    for (const episode of episodes) {
      const success = await insertShowLink({
        show_name: showName,
        episode_url: episode.episodeUrl,
        episode_date: episode.episodeDate,
      });

      if (success) {
        insertedCount++;
      }
    }
  }

  return insertedCount;
}

// ============================================
// Gemeinsame Hilfsfunktionen für alle Crawler
// ============================================

// Name in Vor- und Nachname aufteilen
export function splitFirstLast(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ").trim() };
}

// Disambiguierung basierend auf Rolle/Beschreibung
export function disambiguateByRole(
  politicians: AbgeordnetenwatchPolitician[],
  role: string
): AbgeordnetenwatchPolitician | null {
  const roleUpper = role.toUpperCase();

  const partyMappings: Record<string, string[]> = {
    CDU: ["CDU", "CHRISTLICH DEMOKRATISCHE UNION"],
    CSU: ["CSU", "CHRISTLICH-SOZIALE UNION"],
    SPD: ["SPD", "SOZIALDEMOKRATISCHE PARTEI"],
    FDP: ["FDP", "FREIE DEMOKRATISCHE PARTEI"],
    GRÜNE: ["BÜNDNIS 90/DIE GRÜNEN", "DIE GRÜNEN"],
    LINKE: ["DIE LINKE"],
    AFD: ["AFD", "ALTERNATIVE FÜR DEUTSCHLAND"],
  };

  const positionMappings: Record<string, string[]> = {
    BUNDESKANZLER: ["BUNDESKANZLER", "KANZLER"],
    MINISTERPRÄSIDENT: [
      "MINISTERPRÄSIDENT",
      "REGIERUNGSCHEF",
      "LANDESVORSITZENDE",
    ],
    MINISTER: ["MINISTER", "BUNDESMINISTER", "STAATSSEKRETÄR"],
    BUNDESTAG: ["BUNDESTAG", "MDB", "ABGEORDNETE"],
    LANDTAG: ["LANDTAG", "MDL", "LANDESABGEORDNETE"],
  };

  for (const [party, variants] of Object.entries(partyMappings)) {
    if (variants.some((variant) => roleUpper.includes(variant))) {
      const partyMatch = politicians.find(
        (p) => p.party && p.party.label.toUpperCase().includes(party)
      );
      if (partyMatch) {
        console.log(`✅ Partei-Match gefunden: ${party}`);
        return partyMatch;
      }
    }
  }

  for (const [position, variants] of Object.entries(positionMappings)) {
    if (variants.some((variant) => roleUpper.includes(variant))) {
      if (["BUNDESKANZLER", "MINISTERPRÄSIDENT"].includes(position)) {
        console.log(`✅ Position-Match gefunden: ${position}`);
        return politicians[0];
      }
    }
  }

  return null;
}

// Politiker-Prüfung mit Abgeordnetenwatch API
export async function checkPolitician(
  name: string,
  role?: string
): Promise<GuestDetails> {
  const override = checkPoliticianOverride(name);
  if (override) {
    return override;
  }

  const { first, last } = splitFirstLast(name);
  if (!first || !last) {
    return {
      name,
      isPolitician: false,
      politicianId: null,
    };
  }

  const url = `https://www.abgeordnetenwatch.de/api/v2/politicians?first_name=${encodeURIComponent(
    first
  )}&last_name=${encodeURIComponent(last)}`;

  try {
    const { data } = await axios.get(url, { timeout: 10000 });
    const politicians: AbgeordnetenwatchPolitician[] = data?.data || [];

    if (politicians.length === 0) {
      return {
        name,
        isPolitician: false,
        politicianId: null,
      };
    }

    if (
      name.includes("Markus") &&
      (name.includes("Söder") || name.includes("Soder"))
    ) {
      console.log(
        `🎯 Spezialbehandlung für Markus Söder - wähle CSU-Politiker`
      );
      const csuSoeder = politicians.find((p) => p.party?.label === "CSU");
      if (csuSoeder) {
        console.log(
          `✅ CSU-Söder gefunden: ${csuSoeder.label} (ID: ${csuSoeder.id})`
        );
        return {
          name,
          isPolitician: true,
          politicianId: csuSoeder.id,
          politicianName: csuSoeder.label || name,
          party: csuSoeder.party?.id,
          partyName: csuSoeder.party?.label,
        };
      }
    }

    if (politicians.length === 1) {
      const hit = politicians[0];
      return {
        name,
        isPolitician: true,
        politicianId: hit.id,
        politicianName: hit.label || name,
        party: hit.party?.id,
        partyName: hit.party?.label,
      };
    }

    if (role && politicians.length > 1) {
      console.log(
        `🔍 Disambiguierung für ${name}: ${politicians.length} Treffer gefunden, Rolle: "${role}"`
      );

      const selectedPolitician = disambiguateByRole(politicians, role);
      if (selectedPolitician) {
        console.log(
          `✅ Politiker ausgewählt: ${selectedPolitician.label} (${selectedPolitician.party?.label})`
        );
        return {
          name,
          isPolitician: true,
          politicianId: selectedPolitician.id,
          politicianName: selectedPolitician.label || name,
          party: selectedPolitician.party?.id,
          partyName: selectedPolitician.party?.label,
        };
      }
    }

    console.log(
      `⚠️  Keine eindeutige Zuordnung für ${name}, verwende ersten Treffer`
    );
    const hit = politicians[0];
    return {
      name,
      isPolitician: true,
      politicianId: hit.id,
      politicianName: hit.label || name,
      party: hit.party?.id,
      partyName: hit.party?.label,
    };
  } catch {
    return {
      name,
      isPolitician: false,
      politicianId: null,
    };
  }
}

// Speichern der politischen Themenbereiche
export async function insertEpisodePoliticalAreas(
  showName: string,
  episodeDate: string,
  politicalAreaIds: number[]
): Promise<number> {
  if (!politicalAreaIds.length) return 0;

  try {
    const insertData = politicalAreaIds.map((areaId) => ({
      show_name: showName,
      episode_date: episodeDate,
      political_area_id: areaId,
    }));

    const { error } = await supabase
      .from("tv_show_episode_political_areas")
      .upsert(insertData, {
        onConflict: "show_name,episode_date,political_area_id",
        ignoreDuplicates: true,
      });

    if (error) {
      console.error(
        "Fehler beim Speichern der politischen Themenbereiche:",
        error
      );
      return 0;
    }

    return insertData.length;
  } catch (error) {
    console.error(
      "Fehler beim Speichern der politischen Themenbereiche:",
      error
    );
    return 0;
  }
}
