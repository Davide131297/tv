// Party colors + helpers, ported from the web project (frontend/types.ts).

export const PARTY_COLORS: Record<string, string> = {
  CDU: "#111827",
  CSU: "#1e40af",
  Union: "#1e293b",
  SPD: "#dc2626",
  FDP: "#eab308",
  "Die Linke": "#DF007D",
  Linke: "#DF007D",
  "BÜNDNIS 90/DIE GRÜNEN": "#22c55e",
  Grüne: "#22c55e",
  "Die Grünen": "#22c55e",
  AfD: "#2563eb",
  BSW: "#a16207",
  parteilos: "#6b7280",
  Parteilos: "#6b7280",
  ÖVP: "#63c3d0",
  "FREIE WÄHLER": "#f97316",
  Unbekannt: "#94a3b8",
};

const FALLBACK = "#94a3b8";

export function partyColor(name: string | null | undefined): string {
  if (!name) return FALLBACK;
  if (PARTY_COLORS[name]) return PARTY_COLORS[name];
  // loose match (e.g. "Bündnis 90/Die Grünen" casing)
  const upper = name.toUpperCase();
  const hit = Object.keys(PARTY_COLORS).find(
    (k) => k.toUpperCase() === upper,
  );
  return hit ? PARTY_COLORS[hit] : FALLBACK;
}

// Contrasting text color for a filled party chip.
export function partyTextColor(hex: string): string {
  const c = hex.replace("#", "");
  if (c.length !== 6) return "#ffffff";
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  // relative luminance
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#0f172a" : "#ffffff";
}

// Short initials for an avatar, e.g. "Robert Habeck" -> "RH".
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
