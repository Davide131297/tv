import * as cheerio from "cheerio";
import { supabase } from "../supabase.js";

// ============================================
// Wahltermine-Crawler (wahlrecht.de/termine.htm)
// Landtagswahlen (inkl. Stadtstaaten) und Bundestagswahlen
// ============================================

const TERMINE_URL = "https://www.wahlrecht.de/termine.htm";

export type ElectionType = "landtag" | "bundestag";

export interface Wahl {
  id: string;
  election_type: ElectionType;
  state_code: string;
  state_name: string;
  parliament: string;
  election_date: string;
}

// Deutsche Monatsnamen → Monatsnummer
const MONTH_MAP: Record<string, string> = {
  januar: "01",
  februar: "02",
  märz: "03",
  april: "04",
  mai: "05",
  juni: "06",
  juli: "07",
  august: "08",
  september: "09",
  oktober: "10",
  november: "11",
  dezember: "12",
};

// Bundesland → Kürzel (wie in den Zeilen-IDs von wahlrecht.de)
const STATE_CODES: Record<string, string> = {
  "Baden-Württemberg": "BW",
  Bayern: "BY",
  Berlin: "BE",
  Brandenburg: "BB",
  Bremen: "HB",
  Hamburg: "HH",
  Hessen: "HE",
  "Mecklenburg-Vorpommern": "MV",
  Niedersachsen: "NI",
  "Nordrhein-Westfalen": "NW",
  "Rheinland-Pfalz": "RP",
  Saarland: "SL",
  Sachsen: "SN",
  "Sachsen-Anhalt": "ST",
  "Schleswig-Holstein": "SH",
  Thüringen: "TH",
};

// Landesparlamente (Stadtstaaten: Bürgerschaft bzw. Abgeordnetenhaus)
const STATE_PARLIAMENT_REGEX = /^(Landtag|Bürgerschaft|Abgeordnetenhaus)\b/;

const cleanText = (value: string) =>
  value
    .replace(/ /g, " ")
    .replace(/­/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Bestimmt Wahltyp und Bundesland einer Tabellenzeile.
 * Landtagswahlen werden am Parlamentsnamen erkannt (Landtag, Bürgerschaft,
 * Abgeordnetenhaus) – nicht allein an der Zeilen-ID, da diese auf wahlrecht.de
 * teilweise vertauscht sind. Bundestagswahlen nur bundesweit ("alle Bundesländer"),
 * Teilwiederholungswahlen werden ignoriert.
 */
function classifyRow(
  stateName: string,
  parliament: string,
): Pick<Wahl, "election_type" | "state_code" | "state_name"> | null {
  if (parliament === "Bundestag" && stateName === "alle Bundesländer") {
    return {
      election_type: "bundestag",
      state_code: "DE",
      state_name: "Deutschland",
    };
  }

  if (STATE_PARLIAMENT_REGEX.test(parliament) && STATE_CODES[stateName]) {
    return {
      election_type: "landtag",
      state_code: STATE_CODES[stateName],
      state_name: stateName,
    };
  }

  return null;
}

/**
 * Parst die Termintabelle.
 * Vergangene Termine stehen ohne Jahr in der Tabelle ("2. März"), daher wird
 * das Jahr aus der Zeilen-ID genommen. Unscharfe Termine ("Herbst") und
 * durchgestrichene (abgesagte) Termine werden übersprungen.
 */
export function parseWahlen(html: string): Wahl[] {
  const $ = cheerio.load(html);
  const elections = new Map<string, Wahl>();

  $("tr[id]").each((_, row) => {
    const yearMatch = ($(row).attr("id") ?? "").match(/-(\d{4})(?:-|$)/);
    if (!yearMatch) return;
    const year = yearMatch[1];

    const cells = $(row).find("td");
    if (cells.length < 4) return;

    // Abgesagte Termine sind durchgestrichen (z. B. regulärer BTW-Termin 2025)
    if (cells.eq(1).find("strike, s, del").length > 0) return;

    const parliament = cleanText(cells.eq(3).text()).split(",")[0].trim();
    const classification = classifyRow(cleanText(cells.eq(2).text()), parliament);
    if (!classification) return;

    const dateText = cleanText(cells.eq(1).text());
    const dateMatch = dateText.match(/(\d{1,2})\.\s*([A-Za-zÄÖÜäöü]+)/);
    if (!dateMatch) return;

    const month = MONTH_MAP[dateMatch[2].toLowerCase()];
    if (!month) return;

    const electionDate = `${year}-${month}-${dateMatch[1].padStart(2, "0")}`;
    // Gebiet + Wahljahr als stabiler Schlüssel, damit verschobene Termine aktualisiert werden
    const id = `${classification.election_type}-${classification.state_code.toLowerCase()}-${year}`;
    elections.set(id, {
      id,
      ...classification,
      parliament,
      election_date: electionDate,
    });
  });

  return Array.from(elections.values()).sort((a, b) =>
    a.election_date.localeCompare(b.election_date),
  );
}

export async function crawlWahlen() {
  console.log("=== Wahltermine Crawler gestartet ===");

  const response = await fetch(TERMINE_URL);
  if (!response.ok) {
    throw new Error(
      `Fehler beim Laden der wahlrecht.de-Seite: ${response.status}`,
    );
  }
  const html = await response.text();
  const elections = parseWahlen(html);

  console.log(`🗳️  ${elections.length} Wahltermine gefunden`);

  if (elections.length === 0) {
    return { found: 0, saved: 0 };
  }

  const { data, error } = await supabase
    .from("wahlen")
    .upsert(elections, { onConflict: "id" })
    .select();

  if (error) {
    console.error("Fehler beim Speichern der Wahltermine:", error);
    throw error;
  }

  console.log(`✅ ${data?.length ?? 0} Wahltermine gespeichert/aktualisiert`);
  console.log("=== Wahltermine Crawler abgeschlossen ===");

  return { found: elections.length, saved: data?.length ?? 0 };
}
