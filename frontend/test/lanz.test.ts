import { createBrowser, setupSimplePage } from "@/lib/browser-config";
import {
  LIST_URL,
  collectEpisodeLinks,
  extractEpisodeDescription,
} from "../crawler/lanz";
import { extractDateISO } from "@/lib/crawler-utils";

describe("Lanz Crawler Test", () => {
  it("should output date and description of first 3 episodes", async () => {
    const browser = await createBrowser();
    try {
      const listPage = await setupSimplePage(browser);

      console.log(`Navigating to list URL: ${LIST_URL}`);
      await listPage.goto(LIST_URL, {
        waitUntil: "networkidle2",
        timeout: 60000,
      });

      // Collect URLs - no "load more" needed for just first 3
      const episodeUrls = await collectEpisodeLinks(listPage);
      console.log(`Found ${episodeUrls.length} total episodes initially`);

      const firstThree = episodeUrls.slice(0, 3);

      expect(firstThree.length).toBeGreaterThan(0);

      console.log("\n=== First 3 Episodes Data ===\n");

      for (const url of firstThree) {
        const page = await setupSimplePage(browser);
        try {
          await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 30000,
          });

          // Wait a bit for dynamic content
          await new Promise((r) => setTimeout(r, 1000));

          const date = await extractDateISO(page, url);
          const description = await extractEpisodeDescription(page);

          console.log(
            `\n📺 [${date || "Kein Datum"}] ${url}\n` +
              `📝 ${description ? description.trim() : "Keine Beschreibung"}`
          );
        } catch (error) {
          console.error(`Error processing ${url}:`, error);
        } finally {
          await page.close();
        }
      }
    } finally {
      await browser.close();
    }
  });
});
