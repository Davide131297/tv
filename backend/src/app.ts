import express from "express";
import dotenv from "dotenv";

// Crawler imports
import CrawlLanz from "./crawler/lanz.js";
import {
  crawlNewMaybritIllnerEpisodes,
  crawlAllMaybritIllnerEpisodes,
} from "./crawler/illner.js";
import crawlHartAberFair from "./crawler/haf.js";
import {
  crawlNewMaischbergerEpisodes,
  crawlMaischbergerFull,
  clearMaischbergerData,
} from "./crawler/maischberger.js";
import {
  crawlIncrementalCarenMiosgaEpisodes,
  crawlAllCarenMiosgaEpisodes,
} from "./crawler/miosga.js";
import CrawlPinarAtalay from "./crawler/atalay.js";
import CrawlPhoenixRunde from "./crawler/phoenix-runde.js";
import CrawlPhoenixPersoenlich from "./crawler/phoenix-persoenlich.js";
import CrawlBlomePfeffer from "./crawler/blome-pfeffer.js";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

// ============================================
// Authentication Middleware
// ============================================
function authMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  const apiKey = process.env.CRAWL_API_KEY;

  if (!apiKey) {
    console.error("❌ CRAWL_API_KEY nicht konfiguriert");
    res.status(500).json({ error: "Server configuration error" });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.substring(7);
  if (token !== apiKey) {
    res.status(403).json({ error: "Invalid API key" });
    return;
  }

  next();
}

// Apply auth middleware to all /api/crawl routes
app.use("/api/crawl", authMiddleware);

// ============================================
// Health Check
// ============================================
app.get("/", (req, res) => {
  res.json({
    status: "Backend is running",
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// Crawler API Routes
// ============================================

// POST /api/crawl/all - Run all crawlers sequentially
app.post("/api/crawl/all", async (req, res) => {
  console.log("🚀 Starte alle Crawler...");
  const startTime = Date.now();

  const results: Record<string, { success: boolean; error?: string }> = {};

  const runCrawler = async (name: string, crawlerFn: () => Promise<any>) => {
    try {
      console.log(`\n🔄 Starte ${name} Crawler...`);
      await crawlerFn();
      results[name] = { success: true };
      console.log(`✅ ${name} Crawler abgeschlossen`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      results[name] = { success: false, error: errorMessage };
      console.error(`❌ ${name} Crawler fehlgeschlagen:`, errorMessage);
    }
  };

  await runCrawler("Markus Lanz", CrawlLanz);
  await runCrawler("Maybrit Illner", crawlNewMaybritIllnerEpisodes);
  await runCrawler("Hart aber Fair", crawlHartAberFair);
  await runCrawler("Maischberger", crawlNewMaischbergerEpisodes);
  await runCrawler("Caren Miosga", crawlIncrementalCarenMiosgaEpisodes);
  await runCrawler("Pinar Atalay", CrawlPinarAtalay);
  await runCrawler("Phoenix Runde", CrawlPhoenixRunde);
  await runCrawler("Phoenix Persönlich", CrawlPhoenixPersoenlich);
  await runCrawler("Blome & Pfeffer", CrawlBlomePfeffer);

  const durationMs = Date.now() - startTime;
  const durationMin = Math.floor(durationMs / 60000);
  const durationSec = Math.floor((durationMs % 60000) / 1000);

  const successful = Object.values(results).filter((r) => r.success).length;
  const failed = Object.values(results).filter((r) => !r.success).length;

  console.log(
    `\n🎉 Alle Crawler abgeschlossen in ${durationMin}m ${durationSec}s`,
  );
  console.log(`✅ Erfolgreich: ${successful} | ❌ Fehlgeschlagen: ${failed}`);

  res.json({
    message: "All crawlers completed",
    duration: `${durationMin}m ${durationSec}s`,
    successful,
    failed,
    results,
  });
});

// POST /api/crawl/lanz
app.post("/api/crawl/lanz", async (req, res) => {
  try {
    const result = await CrawlLanz();
    res.json(result);
  } catch (error) {
    console.error("❌ Lanz Crawler Fehler:", error);
    res.status(500).json({ error: "Lanz crawler failed" });
  }
});

// POST /api/crawl/illner
app.post("/api/crawl/illner", async (req, res) => {
  try {
    const { runType } = req.body || {};

    if (runType === "full") {
      await crawlAllMaybritIllnerEpisodes();
      res.json({ message: "Illner full crawl completed" });
    } else {
      await crawlNewMaybritIllnerEpisodes();
      res.json({ message: "Illner incremental crawl completed" });
    }
  } catch (error) {
    console.error("❌ Illner Crawler Fehler:", error);
    res.status(500).json({ error: "Illner crawler failed" });
  }
});

// POST /api/crawl/haf
app.post("/api/crawl/haf", async (req, res) => {
  try {
    const result = await crawlHartAberFair();
    res.json(result);
  } catch (error) {
    console.error("❌ Hart aber Fair Crawler Fehler:", error);
    res.status(500).json({ error: "Hart aber Fair crawler failed" });
  }
});

// POST /api/crawl/maischberger
app.post("/api/crawl/maischberger", async (req, res) => {
  try {
    const { runType } = req.body || {};

    if (runType === "full") {
      await crawlMaischbergerFull();
      res.json({ message: "Maischberger full crawl completed" });
    } else {
      await crawlNewMaischbergerEpisodes();
      res.json({ message: "Maischberger incremental crawl completed" });
    }
  } catch (error) {
    console.error("❌ Maischberger Crawler Fehler:", error);
    res.status(500).json({ error: "Maischberger crawler failed" });
  }
});

// DELETE /api/crawl/maischberger
app.delete("/api/crawl/maischberger", async (req, res) => {
  try {
    const deletedCount = await clearMaischbergerData();
    res.json({
      message: `${deletedCount} Maischberger entries deleted`,
      deletedCount,
    });
  } catch (error) {
    console.error("❌ Maischberger Lösch-Fehler:", error);
    res.status(500).json({ error: "Maischberger data deletion failed" });
  }
});

// POST /api/crawl/miosga
app.post("/api/crawl/miosga", async (req, res) => {
  try {
    const { runType } = req.body || {};

    if (runType === "full") {
      await crawlAllCarenMiosgaEpisodes();
      res.json({ message: "Miosga full crawl completed" });
    } else {
      await crawlIncrementalCarenMiosgaEpisodes();
      res.json({ message: "Miosga incremental crawl completed" });
    }
  } catch (error) {
    console.error("❌ Miosga Crawler Fehler:", error);
    res.status(500).json({ error: "Miosga crawler failed" });
  }
});

// POST /api/crawl/atalay
app.post("/api/crawl/atalay", async (req, res) => {
  try {
    const result = await CrawlPinarAtalay();
    res.json(result);
  } catch (error) {
    console.error("❌ Pinar Atalay Crawler Fehler:", error);
    res.status(500).json({ error: "Pinar Atalay crawler failed" });
  }
});

// POST /api/crawl/phoenix-runde
app.post("/api/crawl/phoenix-runde", async (req, res) => {
  try {
    const result = await CrawlPhoenixRunde();
    res.json(result);
  } catch (error) {
    console.error("❌ Phoenix Runde Crawler Fehler:", error);
    res.status(500).json({ error: "Phoenix Runde crawler failed" });
  }
});

// POST /api/crawl/phoenix-persoenlich
app.post("/api/crawl/phoenix-persoenlich", async (req, res) => {
  try {
    const result = await CrawlPhoenixPersoenlich();
    res.json(result);
  } catch (error) {
    console.error("❌ Phoenix Persönlich Crawler Fehler:", error);
    res.status(500).json({ error: "Phoenix Persönlich crawler failed" });
  }
});

// POST /api/crawl/blome-pfeffer
app.post("/api/crawl/blome-pfeffer", async (req, res) => {
  try {
    const result = await CrawlBlomePfeffer();
    res.json(result);
  } catch (error) {
    console.error("❌ Blome & Pfeffer Crawler Fehler:", error);
    res.status(500).json({ error: "Blome & Pfeffer crawler failed" });
  }
});

// ============================================
// Start Server
// ============================================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server läuft auf Port ${PORT}`);
});

export default app;
