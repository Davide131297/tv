import axios from "axios";
import * as cheerio from "cheerio";
import { seemsLikePersonName, isModeratorOrHost } from "./crawler-utils.js";

const GRAPHQL_URL = "https://api.zdf.de/graphql";
const API_AUTH_TOKEN = "Bearer aa3noh4ohz9eeboo8shiesheec9ciequ9Quah7el";
const ZDF_APP_ID = "ffw-mt-web-036df51e";
const PERSISTED_QUERY_HASH = "81237cafa2f0176d351b21bff20cdcb5e5755092a0bd42d7271018c5440a4493";

export interface ZdfEpisode {
  id: string;
  canonical: string;
  title: string;
  sharingUrl: string;
  editorialDate: string;
  description?: string;
}

export interface ZdfSeasonResult {
  seasonTitle: string;
  seasonNumber: number;
  countEpisodes: number;
  episodes: ZdfEpisode[];
  hasNextPage: boolean;
  endCursor: string | null;
}

/**
 * Fetch list of episodes for a given show season using ZDF's GraphQL API.
 */
export async function fetchZdfSeasonEpisodes(
  canonical: string,
  seasonIndex: number = 0,
  episodesAfter?: string
): Promise<ZdfSeasonResult> {
  const variables: Record<string, any> = {
    canonical,
    seasonIndex,
    episodesPageSize: 24,
    seasonFilterBy: {
      availableStreamTypesIn: ["VOD"]
    },
    episodesSortBy: {
      field: "EPISODE_NUMBER",
      direction: "DESC"
    },
    episodesFilterBy: {
      availableStreamTypeIn: ["VOD"]
    }
  };

  if (episodesAfter) {
    variables.episodesAfter = episodesAfter;
  }

  const extensions = {
    clientLibrary: {
      name: "@apollo/client",
      version: "4.1.9"
    },
    persistedQuery: {
      version: 1,
      sha256Hash: PERSISTED_QUERY_HASH
    }
  };

  const response = await axios.get(GRAPHQL_URL, {
    params: {
      operationName: "seasonByCanonical",
      variables: JSON.stringify(variables),
      extensions: JSON.stringify(extensions)
    },
    headers: {
      "api-auth": API_AUTH_TOKEN,
      "zdf-app-id": ZDF_APP_ID,
      "Accept": "application/graphql-response+json,application/json;q=0.9",
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "apollo-require-preflight": "true",
      "x-apollo-operation-name": "seasonByCanonical"
    },
    timeout: 15000
  });

  const data = response.data;
  if (!data?.data?.smartCollectionByCanonical) {
    throw new Error(`Invalid GraphQL response format: ${JSON.stringify(data).substring(0, 500)}`);
  }

  const collection = data.data.smartCollectionByCanonical;
  const season = collection.seasons?.nodes?.[0];
  if (!season) {
    throw new Error(`No season found in smartCollectionByCanonical for canonical "${canonical}"`);
  }

  const episodesNodes = season.episodes?.nodes || [];
  const episodes: ZdfEpisode[] = episodesNodes.map((ep: any) => ({
    id: ep.id,
    canonical: ep.canonical,
    title: ep.title,
    sharingUrl: ep.sharingUrl,
    editorialDate: ep.editorialDate,
    description: ep.teaser?.description || undefined
  }));

  const pageInfo = season.episodes?.pageInfo;

  return {
    seasonTitle: season.title || "",
    seasonNumber: season.number || 0,
    countEpisodes: season.countEpisodes || 0,
    episodes,
    hasNextPage: !!pageInfo?.hasNextPage,
    endCursor: pageInfo?.endCursor || null
  };
}

/**
 * Fetch raw HTML of a ZDF episode page.
 */
export async function fetchZdfEpisodeHtml(url: string): Promise<string> {
  const response = await axios.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "Accept-Language": "de-DE,de;q=0.9",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    },
    timeout: 20000
  });
  return response.data;
}

export interface ZdfParsedEpisodeDetails {
  guests: { name: string; role?: string }[];
  description: string | null;
}

/**
 * Parse ZDF episode HTML using Cheerio to extract description and guest list.
 */
export function parseZdfEpisodeHtml(
  show: "lanz" | "illner",
  html: string
): ZdfParsedEpisodeDetails {
  const $ = cheerio.load(html);
  
  // 1) Description extraction
  let description: string | null = null;
  if (show === "lanz") {
    const selectors = [
      'p[data-testid="short-description"]',
      "p.daltwma",
      "p.dfv1fla",
      "section p",
    ];
    for (const selector of selectors) {
      $(selector).each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 20 && !text.includes("Abspielen") && !text.includes("Merken")) {
          description = text;
          return false; // break
        }
      });
      if (description) break;
    }
  } else {
    // Maybrit Illner description from guest section paragraphs/divs (excluding title and guest lists)
    const guestSection = $('section[tabindex="0"], section.tdeoflm');
    if (guestSection.length) {
      const paragraphs: string[] = [];
      guestSection.find(".p4fzw5k").each((_, el) => {
        paragraphs.push($(el).text().trim());
      });
      
      const cleanParagraphs = paragraphs.filter(text => {
        if (text.includes("Zu Gast") || text.includes("Podcast zum Nachhören") || text.startsWith("Armin Laschet")) {
          return false;
        }
        return text.length > 30;
      });
      
      if (cleanParagraphs.length > 0) {
        description = cleanParagraphs.join(" ");
      }
    }
  }

  // 2) Guests extraction
  const guests: { name: string; role?: string }[] = [];

  if (show === "lanz") {
    const selectorsToTry = [
      'section[tabindex="0"] p b',
      'section.tdeoflm p b',
      'section[tabindex="0"] p strong',
      'section.tdeoflm p strong',
      'main b',
      'main strong'
    ];
    
    $(selectorsToTry.join(", ")).each((_, el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();
      if (!text) return;
      
      // Separate name and role by first comma
      const commaIndex = text.indexOf(",");
      let name = text;
      let role: string | undefined = undefined;
      if (commaIndex !== -1) {
        name = text.substring(0, commaIndex).trim();
        role = text.substring(commaIndex + 1).trim();
      }
      
      // Clean up role parentheses
      const parenMatch = name.match(/\(([^)]+)\)/);
      if (parenMatch) {
        role = role ? `${parenMatch[1]}, ${role}` : parenMatch[1];
        name = name.replace(/\(([^)]+)\)/, "").trim();
      }

      if (seemsLikePersonName(name) && !isModeratorOrHost(name, "Markus Lanz")) {
        if (!guests.some(g => g.name === name)) {
          guests.push({ name, role });
        }
      }
    });
  } else {
    // Maybrit Illner guests from lists inside the guest section
    const listItems = $('section[tabindex="0"] li, section.tdeoflm li');
    listItems.each((_, el) => {
      const fullText = $(el).text().replace(/\s+/g, " ").trim();
      if (!fullText) return;
      
      let name = fullText;
      let role: string | undefined = undefined;
      
      const commaIndex = fullText.indexOf(",");
      const parenIndex = fullText.indexOf("(");
      
      let splitIndex = -1;
      if (commaIndex !== -1 && parenIndex !== -1) {
        splitIndex = Math.min(commaIndex, parenIndex);
      } else if (commaIndex !== -1) {
        splitIndex = commaIndex;
      } else if (parenIndex !== -1) {
        splitIndex = parenIndex;
      }
      
      if (splitIndex !== -1) {
        name = fullText.substring(0, splitIndex).trim();
        role = fullText.substring(splitIndex).trim();
        // Clean up role parentheses and commas
        role = role.replace(/^\(([^)]+)\)/, "$1").replace(/^,\s*/, "").replace(/^[,\(\s]+|[,\)\s]+$/g, "").trim();
      }
      
      if (seemsLikePersonName(name) && !isModeratorOrHost(name, "Maybrit Illner")) {
        if (!guests.some(g => g.name === name)) {
          guests.push({ name, role });
        }
      }
    });

    // Fallbacks for Illner guests if list was empty
    if (!guests.length) {
      const alt = $('main img[alt*="Maybrit Illner"], main img[alt*="Illner"]').attr("alt") || "";
      if (alt && alt.includes(":")) {
        const list = alt.split(":")[1].split(",").map(s => s.trim()).filter(Boolean);
        list.forEach(guestName => {
          if (seemsLikePersonName(guestName) && !isModeratorOrHost(guestName, "Maybrit Illner")) {
            guests.push({ name: guestName });
          }
        });
      }
    }
  }

  return { guests, description };
}
