import axios from "axios";
import { supabase } from "../supabase.js";
import { checkPolitician, extractEpisodeGuestsWithAI } from "./utils.js";
import { parseZdfEpisodeHtml } from "./zdf-api.js";
import {
  buildAbgeordnetenwatchUrl,
  detectShowFromUrl,
  extractEpisodeDate,
  extractPartyTaggedGuests,
  htmlToImportText,
  mergeGuests,
  normalizePartyName,
  parseImportUrl,
  roleMatchesParty,
  type ImportConfirmPayload,
  type ImportPreview,
  type ImportPreviewGuest,
} from "./episode-import.js";

const MAX_GUESTS = 20;
const FETCH_TIMEOUT_MS = 15000;
const MAX_REDIRECTS = 3;

// Sendungen, für die der Crawler-Parser die strukturierte ZDF-Gästeliste liest
const ZDF_PARSER_SHOWS: Record<string, "lanz" | "illner"> = {
  "Markus Lanz": "lanz",
  "Maybrit Illner": "illner",
};

async function fetchPageHtml(url: URL): Promise<string> {
  let currentUrl = url;

  // Redirects manuell folgen, damit jedes Ziel gegen die erlaubten Domains geprüft wird
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    const response = await fetch(currentUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Polittalk-Watcher/1.0)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "de-DE,de;q=0.9",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      currentUrl = parseImportUrl(new URL(location, currentUrl).toString());
      continue;
    }

    if (!response.ok) {
      throw new Error(`Seite konnte nicht geladen werden (HTTP ${response.status}).`);
    }

    return response.text();
  }

  throw new Error("Zu viele Weiterleitungen.");
}

async function getExistingPoliticians(showName: string, episodeDate: string) {
  const { data, error } = await supabase
    .from("tv_show_politicians")
    .select("politician_id, politician_name")
    .eq("show_name", showName)
    .eq("episode_date", episodeDate);

  if (error) {
    throw error;
  }

  return {
    ids: new Set(
      (data ?? [])
        .map((row) => row.politician_id as number | null)
        .filter((id): id is number => typeof id === "number"),
    ),
    names: new Set(
      (data ?? []).map((row) => String(row.politician_name).toLowerCase()),
    ),
  };
}

function extractZdfParserGuests(
  url: URL,
  showName: string | undefined,
  html: string,
): Array<{ name: string; role: string }> {
  const parserShow = showName ? ZDF_PARSER_SHOWS[showName] : undefined;
  const isZdf = url.hostname === "zdf.de" || url.hostname.endsWith(".zdf.de");
  if (!parserShow || !isZdf) {
    return [];
  }

  try {
    return parseZdfEpisodeHtml(parserShow, html).guests.map((guest) => ({
      name: guest.name,
      role: guest.role ?? "",
    }));
  } catch (error) {
    console.error("Link-Import: ZDF-Parser fehlgeschlagen:", error);
    return [];
  }
}

type ExistingPoliticians = Awaited<ReturnType<typeof getExistingPoliticians>>;

async function buildPreviewGuest(
  guest: { name: string; role: string },
  existing: ExistingPoliticians,
): Promise<ImportPreviewGuest> {
  const details = await checkPolitician(guest.name, guest.role || undefined);
  const politicianName = details.isPolitician
    ? details.politicianName || guest.name
    : null;
  const partyName = details.isPolitician
    ? normalizePartyName(details.partyName)
    : null;
  const alreadyInDb =
    (details.politicianId !== null && existing.ids.has(details.politicianId)) ||
    existing.names.has((politicianName ?? guest.name).toLowerCase());

  return {
    name: guest.name,
    role: guest.role,
    isPolitician: details.isPolitician,
    politician_id: details.isPolitician ? details.politicianId : null,
    politician_name: politicianName,
    party_id: details.isPolitician ? (details.party ?? null) : null,
    party_name: partyName,
    abgeordnetenwatch_url: politicianName
      ? buildAbgeordnetenwatchUrl(politicianName)
      : null,
    alreadyInDb,
    needsReview: details.isPolitician && !roleMatchesParty(guest.role, partyName),
  };
}

/**
 * Lädt eine Episodenseite, extrahiert die Gäste und gleicht sie mit abgeordnetenwatch ab.
 * Schreibt NICHT in die Datenbank.
 */
export async function buildImportPreview(rawUrl: string): Promise<ImportPreview> {
  const url = parseImportUrl(rawUrl);
  const warnings: string[] = [];

  const html = await fetchPageHtml(url);
  const text = htmlToImportText(html);

  const show = detectShowFromUrl(url.toString());
  if (!show) {
    warnings.push("Sendung konnte nicht aus dem Link erkannt werden – bitte manuell auswählen.");
  }

  const episodeDate = extractEpisodeDate(text, url.toString());
  if (!episodeDate) {
    warnings.push("Sendedatum konnte nicht erkannt werden – bitte manuell eintragen.");
  }

  const zdfParserGuests = extractZdfParserGuests(url, show?.show_name, html);
  const partyTaggedGuests = extractPartyTaggedGuests(text);
  const deterministicCount = zdfParserGuests.length + partyTaggedGuests.length;
  let aiGuests: Array<{ name: string; role: string }> = [];

  try {
    aiGuests = await extractEpisodeGuestsWithAI(text);
  } catch (error) {
    // Nur die Ursache loggen – das axios-Fehlerobjekt enthält den kompletten Seitentext
    const reason = axios.isAxiosError(error)
      ? `${error.code ?? error.message} (${error.config?.url ?? "KI-Endpunkt"})`
      : error instanceof Error
        ? error.message
        : String(error);
    console.warn(`⚠️  Link-Import: KI-Extraktion fehlgeschlagen: ${reason}`);
    warnings.push(
      deterministicCount > 0
        ? "KI-Extraktion fehlgeschlagen – es werden nur direkt von der Seite gelesene Gäste angezeigt."
        : "KI-Extraktion fehlgeschlagen und keine Gäste auf der Seite erkannt.",
    );
  }

  let guests = mergeGuests(zdfParserGuests, partyTaggedGuests, aiGuests);
  if (guests.length > MAX_GUESTS) {
    warnings.push(`Mehr als ${MAX_GUESTS} Gäste gefunden – nur die ersten ${MAX_GUESTS} werden geprüft.`);
    guests = guests.slice(0, MAX_GUESTS);
  }

  if (guests.length === 0) {
    warnings.push("Auf der Seite wurden keine Gäste gefunden.");
  }

  const existing: ExistingPoliticians =
    show && episodeDate
      ? await getExistingPoliticians(show.show_name, episodeDate)
      : { ids: new Set<number>(), names: new Set<string>() };

  // Nacheinander prüfen wie in den Crawlern – parallele Anfragen lösen bei abgeordnetenwatch HTTP 429 aus
  const previewGuests: ImportPreviewGuest[] = [];
  for (const guest of guests) {
    previewGuests.push(await buildPreviewGuest(guest, existing));
  }

  return {
    url: url.toString(),
    show_name: show?.show_name ?? null,
    tv_channel: show?.tv_channel ?? null,
    episode_date: episodeDate,
    guests: previewGuests,
    warnings,
  };
}

/**
 * Speichert die bestätigten Politiker. Bereits vorhandene Einträge der Episode werden übersprungen.
 */
export async function saveImportedPoliticians(payload: ImportConfirmPayload) {
  const existing = await getExistingPoliticians(payload.show_name, payload.episode_date);
  const seenIds = new Set<number>();

  const rowsToInsert = payload.politicians
    .filter((politician) => {
      if (existing.ids.has(politician.politician_id) || seenIds.has(politician.politician_id)) {
        return false;
      }
      seenIds.add(politician.politician_id);
      return true;
    })
    .map((politician) => ({
      show_name: payload.show_name,
      episode_date: payload.episode_date,
      tv_channel: payload.tv_channel,
      politician_id: politician.politician_id,
      politician_name: politician.politician_name,
      party_id: politician.party_id,
      party_name: politician.party_name,
      abgeordnetenwatch_url: politician.abgeordnetenwatch_url,
      updated_at: new Date().toISOString(),
    }));

  const skipped = payload.politicians.length - rowsToInsert.length;

  if (rowsToInsert.length === 0) {
    return { inserted: 0, skipped };
  }

  // Gleicher Konflikt-Schlüssel wie bei den Crawlern; vorhandene Zeilen werden nicht überschrieben
  const { error } = await supabase
    .from("tv_show_politicians")
    .upsert(rowsToInsert, {
      onConflict: "show_name,episode_date,politician_id",
      ignoreDuplicates: true,
    });

  if (error) {
    throw error;
  }

  return { inserted: rowsToInsert.length, skipped };
}
