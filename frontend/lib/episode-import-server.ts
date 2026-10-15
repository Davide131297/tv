import "server-only";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkPolitician } from "@/lib/supabase-server-utils";
import { extractEpisodeGuestsWithAI } from "@/lib/ai-utils";
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
} from "@/lib/episode-import";

const MAX_GUESTS = 20;
const FETCH_TIMEOUT_MS = 15000;
const MAX_REDIRECTS = 3;

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
      cache: "no-store",
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
  const { data, error } = await supabaseAdmin
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

  const partyTaggedGuests = extractPartyTaggedGuests(text);
  let aiGuests: Array<{ name: string; role: string }> = [];

  try {
    aiGuests = await extractEpisodeGuestsWithAI(text);
  } catch (error) {
    console.error("Link-Import: KI-Extraktion fehlgeschlagen:", error);
    warnings.push(
      partyTaggedGuests.length > 0
        ? "KI-Extraktion fehlgeschlagen – es werden nur Gäste mit Parteiangabe von der Seite angezeigt."
        : "KI-Extraktion fehlgeschlagen und keine Gäste mit Parteiangabe gefunden.",
    );
  }

  let guests = mergeGuests(partyTaggedGuests, aiGuests);
  if (guests.length > MAX_GUESTS) {
    warnings.push(`Mehr als ${MAX_GUESTS} Gäste gefunden – nur die ersten ${MAX_GUESTS} werden geprüft.`);
    guests = guests.slice(0, MAX_GUESTS);
  }

  if (guests.length === 0) {
    warnings.push("Auf der Seite wurden keine Gäste gefunden.");
  }

  const existing =
    show && episodeDate
      ? await getExistingPoliticians(show.show_name, episodeDate)
      : { ids: new Set<number>(), names: new Set<string>() };

  const previewGuests = await Promise.all(
    guests.map(async (guest): Promise<ImportPreviewGuest> => {
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
    }),
  );

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
    return { inserted: [], skipped };
  }

  const { data, error } = await supabaseAdmin
    .from("tv_show_politicians")
    .insert(rowsToInsert)
    .select();

  if (error) {
    throw error;
  }

  return { inserted: data ?? [], skipped };
}
