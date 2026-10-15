// Reine Hilfsfunktionen für den Admin-Link-Import (ohne Server-Abhängigkeiten, testbar)

export type ImportPreviewGuest = {
  name: string;
  role: string;
  isPolitician: boolean;
  politician_id: number | null;
  politician_name: string | null;
  party_id: number | null;
  party_name: string | null;
  abgeordnetenwatch_url: string | null;
  alreadyInDb: boolean;
  // Treffer bei abgeordnetenwatch, aber die Seite nennt keine passende Partei
  needsReview: boolean;
};

export type ImportPreview = {
  url: string;
  show_name: string | null;
  tv_channel: string | null;
  episode_date: string | null;
  guests: ImportPreviewGuest[];
  warnings: string[];
};

export type ImportPolitician = {
  politician_id: number;
  politician_name: string;
  party_id: number | null;
  party_name: string | null;
  abgeordnetenwatch_url: string | null;
};

export type ImportConfirmPayload = {
  show_name: string;
  episode_date: string;
  tv_channel: string | null;
  politicians: ImportPolitician[];
};

type ShowSource = {
  pattern: RegExp;
  show_name: string;
  tv_channel: string;
};

// Reihenfolge ist relevant: spezifischere Muster zuerst
const SHOW_SOURCES: ShowSource[] = [
  { pattern: /hart-?aber-?fair/, show_name: "Hart aber fair", tv_channel: "Das Erste" },
  { pattern: /markus-lanz/, show_name: "Markus Lanz", tv_channel: "ZDF" },
  { pattern: /maybrit-illner/, show_name: "Maybrit Illner", tv_channel: "ZDF" },
  { pattern: /maischberger/, show_name: "Maischberger", tv_channel: "Das Erste" },
  { pattern: /miosga/, show_name: "Caren Miosga", tv_channel: "Das Erste" },
  { pattern: /phoenix-runde/, show_name: "Phoenix Runde", tv_channel: "Phoenix" },
  { pattern: /phoenix-persoenlich|phoenix\.de\/.*persoenlich/, show_name: "Phoenix Persönlich", tv_channel: "Phoenix" },
  { pattern: /pinar-atalay/, show_name: "Pinar Atalay", tv_channel: "NTV" },
  { pattern: /blome-pfeffer/, show_name: "Blome & Pfeffer", tv_channel: "NTV" },
];

export const ALLOWED_IMPORT_HOSTS = [
  "wdr.de",
  "daserste.de",
  "ard.de",
  "ardmediathek.de",
  "ardaudiothek.de",
  "ndr.de",
  "swr.de",
  "br.de",
  "mdr.de",
  "hr.de",
  "rbb-online.de",
  "zdf.de",
  "phoenix.de",
  "rtl.de",
  "n-tv.de",
  "ntv.de",
  "welt.de",
  "prosieben.de",
  "joyn.de",
];

const PARTY_KEYWORDS: Record<string, string[]> = {
  CDU: ["CDU"],
  CSU: ["CSU"],
  SPD: ["SPD"],
  FDP: ["FDP"],
  "BÜNDNIS 90/DIE GRÜNEN": ["GRÜNE", "BÜNDNIS 90"],
  "Die Linke": ["LINKE"],
  AfD: ["AFD"],
  BSW: ["BSW"],
  "FREIE WÄHLER": ["FREIE WÄHLER"],
};

const ALL_PARTY_KEYWORDS = Object.values(PARTY_KEYWORDS).flat();

const GERMAN_MONTHS: Record<string, number> = {
  januar: 1,
  jaenner: 1,
  februar: 2,
  maerz: 3,
  märz: 3,
  april: 4,
  mai: 5,
  juni: 6,
  juli: 7,
  august: 8,
  september: 9,
  oktober: 10,
  november: 11,
  dezember: 12,
};

const NAME_PARTICLES = new Set(["von", "van", "de", "der", "den", "zu", "da", "di"]);

export function parseImportUrl(rawUrl: string): URL {
  let url: URL;

  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new Error("Ungültiger Link.");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Nur http- und https-Links werden unterstützt.");
  }

  const hostname = url.hostname.toLowerCase();
  const allowed = ALLOWED_IMPORT_HOSTS.some(
    (host) => hostname === host || hostname.endsWith(`.${host}`),
  );

  if (!allowed) {
    throw new Error(
      `Domain "${hostname}" wird nicht unterstützt. Erlaubt sind Sender-Seiten wie wdr.de, daserste.de, zdf.de, phoenix.de, rtl.de oder n-tv.de.`,
    );
  }

  return url;
}

export function detectShowFromUrl(
  url: string,
): { show_name: string; tv_channel: string } | null {
  const normalized = url.toLowerCase();
  const source = SHOW_SOURCES.find((entry) => entry.pattern.test(normalized));
  return source
    ? { show_name: source.show_name, tv_channel: source.tv_channel }
    : null;
}

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  amp: "&",
  auml: "ä",
  ouml: "ö",
  uuml: "ü",
  Auml: "Ä",
  Ouml: "Ö",
  Uuml: "Ü",
  szlig: "ß",
  eacute: "é",
  egrave: "è",
  ndash: "–",
  mdash: "—",
  bdquo: "„",
  ldquo: "“",
  rdquo: "”",
  shy: "",
};

function decodeHtmlEntities(text: string): string {
  return text.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
    (entity, code: string) => {
      if (code[0] === "#") {
        const codePoint =
          code[1].toLowerCase() === "x"
            ? parseInt(code.slice(2), 16)
            : Number(code.slice(1));
        return Number.isFinite(codePoint) && codePoint <= 0x10ffff
          ? String.fromCodePoint(codePoint)
          : entity;
      }
      return NAMED_ENTITIES[code] ?? entity;
    },
  );
}

function getAttribute(tag: string, attribute: string): string | null {
  const match = tag.match(
    new RegExp(`\\s${attribute}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"),
  );
  if (!match) {
    return null;
  }
  return decodeHtmlEntities(match[2] ?? match[3] ?? "").trim();
}

const RELEVANT_META_KEYS = new Set([
  "description",
  "og:title",
  "og:description",
  "og:image:alt",
  "twitter:title",
  "twitter:description",
  "twitter:image:alt",
]);

/**
 * Wandelt HTML in gut lesbaren Text um. Meta-Tags und Bild-Alt-Texte werden
 * vorangestellt, da z.B. ZDF die Gästeliste nur dort ausliefert.
 */
export function htmlToImportText(html: string, maxLength = 30000): string {
  const header: string[] = [];

  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (title) {
    header.push(`Titel: ${decodeHtmlEntities(title).trim()}`);
  }

  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = (getAttribute(tag, "property") ?? getAttribute(tag, "name"))?.toLowerCase();
    const content = getAttribute(tag, "content");
    if (key && content && RELEVANT_META_KEYS.has(key)) {
      header.push(content);
    }
  }

  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    const alt = getAttribute(tag, "alt");
    if (alt && alt.length > 15) {
      header.push(alt);
    }
  }

  const body = decodeHtmlEntities(
    html
      .replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/section|\/article|\/tr)\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, "\n"),
  );

  const seen = new Set<string>();
  const lines: string[] = [];

  for (const rawLine of [...header, ...body.split("\n")]) {
    const line = rawLine.replace(/\s+/g, " ").trim();
    if (!line || line === "|" || seen.has(line)) {
      continue;
    }
    seen.add(line);
    lines.push(line);
  }

  return lines.join("\n").slice(0, maxLength);
}

function toIsoDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2000) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function normalizeMonthName(month: string): string {
  return month.toLowerCase().replace(/ä/g, "ae");
}

/**
 * Ermittelt das Sendedatum aus Seitentext und URL.
 * Reihenfolge: "Sendung vom TT.MM.JJJJ" → "vom 8. Oktober 2026" (Text oder URL-Slug) → erstes TT.MM.JJJJ.
 */
export function extractEpisodeDate(text: string, url: string): string | null {
  const broadcastMatch = text.match(/Sendung vom (\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (broadcastMatch) {
    return toIsoDate(
      Number(broadcastMatch[3]),
      Number(broadcastMatch[2]),
      Number(broadcastMatch[1]),
    );
  }

  const monthNames = Object.keys(GERMAN_MONTHS).join("|");
  const longDatePattern = new RegExp(
    `vom[\\s-]+(\\d{1,2})\\.?[\\s-]+(${monthNames})[\\s-]+(\\d{4})`,
    "i",
  );

  for (const source of [text, decodeURIComponent(url)]) {
    const longMatch = source.match(longDatePattern);
    if (longMatch) {
      const month =
        GERMAN_MONTHS[longMatch[2].toLowerCase()] ??
        GERMAN_MONTHS[normalizeMonthName(longMatch[2])];
      return toIsoDate(Number(longMatch[3]), month, Number(longMatch[1]));
    }
  }

  const anyDateMatch = text.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/);
  if (anyDateMatch) {
    return toIsoDate(
      Number(anyDateMatch[3]),
      Number(anyDateMatch[2]),
      Number(anyDateMatch[1]),
    );
  }

  return null;
}

function looksLikePersonName(name: string): boolean {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 5) {
    return false;
  }
  return words.every(
    (word) => NAME_PARTICLES.has(word.toLowerCase()) || /^\p{Lu}/u.test(word),
  );
}

export function roleMentionsParty(role: string): boolean {
  const upperRole = role.toUpperCase();
  return ALL_PARTY_KEYWORDS.some((keyword) => upperRole.includes(keyword));
}

/**
 * Prüft, ob die auf der Seite genannte Rolle zur Partei des abgeordnetenwatch-Treffers passt.
 */
export function roleMatchesParty(role: string, partyName: string | null): boolean {
  if (!partyName) {
    return false;
  }
  const upperRole = role.toUpperCase();
  const upperParty = partyName.toUpperCase();
  const keywords =
    Object.entries(PARTY_KEYWORDS).find(
      ([party]) => party.toUpperCase() === upperParty,
    )?.[1] ?? [upperParty];
  return keywords.some((keyword) => upperRole.includes(keyword));
}

/**
 * Findet Zeilen im Format "Name, PARTEI" (z.B. WDR/ARD-Gästelisten).
 * Funktioniert ohne KI als deterministische Grundlage.
 */
export function extractPartyTaggedGuests(
  text: string,
): Array<{ name: string; role: string }> {
  const guests: Array<{ name: string; role: string }> = [];
  const seen = new Map<string, { name: string; role: string }>();

  for (const line of text.split("\n")) {
    const match = line.match(/^(?:(Im Interview):\s*)?([^,:]{4,60}),\s*([^,]{2,40})$/);
    if (!match) {
      continue;
    }

    const [, prefix, rawName, rawParty] = match;
    const name = rawName.trim();
    const party = rawParty.trim();

    if (!roleMentionsParty(party) || !looksLikePersonName(name)) {
      continue;
    }

    const role = prefix ? `${prefix}, ${party}` : party;
    const key = name.toLowerCase();
    const existing = seen.get(key);
    if (existing) {
      // "Im Interview" kann in einer späteren Zeile stehen (z.B. erst Bild-Alt-Text, dann Überschrift)
      if (prefix && !existing.role.startsWith(prefix)) {
        existing.role = role;
      }
      continue;
    }
    const guest = { name, role };
    seen.set(key, guest);
    guests.push(guest);
  }

  return guests;
}

/**
 * Führt Gäste aus mehreren Quellen zusammen (Reihenfolge der ersten Quelle bleibt erhalten).
 * Leere Rollen werden durch Rollen aus späteren Quellen ergänzt.
 */
export function mergeGuests(
  ...sources: Array<Array<{ name: string; role: string }>>
): Array<{ name: string; role: string }> {
  const merged = new Map<string, { name: string; role: string }>();

  for (const source of sources) {
    for (const guest of source) {
      const name = guest.name.replace(/\s+/g, " ").trim();
      if (!name) {
        continue;
      }
      const key = name.toLowerCase();
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, { name, role: guest.role.trim() });
      } else if (!existing.role && guest.role.trim()) {
        existing.role = guest.role.trim();
      }
    }
  }

  return Array.from(merged.values());
}

// Entfernt unsichtbare Unicode-Zeichen und korrigiert Bayernpartei → CSU (wie im Backend)
export function normalizePartyName(name: string | undefined | null): string | null {
  if (!name) {
    return null;
  }
  const cleaned = name.replace(/[­​‌‍⁠﻿]/g, "").trim();
  return cleaned === "Bayernpartei" ? "CSU" : cleaned;
}

// Gleiche Slug-Logik wie insertMultipleTvShowPoliticians im Backend
export function buildAbgeordnetenwatchUrl(politicianName: string): string {
  return `https://www.abgeordnetenwatch.de/profile/${politicianName
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/\s+/g, "-")}`;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isInteger(value));
}

export function parseImportConfirmPayload(body: unknown): ImportConfirmPayload {
  if (typeof body !== "object" || body === null) {
    throw new Error("Ungültige Anfrage.");
  }

  const { show_name, episode_date, tv_channel, politicians } = body as Record<
    string,
    unknown
  >;

  if (typeof show_name !== "string" || !show_name.trim()) {
    throw new Error("Sendung fehlt.");
  }
  if (typeof episode_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(episode_date)) {
    throw new Error("Sendedatum fehlt oder ist ungültig.");
  }
  if (tv_channel !== undefined && !isNullableString(tv_channel)) {
    throw new Error("Ungültiger Sender.");
  }
  if (!Array.isArray(politicians) || politicians.length === 0) {
    throw new Error("Keine Politiker ausgewählt.");
  }

  const parsedPoliticians = politicians.map((entry) => {
    const politician = (entry ?? {}) as Record<string, unknown>;
    if (
      typeof politician.politician_id !== "number" ||
      !Number.isInteger(politician.politician_id) ||
      typeof politician.politician_name !== "string" ||
      !politician.politician_name.trim() ||
      !isNullableNumber(politician.party_id ?? null) ||
      !isNullableString(politician.party_name ?? null) ||
      !isNullableString(politician.abgeordnetenwatch_url ?? null)
    ) {
      throw new Error("Ungültiger Politiker-Datensatz.");
    }

    return {
      politician_id: politician.politician_id,
      politician_name: politician.politician_name.trim(),
      party_id: (politician.party_id as number | null | undefined) ?? null,
      party_name: (politician.party_name as string | null | undefined) ?? null,
      abgeordnetenwatch_url:
        (politician.abgeordnetenwatch_url as string | null | undefined) ?? null,
    };
  });

  return {
    show_name: show_name.trim(),
    episode_date,
    tv_channel: tv_channel?.trim() || null,
    politicians: parsedPoliticians,
  };
}
