import { supabase } from "../supabase.js";

/**
 * Holt aktuelle Statistiken aus der Datenbank für den Chat-Kontext
 */
export async function getChatContext() {
  try {
    // 1. Statistiken pro Partei
    const { data: partyData } = await supabase
      .from("tv_show_politicians")
      .select("party_name")
      .not("party_name", "is", null)
      .neq("party_name", "")
      .neq("show_name", "Pinar Atalay");

    const partyStats = partyData?.reduce((acc: Record<string, number>, row) => {
      const party = row.party_name;
      acc[party] = (acc[party] || 0) + 1;
      return acc;
    }, {});

    // 2. Statistiken pro Show
    const { data: showData } = await supabase
      .from("tv_show_politicians")
      .select("show_name")
      .neq("show_name", "Pinar Atalay");

    const showStats = showData?.reduce((acc: Record<string, number>, row) => {
      const show = row.show_name;
      acc[show] = (acc[show] || 0) + 1;
      return acc;
    }, {});

    // 3. Top 10 Politiker
    const { data: politicianData } = await supabase
      .from("tv_show_politicians")
      .select("politician_name, party_name")
      .not("politician_name", "is", null)
      .neq("show_name", "Pinar Atalay");

    const politicianStats = politicianData?.reduce(
      (acc: Record<string, { count: number; party: string }>, row) => {
        const name = row.politician_name;
        if (!acc[name]) {
          acc[name] = { count: 0, party: row.party_name || "Unbekannt" };
        }
        acc[name].count++;
        return acc;
      },
      {}
    );

    const topPoliticians = Object.entries(politicianStats || {})
      .map(([name, data]) => ({
        name,
        count: data.count,
        party: data.party,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 4. Politische Themenbereiche
    const { data: areasData } = await supabase
      .from("tv_show_episode_political_areas")
      .select(
        `
        political_area_id,
        political_area(
          id,
          label
        )
      `
      )
      .neq("show_name", "Pinar Atalay");

    const areaStats = areasData?.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (acc: Record<string, number>, row: any) => {
        const label = row.political_area?.label || "Unbekannt";
        acc[label] = (acc[label] || 0) + 1;
        return acc;
      },
      {}
    );

    // 5. Letzte Sendungen
    const { data: recentShows } = await supabase
      .from("tv_show_politicians")
      .select("show_name, episode_date, politician_name, party_name")
      .neq("show_name", "Pinar Atalay")
      .order("episode_date", { ascending: false })
      .limit(20);

    // 6. Gesamtanzahl Einträge
    const { count: totalCount } = await supabase
      .from("tv_show_politicians")
      .select("*", { count: "exact", head: true })
      .neq("show_name", "Pinar Atalay");

    return {
      totalEntries: totalCount || 0,
      partyStats: Object.entries(partyStats || {})
        .map(([party, count]) => ({ party, count }))
        .sort((a, b) => b.count - a.count),
      showStats: Object.entries(showStats || {})
        .map(([show, count]) => ({ show, count }))
        .sort((a, b) => b.count - a.count),
      topPoliticians,
      politicalAreas: Object.entries(areaStats || {})
        .map(([area, count]) => ({ area, count }))
        .sort((a, b) => b.count - a.count),
      recentShows: recentShows || [],
    };
  } catch (error) {
    console.error("Fehler beim Laden des Chat-Kontexts:", error);
    return null;
  }
}

/**
 * Erstellt einen formatierten Kontext-String für die KI
 */
export function formatContextForAI(
  context: Awaited<ReturnType<typeof getChatContext>>
) {
  if (!context) {
    return "Keine Datenbank-Informationen verfügbar.";
  }

  return `
AKTUELLE DATENBANK-STATISTIKEN (Polittalk-Watcher):

📊 GESAMTSTATISTIK:
- Gesamtanzahl erfasster Auftritte: ${context.totalEntries}

👥 PARTEIEN (Top-Auftritte):
${context.partyStats
  .map((p, i) => `${i + 1}. ${p.party}: ${p.count} Auftritte`)
  .join("\n")}

📺 SENDUNGEN (Auftritte pro Show):
${context.showStats
  .map((s, i) => `${i + 1}. ${s.show}: ${s.count} Auftritte`)
  .join("\n")}

🌟 TOP 10 POLITIKER:
${context.topPoliticians
  .map((p, i) => `${i + 1}. ${p.name} (${p.party}): ${p.count} Auftritte`)
  .join("\n")}

📋 POLITISCHE THEMENBEREICHE:
${context.politicalAreas
  .map((a, i) => `${i + 1}. ${a.area}: ${a.count} Episoden`)
  .join("\n")}

📅 LETZTE SENDUNGEN:
${context.recentShows
  .map(
    (s) =>
      `- ${s.show_name} (${s.episode_date}): ${s.politician_name} (${
        s.party_name || "Parteilos"
      })`
  )
  .join("\n")}
  `.trim();
}
