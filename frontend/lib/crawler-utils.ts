/**
 * Shared utilities for TV show crawlers (Frontend)
 * This file contains common functions used across multiple crawler implementations
 * to reduce code duplication and maintain consistency.
 */

import { Page } from "puppeteer";

// ============================================
// Date Parsing and Formatting Utilities
// ============================================

/**
 * German month names mapped to their numeric representation
 */
export const DE_MONTHS: Record<string, string> = {
  januar: "01",
  februar: "02",
  märz: "03",
  maerz: "03",
  april: "04",
  mai: "05",
  juni: "06",
  juli: "07",
  august: "08",
  september: "09",
  oktober: "10",
  november: "11",
  dezember: "12",
};

/**
 * Convert DD.MM.YYYY format to ISO date (YYYY-MM-DD)
 */
export function toISOFromDDMMYYYY(dateStr: string): string | null {
  const match = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;
  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, dd, mm, yyyy] = match;
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Parse ISO date from URL pattern like "vom-7-januar-2025"
 */
export function parseISODateFromUrl(url: string): string | null {
  const match = url.match(/vom-(\d{1,2})-([a-zäöü]+)-(\d{4})/i);
  if (!match) return null;
  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, d, mon, y] = match;
  const key = mon
    .normalize("NFD")
    .replace(/\u0308/g, "")
    .toLowerCase();
  const mm = DE_MONTHS[key];
  if (!mm) return null;
  const dd = d.padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

/**
 * Format date for database consistency (handles both DD.MM.YYYY and YYYY-MM-DD)
 */
export function formatDateForDB(dateStr: string): string {
  if (dateStr.includes(".")) {
    // Format: dd.mm.yyyy -> yyyy-mm-dd
    const [day, month, year] = dateStr.split(".");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  // Already in correct format
  return dateStr;
}

/**
 * Extract ISO date from page content or URL
 */
export async function extractDateISO(
  page: Page,
  episodeUrl: string,
): Promise<string | null> {
  // 1) Try JSON-LD structured data
  const ldDates: string[] = await page
    .$$eval('script[type="application/ld+json"]', (nodes) => {
      const fields = [
        "uploadDate",
        "datePublished",
        "dateCreated",
        "startDate",
        "endDate",
      ];
      const out: string[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function collect(obj: any) {
        if (!obj || typeof obj !== "object") return;
        for (const k of fields) {
          const v = obj[k];
          if (typeof v === "string") out.push(v);
        }
        if (Array.isArray(obj)) obj.forEach(collect);
        else Object.values(obj).forEach((v) => collect(v));
      }
      nodes.forEach((n) => {
        try {
          const txt = n.textContent || "";
          if (!txt.trim()) return;
          collect(JSON.parse(txt));
        } catch {}
      });
      return out;
    })
    .catch(() => []);

  for (const cand of ldDates) {
    const iso = cand.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    if (iso) return iso;
    const de = cand.match(/\b\d{2}\.\d{2}\.\d{4}\b/)?.[0];
    if (de) {
      const conv = toISOFromDDMMYYYY(de);
      if (conv) return conv;
    }
  }

  // 2) Try DD.MM.YYYY in page text
  const textDate = await page
    .$eval("main", (el) => {
      const t = el.textContent || "";
      const m = t.match(/\b\d{2}\.\d{2}\.\d{4}\b/);
      return m ? m[0] : null;
    })
    .catch(() => null);

  if (textDate) {
    const iso = toISOFromDDMMYYYY(textDate);
    if (iso) return iso;
  }

  // 3) Fallback to URL parsing
  return parseISODateFromUrl(episodeUrl);
}

// ============================================
// Guest Name Validation Utilities
// ============================================

/**
 * Check if a string appears to be a person's name
 * Must have at least two words and start with capital letters
 */
export function seemsLikePersonName(name: string): boolean {
  if (!/\S+\s+\S+/.test(name)) return false; // at least two words
  const re =
    /^[\p{Lu}][\p{L}\-]+(?:\s+(?:von|van|de|da|del|der|den|du|le|la|zu|zur|zum))?(?:\s+[\p{Lu}][\p{L}\-]+)+$/u;
  return re.test(name);
}

/**
 * Check if name is a known moderator/host (should be filtered out)
 */
export function isModeratorOrHost(name: string, showName?: string): boolean {
  const commonModerators = [
    "Markus Lanz",
    "Maybrit Illner",
    "Caren Miosga",
    "Sandra Maischberger",
    "Louis Klamroth",
    "Frank Plasberg",
    "Pinar Atalay",
    "Ingo Zamperoni",
  ];

  // Check against common moderators
  const isCommon = commonModerators.some((mod) =>
    name.toLowerCase().includes(mod.toLowerCase()),
  );
  if (isCommon) return true;

  // Check against show name if provided
  if (showName) {
    const showWords = showName.toLowerCase().split(/\s+/);
    const nameWords = name.toLowerCase().split(/\s+/);
    return showWords.some((word) => nameWords.includes(word));
  }

  return false;
}

// ============================================
// Browser Interaction Utilities
// ============================================

/**
 * Accept cookie banner if present
 */
export async function acceptCookieBanner(page: Page): Promise<void> {
  try {
    await page.waitForSelector('[data-testid="cmp-accept-all"]', {
      timeout: 3000,
    });
    await page.click('[data-testid="cmp-accept-all"]');
    console.log("Cookie-Banner akzeptiert");
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } catch {
    // Try alternative selectors
    try {
      await page.waitForSelector('button:contains("Akzeptieren")', {
        timeout: 1000,
      });
      await page.click('button:contains("Akzeptieren")');
      console.log("Cookie-Banner akzeptiert");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch {
      console.log("Kein Cookie-Banner gefunden oder bereits akzeptiert");
    }
  }
}

/**
 * Scroll page gently to trigger lazy-loaded content
 */
export async function gentleScroll(page: Page): Promise<void> {
  await page
    .evaluate(async () => {
      await new Promise<void>((res) => {
        let y = 0;
        const i = setInterval(() => {
          window.scrollBy(0, 500);
          if ((y += 500) > document.body.scrollHeight) {
            clearInterval(i);
            res();
          }
        }, 50);
      });
    })
    .catch(() => {});
}

// ============================================
// Episode Filtering Utilities
// ============================================

/**
 * Filter episodes to only include those newer than the latest DB date
 */
export function filterNewEpisodes<T extends { date: string }>(
  episodes: T[],
  latestDbDate: string | null,
): T[] {
  if (!latestDbDate) {
    console.log("📋 Keine Episoden in DB - alle sind neu");
    return episodes;
  }

  const newEpisodes = episodes.filter((ep) => ep.date > latestDbDate);
  console.log(
    `🆕 ${newEpisodes.length} neue Episoden gefunden (nach ${latestDbDate})`,
  );

  return newEpisodes.sort((a, b) => b.date.localeCompare(a.date)); // Newest first
}

// ============================================
// Common Type Definitions
// ============================================

export interface GuestWithRole {
  name: string;
  role?: string;
}

export interface GuestDetails {
  name: string;
  isPolitician: boolean;
  politicianId: number | null;
  politicianName?: string;
  party?: number;
  partyName?: string;
}

export interface EpisodeResult {
  episodeUrl: string;
  date: string | null;
  guests: string[];
  guestsDetailed: GuestDetails[];
  politicalAreaIds?: number[];
  description?: string;
}
