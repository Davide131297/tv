import { supabase } from "./supabase";

/**
 * Wendet die Standardfilter (Show, Jahr, Sender) auf eine Supabase-Query an.
 * Exkludiert dabei immer vordefinierte Shows (Phoenix, NTV).
 */
export function applyShowFilter(
  query: any,
  showName: string | null,
  year?: string | null,
  tv_channel?: string | null,
) {
  if (showName && showName !== "all") {
    query = query.eq("show_name", showName);
  }

  if (year && year !== "all") {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    query = query.gte("episode_date", startDate).lte("episode_date", endDate);
  }

  if (tv_channel && tv_channel !== "all") {
    query = query.eq("tv_channel", tv_channel);
  }

  query = query
    .neq("show_name", "Phoenix Runde")
    .neq("show_name", "Phoenix Persönlich")
    .neq("show_name", "Pinar Atalay")
    .neq("show_name", "Blome & Pfeffer");
    
  return query;
}

/**
 * Berechnet die Zusammenfassungs-Statistiken direkt auf dem Server.
 */
export async function getSummaryStats(params: {
  show?: string | null;
  year?: string | null;
  tv_channel?: string | null;
}) {
  let query = supabase.from("tv_show_politicians").select("episode_date, politician_name, party_name");

  query = applyShowFilter(query, params.show || null, params.year, params.tv_channel);

  const { data: allData, error } = await query;

  if (error) {
    throw error;
  }

  const total = allData?.length || 0;
  const episodes = new Set(
    allData?.map((d: { episode_date: string }) => d.episode_date),
  ).size;
  const politicians = new Set(
    allData?.map((d: { politician_name: string }) => d.politician_name),
  ).size;
  const parties = new Set(
    allData
      ?.filter((d: { party_name: string | null }) => d.party_name)
      .map((d: { party_name: string }) => d.party_name),
  ).size;

  return {
    total_appearances: total,
    total_episodes: episodes,
    unique_politicians: politicians,
    parties_represented: parties,
    show_name: params.show || "Alle Shows",
  };
}

export async function getDetailedAppearances(params: {
  show?: string | null;
  year?: string | null;
  tv_channel?: string | null;
  search?: string | null;
  limit?: number;
  offset?: number;
}) {
  const limit = params.limit || 20;
  const offset = params.offset || 0;

  let query = supabase
    .from("tv_show_politicians")
    .select(
      "show_name, episode_date, politician_name, party_name, abgeordnetenwatch_url",
    );

  query = applyShowFilter(query, params.show || null, params.year, params.tv_channel);

  if (params.search) {
    query = query.or(`politician_name.ilike.%${params.search}%,party_name.ilike.%${params.search}%`);
  }

  query = query
    .order("episode_date", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;

  let showLinksQuery = supabase
    .from("show_links")
    .select("episode_date, episode_url");
  
  if (params.show && params.show !== "all") {
    showLinksQuery = showLinksQuery.eq("show_name", params.show);
  }
  
  const { data: showLinksData } = await showLinksQuery;
  
  const urlMap = new Map();
  if (showLinksData) {
    showLinksData.forEach((link) => {
      urlMap.set(link.episode_date, link.episode_url);
    });
  }

  const dataWithUrls = data.map((row) => ({
    ...row,
    episode_url: urlMap.get(row.episode_date) || null,
  }));

  let countQuery = supabase
    .from("tv_show_politicians")
    .select("*", { count: "exact", head: true });
    
  countQuery = applyShowFilter(countQuery, params.show || null, params.year, params.tv_channel);
  if (params.search) {
    countQuery = countQuery.or(`politician_name.ilike.%${params.search}%,party_name.ilike.%${params.search}%`);
  }
  
  const { count: totalCount } = await countQuery;

  return {
    data: dataWithUrls,
    total: totalCount || 0,
  };
}

export async function getPartyStats(params: {
  show?: string | null;
  year?: string | null;
  tv_channel?: string | null;
}) {
  let query = supabase
    .from("tv_show_politicians")
    .select("party_name")
    .not("party_name", "is", null)
    .neq("party_name", "");

  query = applyShowFilter(query, params.show || null, params.year, params.tv_channel);

  const { data, error } = await query;
  if (error) throw error;

  const partyCount = new Map<string, number>();
  data.forEach((row) => {
    const party = row.party_name;
    partyCount.set(party, (partyCount.get(party) || 0) + 1);
  });

  return Array.from(partyCount.entries())
    .map(([party_name, count]) => ({ party_name, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getPoliticianRankings(params: {
  show?: string | null;
  year?: string | null;
  tv_channel?: string | null;
  limit?: number;
}) {
  let query = supabase
    .from("tv_show_politicians")
    .select("politician_name, party_name, show_name, episode_date");

  query = applyShowFilter(query, params.show || null, params.year, params.tv_channel);

  const { data, error } = await query;
  if (error) throw error;

  const politicianMap = new Map<string, any>();

  data.forEach((row: any) => {
    const politician = row.politician_name;
    if (!politicianMap.has(politician)) {
      politicianMap.set(politician, {
        politician_name: politician,
        party_name: row.party_name || "Unbekannt",
        total_appearances: 0,
        shows: new Set(),
        latest_appearance: row.episode_date,
        first_appearance: row.episode_date,
      });
    }

    const stats = politicianMap.get(politician)!;
    stats.total_appearances++;
    stats.shows.add(row.show_name);

    if (row.episode_date > stats.latest_appearance) {
      stats.latest_appearance = row.episode_date;
    }
    if (row.episode_date < stats.first_appearance) {
      stats.first_appearance = row.episode_date;
    }
  });

  const results = Array.from(politicianMap.values())
    .map(stats => ({
      ...stats,
      shows_appeared_on: stats.shows.size,
      show_names: Array.from(stats.shows),
    }))
    .sort((a, b) => b.total_appearances - a.total_appearances);

  return params.limit ? results.slice(0, params.limit) : results;
}

export async function getPoliticalAreas(params: {
  show?: string | null;
  year?: string | null;
  tv_channel?: string | null;
}) {
  let query = supabase.from("tv_show_episode_political_areas").select(`
      political_area_id,
      episode_date,
      political_area(
        id,
        label
      )
    `);

  if (params.show && params.show !== "all") {
    query = query.eq("show_name", params.show);
  } else {
    query = query
      .neq("show_name", "Pinar Atalay")
      .neq("show_name", "Phoenix Runde")
      .neq("show_name", "Phoenix Persönlich")
      .neq("show_name", "Blome & Pfeffer");
  }

  if (params.year && params.year !== "all") {
    query = query
      .gte("episode_date", `${params.year}-01-01`)
      .lte("episode_date", `${params.year}-12-31`);
  }

  if (params.tv_channel && params.tv_channel !== "all") {
    query = query.eq("tv_channel", params.tv_channel);
  }

  const { data, error } = await query;
  if (error) throw error;

  const areaCount = data.reduce((acc: any, row: any) => {
    const areaId = row.political_area_id;
    const areaLabel = row.political_area?.label || "Unbekannt";

    if (!acc[areaId]) {
      acc[areaId] = { label: areaLabel, count: 0 };
    }
    acc[areaId].count++;
    return acc;
  }, {});

  const stats = Object.entries(areaCount)
    .map(([areaId, data]: any) => ({
      area_id: parseInt(areaId),
      area_label: data.label,
      count: data.count,
    }))
    .sort((a, b) => b.count - a.count);

  return { stats, rows: data };
}

export async function getEpisodesWithPoliticians(params: {
  show: string;
  year?: string | null;
  limit?: number;
}) {
  let politiciansQuery = supabase
    .from("tv_show_politicians")
    .select("episode_date, politician_name, party_name")
    .eq("show_name", params.show)
    .order("episode_date", { ascending: false });

  if (params.limit) politiciansQuery = politiciansQuery.limit(500); // Higher limit for grouping

  if (params.year && params.year !== "all") {
    const startDate = `${params.year}-01-01`;
    const endDate = `${params.year}-12-31`;
    politiciansQuery = politiciansQuery.gte("episode_date", startDate).lte("episode_date", endDate);
  }

  const { data: politiciansData, error: polError } = await politiciansQuery;
  if (polError) throw polError;

  const { data: showLinksData } = await supabase
    .from("show_links")
    .select("episode_date, episode_url")
    .eq("show_name", params.show);

  const urlMap = new Map();
  if (showLinksData) {
    showLinksData.forEach((link) => {
      urlMap.set(link.episode_date, link.episode_url);
    });
  }

  const episodeMap = new Map<string, any[]>();
  politiciansData.forEach((result) => {
    if (!episodeMap.has(result.episode_date)) {
      episodeMap.set(result.episode_date, []);
    }
    episodeMap.get(result.episode_date)!.push({
      name: result.politician_name,
      party_name: result.party_name || "Unbekannt",
    });
  });

  const results = Array.from(episodeMap.entries()).map(([date, politicians]) => ({
    episode_date: date,
    politician_count: politicians.length,
    episode_url: urlMap.get(date) || null,
    politicians,
  }));

  return params.limit ? results.slice(0, params.limit) : results;
}

export async function getEpisodeStatistics(params: {
  show: string;
  year?: string | null;
}) {
  let query = supabase.from("tv_show_politicians").select("episode_date").eq("show_name", params.show);

  if (params.year && params.year !== "all") {
    const startDate = `${params.year}-01-01`;
    const endDate = `${params.year}-12-31`;
    query = query.gte("episode_date", startDate).lte("episode_date", endDate);
  }

  const { data, error } = await query;
  if (error) throw error;

  const episodeCount = new Map<string, number>();
  data.forEach((row) => {
    const date = row.episode_date;
    episodeCount.set(date, (episodeCount.get(date) || 0) + 1);
  });

  const episodeStats = Array.from(episodeCount.entries()).map(([date, count]) => ({
    episode_date: date,
    politician_count: count,
  }));

  const totalAppearances = data.length;
  const totalEpisodes = episodeStats.length;

  return {
    total_episodes: totalEpisodes,
    total_appearances: totalAppearances,
    episodes_with_politicians: totalEpisodes,
    average_politicians_per_episode: totalEpisodes > 0 ? parseFloat((totalAppearances / totalEpisodes).toFixed(2)) : 0,
    max_politicians_in_episode: totalEpisodes > 0 ? Math.max(...episodeStats.map((ep) => ep.politician_count)) : 0,
  };
}

export async function getPartyTimeline(params: {
  show?: string | null;
  year?: string | null;
  tv_channel?: string | null;
}) {
  const year = params.year || new Date().getFullYear().toString();

  let query = supabase
    .from("tv_show_politicians")
    .select("party_name, episode_date")
    .not("party_name", "is", null)
    .neq("party_name", "")
    .neq("show_name", "Phoenix Runde")
    .neq("show_name", "Phoenix Persönlich")
    .neq("show_name", "Pinar Atalay")
    .neq("show_name", "Blome & Pfeffer");

  if (year !== "all") {
    query = query.gte("episode_date", `${year}-01-01`).lte("episode_date", `${year}-12-31`);
  }

  if (params.show && params.show !== "all") {
    query = query.eq("show_name", params.show);
  }

  if (params.tv_channel && params.tv_channel !== "all") {
    query = query.eq("tv_channel", params.tv_channel);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = data || [];
  const monthlyStats: Record<string, Record<string, number>> = {};
  const allParties = new Set<string>();

  const pad2 = (n: number) => String(n).padStart(2, "0");
  const monthKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;

  const validDates = rows
    .map((r) => (r && r.episode_date ? new Date(r.episode_date) : null))
    .filter((d) => d instanceof Date && !Number.isNaN(d.getTime())) as Date[];

  const monthKeys: string[] = [];

  if (year === "all") {
    if (validDates.length === 0) return { data: [], parties: [], year };
    let minDate = new Date(Math.min(...validDates.map((d) => d.getTime())));
    let maxDate = new Date(Math.max(...validDates.map((d) => d.getTime())));
    minDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    maxDate = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
    const cur = new Date(minDate);
    while (cur <= maxDate) {
      monthKeys.push(monthKey(cur));
      cur.setMonth(cur.getMonth() + 1);
    }
  } else {
    for (let m = 1; m <= 12; m++) {
      monthKeys.push(`${year}-${pad2(m)}`);
    }
  }

  monthKeys.forEach((mk) => { monthlyStats[mk] = {}; });

  rows.forEach((row) => {
    if (!row || !row.episode_date) return;
    const d = new Date(row.episode_date);
    const mk = monthKey(d);
    const party = (row.party_name as string) || "Unbekannt";
    if (!monthlyStats[mk]) return;
    allParties.add(party);
    monthlyStats[mk][party] = (monthlyStats[mk][party] || 0) + 1;
  });

  const results = monthKeys.map((mk) => {
    const monthData: any = { month: mk };
    allParties.forEach((party) => {
      monthData[party] = monthlyStats[mk][party] || 0;
    });
    return monthData;
  });

  return { data: results, parties: Array.from(allParties), year };
}

export async function getDatabaseEntries(params: {
  page?: number;
  limit?: number;
}) {
  const page = params.page || 1;
  const limit = params.limit || 50;
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from("tv_show_politicians")
    .select("*", { count: "exact" })
    .range(offset, offset + limit - 1)
    .order("episode_date", { ascending: false })
    .neq("show_name", "Phoenix Runde")
    .neq("show_name", "Phoenix Persönlich")
    .neq("show_name", "Pinar Atalay")
    .neq("show_name", "Blome & Pfeffer");

  if (error) throw error;

  return {
    entries: data || [],
    totalCount: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}
