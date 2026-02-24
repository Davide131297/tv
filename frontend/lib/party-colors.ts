/**
 * Central party color utilities.
 *
 * Tailwind CSS class mappings for rendering party badges with
 * background and text colors. This consolidates the previously
 * duplicated `getPartyColor` / `getPartyColorClass` functions
 * from PoliticianTable, LastShowTable, and other components.
 */

/** Returns Tailwind classes (bg + text) for a given party name. */
export function getPartyBadgeClasses(partyName: string): string {
  if (!partyName) return "bg-gray-400 text-white";

  // Remove zero-width formatting characters (like soft-hyphen \u00AD) and normalize whitespaces
  const normalized = partyName
    .replace(/[\u00AD\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const map: Record<string, string> = {
    CDU: "bg-black text-white",
    CSU: "bg-blue-800 text-white",
    SPD: "bg-red-600 text-white",
    FDP: "bg-yellow-400 text-black",
    "Die Linke": "bg-[#DF007D] text-white",
    "BÜNDNIS 90/DIE GRÜNEN": "bg-green-400 text-white",
    Grüne: "bg-green-600 text-white",
    AfD: "bg-blue-600 text-white",
    BSW: "bg-yellow-700 text-white",
    parteilos: "bg-gray-500 text-white",
    ÖVP: "bg-[#63c3d0] text-white",
    "FREIE WÄHLER": "bg-[#f97316] text-white",
  };

  if (map[normalized]) return map[normalized];

  // Case-insensitive fallback
  const upperNormalized = normalized.toUpperCase();
  const foundKey = Object.keys(map).find(
    (k) => k.toUpperCase() === upperNormalized,
  );
  if (foundKey) return map[foundKey];

  return "bg-gray-400 text-white";
}

/** Returns Tailwind classes for a given show name. */
export function getShowBadgeClasses(showName: string): string {
  const map: Record<string, string> = {
    "Markus Lanz": "bg-orange-100 text-orange-800",
    "Maybrit Illner": "bg-purple-100 text-purple-800",
    "Caren Miosga": "bg-green-100 text-green-800",
    Maischberger: "bg-teal-100 text-teal-800",
    "Hart aber fair": "bg-blue-100 text-blue-800",
    "Phoenix Runde": "bg-cyan-100 text-cyan-800",
    "Phoenix Persönlich": "bg-cyan-100 text-cyan-800",
    "Pinar Atalay": "bg-rose-100 text-pink-800",
    "Blome & Pfeffer": "bg-rose-100 text-pink-800",
  };
  return map[showName] || "bg-gray-100 text-gray-800";
}

/** Returns bordered Tailwind classes for a given party name (for tags/badges). */
export function getPartyBorderedBadgeClasses(partyName: string): string {
  if (!partyName) return "bg-gray-100 text-gray-800 border-gray-200";

  // Remove zero-width formatting characters (like soft-hyphen \u00AD) and normalize whitespaces
  const normalized = partyName
    .replace(/[\u00AD\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const map: Record<string, string> = {
    SPD: "bg-red-100 text-red-800 border-red-200",
    CDU: "bg-gray-800 text-white border-gray-800",
    CSU: "bg-blue-100 text-blue-800 border-blue-200",
    FDP: "bg-yellow-100 text-yellow-800 border-yellow-200",
    "Die Linke": "bg-purple-100 text-purple-800 border-purple-200",
    "BÜNDNIS 90/DIE GRÜNEN": "bg-green-100 text-green-900 border-green-200",
    Grüne: "bg-green-100 text-green-900 border-green-200",
    AfD: "bg-blue-50 text-blue-700 border-blue-200",
    Unbekannt: "bg-gray-100 text-gray-800 border-gray-200",
    ÖVP: "bg-cyan-100 text-cyan-800 border-cyan-200",
    "FREIE WÄHLER": "bg-orange-100 text-orange-800 border-orange-200",
    BSW: "bg-yellow-700 text-white border-yellow-800",
  };

  if (map[normalized]) return map[normalized];

  // Case-insensitive fallback
  const upperNormalized = normalized.toUpperCase();
  const foundKey = Object.keys(map).find(
    (k) => k.toUpperCase() === upperNormalized,
  );
  if (foundKey) return map[foundKey];

  return "bg-gray-100 text-gray-800 border-gray-200";
}
