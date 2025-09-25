import puppeteer, { Page } from "puppeteer";
import pLimit from "p-limit";
import axios from "axios";
import { AbgeordnetenwatchPolitician } from "../types/abgeordnetenwatch";

const LIST_URL = "https://www.zdf.de/talk/markus-lanz-114";

// ---------------- Types ----------------

interface GuestDetails {
  name: string;
  isPolitician: boolean;
  politicianId: string | null;
  party?: number;
}

interface EpisodeResult {
  episodeUrl: string;
  date: string | null;
  guests: string[];
  guestsDetailed: GuestDetails[];
}

// ---------------- Lade mehr / Episoden-Links ----------------

async function clickLoadMoreUntilDone(page: Page, maxClicks = 50) {
  for (let i = 0; i < maxClicks; i++) {
    const hasButton = await page.$('button[data-testid="pagination-button"]');
    if (!hasButton) break;

    const prevCount = await page
      .$$eval("ol.c19e06ji > li", (els) => els.length)
      .catch(() => 0);

    await Promise.all([
      page.click('button[data-testid="pagination-button"]'),
      page
        .waitForNetworkIdle({ idleTime: 600, timeout: 15000 })
        .catch(() => {}),
    ]);

    const grew = await page
      .waitForFunction(
        (sel, prev) => document.querySelectorAll(sel).length > prev,
        { timeout: 5000 },
        "ol.c19e06ji > li",
        prevCount
      )
      .catch(() => null);

    if (!grew) break;
  }
}

async function collectEpisodeLinks(page: Page) {
  const urls = await page.$$eval(
    'a[href^="/video/talk/markus-lanz-114/"]',
    (as) => Array.from(new Set(as.map((a) => (a as HTMLAnchorElement).href)))
  );
  return urls;
}

// ---------------- Name-Filter / Heuristik ----------------

function seemsLikePersonName(name: string) {
  if (!/\S+\s+\S+/.test(name)) return false; // mind. zwei Wörter
  const re =
    /^[\p{Lu}][\p{L}\-]+(?:\s+(?:von|van|de|da|del|der|den|du|le|la|zu|zur|zum))?(?:\s+[\p{Lu}][\p{L}\-]+)+$/u;
  return re.test(name);
}

// ---------------- Datum-Helfer ----------------

function toISOFromDDMMYYYY(d: string) {
  const m = d.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  const [_, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

const DE_MONTHS: Record<string, string> = {
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

function parseISODateFromUrl(url: string): string | null {
  const m = url.match(/vom-(\d{1,2})-([a-zäöü]+)-(\d{4})/i);
  if (!m) return null;
  let [_, d, mon, y] = m;
  const key = mon
    .normalize("NFD")
    .replace(/\u0308/g, "")
    .toLowerCase();
  const mm = DE_MONTHS[key];
  if (!mm) return null;
  const dd = d.padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

async function extractDateISO(
  page: Page,
  episodeUrl: string
): Promise<string | null> {
  // 1) JSON-LD
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

  // 2) DD.MM.YYYY im Text
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

  // 3) URL-Fallback
  return parseISODateFromUrl(episodeUrl);
}

// ---------------- Politiker-Check ----------------

function splitFirstLast(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ").trim() };
}

async function checkPolitician(name: string): Promise<GuestDetails> {
  const { first, last } = splitFirstLast(name);
  if (!first || !last) {
    return {
      name,
      isPolitician: false,
      politicianId: null,
    };
  }

  const url = `https://www.abgeordnetenwatch.de/api/v2/politicians?first_name=${encodeURIComponent(
    first
  )}&last_name=${encodeURIComponent(last)}`;

  try {
    const { data } = await axios.get(url, { timeout: 10000 });
    const hit: AbgeordnetenwatchPolitician = data?.data?.[0];
    return {
      name,
      isPolitician: !!hit,
      politicianId: hit?.id ? String(hit.id) : null,
      party: hit?.party?.id,
    };
  } catch {
    return {
      name,
      isPolitician: false,
      politicianId: null,
    };
  }
}

// ---------------- Gäste aus Episode ----------------

async function extractGuestsFromEpisode(page: Page, episodeUrl: string) {
  await page.goto(episodeUrl, { waitUntil: "networkidle2", timeout: 60000 });
  await page.setExtraHTTPHeaders({
    "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
  });
  await page.waitForSelector("main", { timeout: 15000 }).catch(() => {});

  // sanft scrollen, um Lazy-Content zu triggern
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

  // Primär: typische Gäste-Sektion
  let names: string[] = await page
    .$$eval('section[tabindex="0"] p b, section.tdeoflm p b', (els) =>
      Array.from(
        new Set(
          els
            .map((el) => (el.textContent || "").replace(/\s+/g, " ").trim())
            .filter(Boolean)
            .filter((t) => t.includes(",")) // "Name, Rolle"
            .map((t) => t.split(",")[0].trim())
        )
      )
    )
    .catch(() => []);

  // Fallback 1: alle <b> unter <main>, streng filtern
  if (!names.length) {
    names = await page
      .$$eval("main b", (els) =>
        Array.from(
          new Set(
            els
              .map((el) => (el.textContent || "").replace(/\s+/g, " ").trim())
              .filter(Boolean)
              .filter((t) => t.includes(","))
              .map((t) => t.split(",")[0].trim())
          )
        )
      )
      .catch(() => []);
  }

  // Fallback 2: alt-Text des großen Bildes (dort stehen oft die Namen, kommasepariert)
  if (!names.length) {
    const alt = await page
      .$eval(
        'main img[alt*="Markus Lanz"]',
        (el) => el.getAttribute("alt") || ""
      )
      .catch(() => "");
    if (alt && alt.includes(":")) {
      const list = alt
        .split(":")[1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      names = Array.from(new Set(list));
    }
  }

  // final: Heuristik
  return names.filter(seemsLikePersonName);
}

// ---------------- Hauptlauf ----------------

export async function crawlAllMarkusLanzEpisodes(): Promise<EpisodeResult[]> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    );
    await page.setViewport({ width: 1280, height: 1000 });
    await page.setExtraHTTPHeaders({
      "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
    });
    await page.goto(LIST_URL, { waitUntil: "networkidle2", timeout: 60000 });

    await clickLoadMoreUntilDone(page);

    const episodeUrls = await collectEpisodeLinks(page);
    if (!episodeUrls.length) {
      console.warn("Keine Episoden-Links gefunden (clientseitig).");
      return [];
    }

    const limit = pLimit(6); // Parallelität für Seiten
    const apiLimit = pLimit(4); // Parallelität für API-Aufrufe (abgeordnetenwatch)

    // Dedup nach Datum
    const byDate = new Map<string, EpisodeResult>();

    const results = await Promise.all(
      episodeUrls.map((url) =>
        limit(async () => {
          const p = await browser.newPage();
          try {
            const [guests, date] = await Promise.all([
              extractGuestsFromEpisode(p, url),
              extractDateISO(p, url),
            ]);

            // Politiker-Check je Gast
            const guestsDetailed = await Promise.all(
              guests.map((name) => apiLimit(() => checkPolitician(name)))
            );

            const res: EpisodeResult = {
              episodeUrl: url,
              date,
              guests,
              guestsDetailed,
            };

            // Dedup: pro Datum nur ein Eintrag, ggf. den mit mehr Gästen behalten
            if (date) {
              const prev = byDate.get(date);
              if (!prev || guests.length > prev.guests.length) {
                byDate.set(date, res);
              }
            }

            console.log({ episodeUrl: url, date, guests });
            return res;
          } catch (e) {
            console.warn("Fehler bei Episode:", url, e);
            return {
              episodeUrl: url,
              date: null,
              guests: [],
              guestsDetailed: [],
            };
          } finally {
            await p.close().catch(() => {});
          }
        })
      )
    );

    const finalResults =
      byDate.size > 0 ? Array.from(byDate.values()) : results;

    console.log("Fertig. Anzahl Episoden (dedupliziert):", finalResults.length);
    console.dir(finalResults, { depth: null });

    return finalResults;
  } finally {
    await browser.close().catch(() => {});
  }
}
