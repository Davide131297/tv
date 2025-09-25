// test-episode.ts
import { describe, test, expect } from "@jest/globals";
import puppeteer, { Page } from "puppeteer";
import axios from "axios";

const EPISODE_URL =
  "https://www.zdf.de/video/talk/markus-lanz-114/markus-lanz-vom-3-september-2025-100";

// ---------- Helpers ----------
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

function nameBeforeComma(s: string) {
  return s.split(",")[0].trim();
}

function looksLikePerson(n: string) {
  if (!/\S+\s+\S+/.test(n)) return false; // mind. zwei Wörter
  // erlaubt Partikel
  return /^[\p{Lu}][\p{L}\-]+(?:\s+(?:von|van|de|da|del|der|den|zu|zur|zum))?(?:\s+[\p{Lu}][\p{L}\-]+)+$/u.test(
    n
  );
}

function splitFirstLast(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

function fromDDMMYYYY(s: string) {
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

function dateFromUrl(url: string): string | null {
  const m = url.match(/vom-(\d{1,2})-([a-zäöü]+)-(\d{4})/i);
  if (!m) return null;
  const d = m[1].padStart(2, "0");
  const key = m[2]
    .normalize("NFD")
    .replace(/\u0308/g, "")
    .toLowerCase();
  const mm = DE_MONTHS[key];
  return mm ? `${m[3]}-${mm}-${d}` : null;
}

async function checkPolitician(name: string) {
  const { first, last } = splitFirstLast(name);
  if (!first || !last) return null;
  const url = `https://www.abgeordnetenwatch.de/api/v2/politicians?first_name=${encodeURIComponent(
    first
  )}&last_name=${encodeURIComponent(last)}`;
  try {
    const { data } = await axios.get(url, { timeout: 10000 });
    return data?.data?.length ? data.data[0] : null;
  } catch {
    return null;
  }
}

// ---------- Core extraction ----------
async function extractDateISO(page: Page, url: string): Promise<string | null> {
  // JSON-LD
  const ld = await page
    .$$eval('script[type="application/ld+json"]', (nodes) => {
      const out: string[] = [];
      const fields = [
        "uploadDate",
        "datePublished",
        "dateCreated",
        "startDate",
        "endDate",
      ];
      function collect(o: any) {
        if (!o || typeof o !== "object") return;
        for (const f of fields) {
          const v = (o as any)[f];
          if (typeof v === "string") out.push(v);
        }
        if (Array.isArray(o)) o.forEach(collect);
        else Object.values(o).forEach(collect);
      }
      for (const n of nodes) {
        try {
          const j = JSON.parse(n.textContent || "");
          collect(j);
        } catch {}
      }
      return out;
    })
    .catch(() => []);
  for (const cand of ld) {
    const iso = cand.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    if (iso) return iso;
    const de = cand.match(/\b\d{2}\.\d{2}\.\d{4}\b/)?.[0];
    if (de) {
      const x = fromDDMMYYYY(de);
      if (x) return x;
    }
  }

  // im sichtbaren Text (DD.MM.YYYY)
  const textDate = await page
    .$eval("main", (el) => {
      const t = el.textContent || "";
      const m = t.match(/\b\d{2}\.\d{2}\.\d{4}\b/);
      return m ? m[0] : null;
    })
    .catch(() => null);
  if (textDate) {
    const x = fromDDMMYYYY(textDate);
    if (x) return x;
  }

  // URL-Fallback
  return dateFromUrl(url);
}

async function extractGuests(page: Page): Promise<string[]> {
  // Warte auf Main & hydrate
  await page.waitForSelector("main", { timeout: 15000 }).catch(() => {});
  // sanft scrollen (triggert lazy content)
  await page
    .evaluate(async () => {
      await new Promise<void>((res) => {
        let y = 0;
        const i = setInterval(() => {
          window.scrollBy(0, 400);
          if ((y += 400) > document.body.scrollHeight) {
            clearInterval(i);
            res();
          }
        }, 50);
      });
    })
    .catch(() => {});

  // Primär: typische Gäste-Section
  let names: string[] = await page
    .$$eval('section[tabindex="0"] p b, section.tdeoflm p b', (els) =>
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
  return names.filter(looksLikePerson);
}

// ---------- Runner ----------
async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
  );
  await page.setExtraHTTPHeaders({
    "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
  });

  console.log("Analysiere Episode:", EPISODE_URL);
  await page.goto(EPISODE_URL, { waitUntil: "networkidle2", timeout: 60000 });

  const [dateISO, guests] = await Promise.all([
    extractDateISO(page, EPISODE_URL),
    extractGuests(page),
  ]);

  const out = [];
  for (const name of guests) {
    const pol = await checkPolitician(name);
    out.push({
      date: dateISO,
      url: EPISODE_URL,
      name,
      isPolitician: !!pol,
      politicianId: pol?.id ?? null,
      politicianAttrs: pol?.attributes ?? null,
    });
  }

  console.table(
    out.map(({ date, name, isPolitician }) => ({ date, name, isPolitician }))
  );
  console.dir(out, { depth: null });

  await browser.close();
}

// Jest test
describe("Episode Extraction", () => {
  test("should extract date and guests from episode page", async () => {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
    });

    console.log("Analysiere Episode:", EPISODE_URL);
    await page.goto(EPISODE_URL, { waitUntil: "networkidle2", timeout: 60000 });

    const [dateISO, guests] = await Promise.all([
      extractDateISO(page, EPISODE_URL),
      extractGuests(page),
    ]);

    const results = [];
    for (const name of guests) {
      const pol = await checkPolitician(name);
      results.push({
        date: dateISO,
        url: EPISODE_URL,
        name,
        isPolitician: !!pol,
        politicianId: pol?.id ?? null,
        politicianAttrs: pol?.attributes ?? null,
      });
    }

    console.table(
      results.map(({ date, name, isPolitician }) => ({
        date,
        name,
        isPolitician,
      }))
    );

    await browser.close();

    // Basic assertions
    expect(dateISO).toBeTruthy();
    expect(guests.length).toBeGreaterThan(0);
    expect(results.length).toBe(guests.length);
  }, 120000); // 2 minute timeout for web scraping
});
