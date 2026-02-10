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
  return map[partyName] || "bg-gray-400 text-white";
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
