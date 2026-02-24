import { supabase } from "@/lib/supabase";

// ============================================
// Gemeinsame Typen & Helpers
// ============================================

interface TvRating {
  show_name: string;
  episode_date: string;
  market_share: number;
  viewers_millions: number;
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

async function saveRatings(ratings: TvRating[], label: string) {
  if (ratings.length === 0) {
    console.log(`Keine relevanten Sendungen gefunden (${label}).`);
    return;
  }

  console.log(
    `📊 ${ratings.length} relevante Sendung(en) gefunden (${label}):`,
  );
  ratings.forEach((r) =>
    console.log(
      `   - ${r.show_name}: ${r.market_share}% Marktanteil, ${r.viewers_millions} Mio. Zuschauer`,
    ),
  );

  // Nur Ratings speichern, wenn Politiker für diese Episode eingetragen sind
  const ratingsWithPoliticians: TvRating[] = [];

  for (const rating of ratings) {
    const { data: politicians, error: checkError } = await supabase
      .from("tv_show_politicians")
      .select("id")
      .ilike("show_name", rating.show_name)
      .eq("episode_date", rating.episode_date)
      .limit(1);

    if (checkError) {
      console.error(
        `Fehler beim Prüfen der Politiker für ${rating.show_name} (${rating.episode_date}):`,
        checkError,
      );
      continue;
    }

    if (politicians && politicians.length > 0) {
      ratingsWithPoliticians.push(rating);
    } else {
      console.log(
        `⏭️  Übersprungen: ${rating.show_name} (${rating.episode_date}) – keine Politiker eingetragen`,
      );
    }
  }

  if (ratingsWithPoliticians.length === 0) {
    console.log(
      `Keine Sendungen mit eingetragenen Politikern gefunden (${label}).`,
    );
    return;
  }

  console.log(
    `📊 ${ratingsWithPoliticians.length} Sendung(en) mit Politikern (${label})`,
  );

  const { data, error } = await supabase
    .from("tv_ratings")
    .upsert(ratingsWithPoliticians, { onConflict: "show_name,episode_date" })
    .select();

  if (error) {
    console.error(`Fehler beim Speichern (${label}):`, error);
    throw error;
  }

  console.log(
    `✅ ${data?.length ?? 0} Einträge gespeichert/aktualisiert (${label}).`,
  );
}

// ============================================
// ARD Crawler
// ============================================

const ARD_URL =
  "https://www1.wdr.de/unternehmen/der-wdr/profil/quoten-tv-ard-100.html";
const ARD_TRACKED_SHOWS = ["hart aber fair", "maischberger", "miosga"];

function parseARDDate(html: string): string | null {
  const h1Match = html.match(
    /<h1[^>]*>.*?Einschaltquoten vom (\d{1,2})\.\s*(\w+).*?<\/h1>/is,
  );
  if (!h1Match) return null;

  const day = h1Match[1].padStart(2, "0");
  const monthName = h1Match[2].toLowerCase().trim();
  const month = MONTH_MAP[monthName];

  if (!month) {
    console.error(`Unbekannter Monat: ${monthName}`);
    return null;
  }

  const currentYear = new Date().getFullYear();
  return `${currentYear}-${month}-${day}`;
}

function parseARDTable(html: string): TvRating[] {
  const ratings: TvRating[] = [];

  const episodeDate = parseARDDate(html);
  if (!episodeDate) {
    console.error("ARD: Konnte Datum nicht aus der Headline extrahieren");
    return [];
  }

  console.log(`📅 ARD Datum: ${episodeDate}`);

  const rowRegex =
    /<tr class="data">\s*<td class="entry">([^<]*)<\/td>\s*<td class="entry">([^<]*)<\/td>\s*<td class="entry">([^<]*)<\/td>\s*<td class="entry">([^<]*)<\/td>\s*<\/tr>/g;

  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    const showName = match[2].trim();
    const marketShareStr = match[3].trim();
    const viewersStr = match[4].trim();

    const isTracked = ARD_TRACKED_SHOWS.some((tracked) =>
      showName.toLowerCase().includes(tracked),
    );

    if (isTracked) {
      const marketShare = parseFloat(
        marketShareStr.replace("%", "").replace(",", "."),
      );
      const viewersMillions = parseFloat(
        viewersStr.replace("Mio.", "").replace(",", ".").trim(),
      );

      if (!isNaN(marketShare) && !isNaN(viewersMillions)) {
        ratings.push({
          show_name: showName,
          episode_date: episodeDate,
          market_share: marketShare,
          viewers_millions: viewersMillions,
        });
      }
    }
  }

  return ratings;
}

export async function crawlARDRatings() {
  console.log("=== ARD Ratings Crawler gestartet ===");

  const response = await fetch(ARD_URL);
  if (!response.ok) {
    throw new Error(`Fehler beim Laden der ARD-Seite: ${response.status}`);
  }
  const html = await response.text();
  const ratings = parseARDTable(html);
  await saveRatings(ratings, "ARD");

  console.log("=== ARD Ratings Crawler abgeschlossen ===");
}

// ============================================
// ZDF Crawler
// ============================================

const ZDF_URL = "https://teletext.zdf.de/teletext/zdf/seiten/448.html";
const ZDF_TRACKED_SHOWS = ["markus lanz", "maybrit illner"];

function parseZDFDate(html: string): string | null {
  // Format im Header-Div: " Abend        23.02.2026      Mio.  MA % "
  const dateMatch = html.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!dateMatch) return null;

  const day = dateMatch[1];
  const month = dateMatch[2];
  const year = dateMatch[3];
  return `${year}-${month}-${day}`;
}

function parseZDFTable(html: string): TvRating[] {
  const ratings: TvRating[] = [];

  const episodeDate = parseZDFDate(html);
  if (!episodeDate) {
    console.error("ZDF: Konnte Datum nicht extrahieren");
    return [];
  }

  console.log(`📅 ZDF Datum: ${episodeDate}`);

  // ZDF Teletext Format: " HH:MM Sendungsname               X,XXX YY,Y "
  // Jede Zeile ist in einem <div class="table">
  const divRegex = /<div class="table"[^>]*>\s*(.*?)\s*<\/div>/g;

  let match;
  while ((match = divRegex.exec(html)) !== null) {
    const line = match[1].replace(/<br\s*\/?>/g, "").trim();

    // Format: "HH:MM Sendungsname               X,XXX YY,Y"
    // Parsen: Zeit, dann Name, dann Zuschauer (Mio), dann Marktanteil (%)
    const lineMatch = line.match(
      /^(\d{2}:\d{2})\s+(.+?)\s{2,}(\d+,\d+)\s+(\d+,?\d*)\s*$/,
    );
    if (!lineMatch) continue;

    const showName = lineMatch[2].trim();
    const viewersStr = lineMatch[3]; // z.B. "3,351"
    const marketShareStr = lineMatch[4]; // z.B. "17,5"

    const isTracked = ZDF_TRACKED_SHOWS.some((tracked) =>
      showName.toLowerCase().includes(tracked),
    );

    if (isTracked) {
      const viewersMillions = parseFloat(viewersStr.replace(",", "."));
      const marketShare = parseFloat(marketShareStr.replace(",", "."));

      if (!isNaN(marketShare) && !isNaN(viewersMillions)) {
        ratings.push({
          show_name: showName,
          episode_date: episodeDate,
          market_share: marketShare,
          viewers_millions: viewersMillions,
        });
      }
    }
  }

  return ratings;
}

export async function crawlZDFRatings() {
  console.log("=== ZDF Ratings Crawler gestartet ===");

  const response = await fetch(ZDF_URL);
  if (!response.ok) {
    throw new Error(`Fehler beim Laden der ZDF-Seite: ${response.status}`);
  }
  const html = await response.text();
  const ratings = parseZDFTable(html);
  await saveRatings(ratings, "ZDF");

  console.log("=== ZDF Ratings Crawler abgeschlossen ===");
}
