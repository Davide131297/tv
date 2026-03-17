import type { GuestWithRole } from "@/types";
import {
  insertMultipleTvShowPoliticians,
  getExistingEpisodeDates,
  insertMultipleShowLinks,
  insertEpisodePoliticalAreas,
  checkPolitician,
} from "@/lib/supabase-server-utils";
import { extractGuestsWithAI, getPoliticalArea } from "@/lib/ai-utils";

const ARD_AUDIO_BASE_URL = "https://www.ardaudiothek.de";
const ARD_GRAPHQL_URL = "https://api.ardaudiothek.de/graphql";
const MIOSGA_PROGRAM_SET_ID = "urn:ard:show:d6e5ba24e1508004";
const PAGE_SIZE = 12;

const PROGRAM_SET_EPISODES_QUERY = `
  query ProgramSetEpisodesQuery($id: ID!, $offset: Int!, $count: Int!) {
    result: programSet(id: $id) {
      items(
        offset: $offset
        first: $count
        filter: {
          isPublished: { equalTo: true }
          itemType: { notEqualTo: EVENT_LIVESTREAM }
        }
      ) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          title
          publishDate
          summary
          path
        }
      }
    }
  }
`;

interface ArdEpisodeNode {
  id: string;
  title: string;
  publishDate: string;
  summary: string | null;
  path: string;
}

interface ArdEpisodesResponse {
  data?: {
    result?: {
      items?: {
        pageInfo?: {
          hasNextPage?: boolean;
          endCursor?: string | null;
        };
        nodes?: ArdEpisodeNode[];
      };
    };
  };
  errors?: Array<{ message?: string }>;
}

interface MiosgaEpisode {
  url: string;
  date: string;
  title: string;
  description: string;
  guests: GuestWithRole[];
}

function buildEpisodeUrl(path: string): string {
  return path.startsWith("http") ? path : `${ARD_AUDIO_BASE_URL}${path}`;
}

function getEpisodeDate(publishDate: string): string {
  return publishDate.split("T")[0] ?? publishDate;
}

async function fetchEpisodeBatch(
  offset: number,
  count: number
): Promise<{ nodes: ArdEpisodeNode[]; hasNextPage: boolean }> {
  const url = new URL(ARD_GRAPHQL_URL);
  url.searchParams.set("query", PROGRAM_SET_EPISODES_QUERY);
  url.searchParams.set(
    "variables",
    JSON.stringify({
      id: MIOSGA_PROGRAM_SET_ID,
      offset,
      count,
    })
  );

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`ARD API Fehler: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as ArdEpisodesResponse;

  if (payload.errors?.length) {
    const messages = payload.errors
      .map((error) => error.message)
      .filter(Boolean)
      .join(", ");
    throw new Error(`ARD GraphQL Fehler: ${messages || "Unbekannter Fehler"}`);
  }

  const items = payload.data?.result?.items;

  return {
    nodes: items?.nodes ?? [],
    hasNextPage: items?.pageInfo?.hasNextPage ?? false,
  };
}

async function extractGuests(
  description: string,
  title: string
): Promise<GuestWithRole[]> {
  const sourceText = description || title;
  if (!sourceText) return [];

  const guestNames = await extractGuestsWithAI(sourceText);

  return [...new Set(guestNames)]
    .filter(Boolean)
    .map((name) => ({ name }));
}

async function fetchMiosgaEpisodes(
  latestDbDate: string | null
): Promise<MiosgaEpisode[]> {
  const episodes: MiosgaEpisode[] = [];
  let offset = 0;
  let hasNextPage = true;

  while (hasNextPage) {
    const { nodes, hasNextPage: nextPage } = await fetchEpisodeBatch(
      offset,
      PAGE_SIZE
    );

    if (nodes.length === 0) break;

    for (const node of nodes) {
      const episodeDate = getEpisodeDate(node.publishDate);

      if (latestDbDate && episodeDate <= latestDbDate) {
        return episodes;
      }

      const description = (node.summary || "").trim();
      const guests = await extractGuests(description, node.title);

      episodes.push({
        url: buildEpisodeUrl(node.path),
        date: episodeDate,
        title: node.title.trim(),
        description,
        guests,
      });
    }

    hasNextPage = nextPage;
    offset += PAGE_SIZE;
  }

  return episodes;
}

async function processPoliticians(
  episode: Pick<MiosgaEpisode, "guests">
): Promise<
  Array<{
    politicianId: number;
    politicianName: string;
    partyId?: number;
    partyName?: string;
  }>
> {
  const politicians = [];

  for (const guest of episode.guests) {
    const details = await checkPolitician(guest.name);

    if (details.isPolitician && details.politicianId && details.politicianName) {
      politicians.push({
        politicianId: details.politicianId,
        politicianName: details.politicianName,
        partyId: details.party,
        partyName: details.partyName,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return politicians;
}

async function processEpisodes(episodes: MiosgaEpisode[]): Promise<void> {
  let totalPoliticiansInserted = 0;
  let episodesProcessed = 0;
  const episodeLinksToInsert: Array<{ episodeUrl: string; episodeDate: string }> =
    episodes.map((episode) => ({
      episodeUrl: episode.url,
      episodeDate: episode.date,
    }));

  const totalEpisodeLinksInserted =
    episodeLinksToInsert.length > 0
      ? await insertMultipleShowLinks("Caren Miosga", episodeLinksToInsert)
      : 0;

  for (const episode of episodes) {
    try {
      if (episode.guests.length === 0) {
        console.log(`⚠️  Keine Gäste gefunden: ${episode.title} (${episode.date})`);
        continue;
      }

      const politicalAreaIds = await getPoliticalArea(
        episode.description || episode.title
      );
      const politicians = await processPoliticians(episode);
      const guestNames = episode.guests.map((guest) => guest.name);

      console.log(
        `📅 ${episode.date} | 👥 ${guestNames.join(", ")}${
          politicians.length > 0
            ? ` | ✅ Politiker: ${politicians
                .map((p) => `${p.politicianName} (${p.partyName || "?"})`)
                .join(", ")}`
            : ""
        }`
      );

      if (politicians.length > 0) {
        const inserted = await insertMultipleTvShowPoliticians(
          "Das Erste",
          "Caren Miosga",
          episode.date,
          politicians
        );
        totalPoliticiansInserted += inserted;
      }

      if (politicalAreaIds.length > 0) {
        await insertEpisodePoliticalAreas(
          "Caren Miosga",
          episode.date,
          politicalAreaIds
        );
      }

      episodesProcessed++;
    } catch (error) {
      console.error(
        `❌ Fehler beim Verarbeiten von Episode ${episode.date}:`,
        error
      );
    }
  }

  console.log(`Episoden verarbeitet: ${episodesProcessed}/${episodes.length}`);
  console.log(`Politiker eingefügt: ${totalPoliticiansInserted}`);
  console.log(`Episode-URLs eingefügt: ${totalEpisodeLinksInserted}`);
}

export async function crawlIncrementalCarenMiosgaEpisodes(): Promise<void> {
  console.log("🚀 Starte inkrementellen Caren Miosga Crawl...");

  const existingDates = await getExistingEpisodeDates("Caren Miosga");
  console.log(`📅 Bereits ${existingDates.size} Episoden in DB vorhanden`);

  const latestDbDate =
    existingDates.size > 0 ? [...existingDates].sort().reverse()[0] : null;
  const newEpisodes = await fetchMiosgaEpisodes(latestDbDate);

  if (newEpisodes.length === 0) {
    console.log("✅ Keine neuen Episoden gefunden – alles aktuell!");
    return;
  }

  const sortedEpisodes = [...newEpisodes].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  console.log(`\n🔄 ${sortedEpisodes.length} neue Episoden zu verarbeiten...\n`);
  await processEpisodes(sortedEpisodes);

  console.log(`\n=== Caren Miosga Zusammenfassung ===`);
}

export async function crawlAllCarenMiosgaEpisodes(): Promise<void> {
  console.log("🚀 Starte vollständigen Caren Miosga Crawl...");

  const allEpisodes = await fetchMiosgaEpisodes(null);

  if (allEpisodes.length === 0) {
    console.log("Keine Episoden gefunden.");
    return;
  }

  const sortedEpisodes = [...allEpisodes].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  console.log(`\n🔄 ${sortedEpisodes.length} Episoden zu verarbeiten...\n`);
  await processEpisodes(sortedEpisodes);

  console.log(`\n=== Caren Miosga FULL Zusammenfassung ===`);
}
