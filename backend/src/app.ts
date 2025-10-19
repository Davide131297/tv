import express from "express";
import dotenv from "dotenv";
import cron from "node-cron";
import CrawlLanz from "./crawler/lanz.js";
import { crawlNewMaybritIllnerEpisodes } from "./crawler/illner.js";
import { crawlNewMaischbergerEpisodes } from "./crawler/maischberger.js";
import { crawlIncrementalCarenMiosgaEpisodes } from "./crawler/miosga.js";
import crawlHartAberFair from "./crawler/haf.js";
import CrawlPinarAtalay from "./crawler/atalay.js";
import pino from "pino";
const logger = pino();

dotenv.config();

const app = express();
const PORT = process.env.PORT || 9000;

// Lanz: Mittwochs, Donnerstags und Freitags um 2 Uhr morgens
cron.schedule("0 2 * * 3,4,5", async () => {
  logger.info("Starte Lanz Crawl...");
  await CrawlLanz();
  logger.info("Lanz Crawl abgeschlossen.");
});

// Hart aber Fair: Dienstags um 1 Uhr morgens
cron.schedule("0 1 * * 2", async () => {
  logger.info("Starte Hart aber Fair Crawl...");
  await crawlHartAberFair();
  logger.info("Hart aber Fair Crawl abgeschlossen.");
});

// Illner: Freitags um 2 Uhr morgens
cron.schedule("0 2 * * 5", async () => {
  logger.info("Starte Illner Crawl...");
  await crawlNewMaybritIllnerEpisodes();
  logger.info("Illner Crawl abgeschlossen.");
});

// Maischberger: Mittwochs und Donnerstags um 2 Uhr morgens
cron.schedule("0 2 * * 3,4", async () => {
  logger.info("Starte Maischberger Crawl...");
  await crawlNewMaischbergerEpisodes();
  logger.info("Maischberger Crawl abgeschlossen.");
});

// Miosga: Montags um 1 Uhr morgens
cron.schedule("0 1 * * 1", async () => {
  logger.info("Starte Caren Miosga Crawl...");
  await crawlIncrementalCarenMiosgaEpisodes();
  logger.info("Caren Miosga Crawl abgeschlossen.");
});

// Pinar Atalay: Jede 14 Tage Dienstags um 2 Uhr morgens
cron.schedule("0 2 * * 2", async () => {
  logger.info("Starte Pinar Atalay Crawl...");
  await CrawlPinarAtalay();
  logger.info("Pinar Atalay Crawl abgeschlossen.");
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/api/crawl-lanz", async (req, res) => {
  logger.info("Starte Lanz Crawl...");
  await CrawlLanz();
  logger.info("Lanz Crawl abgeschlossen.");
  res.send("Lanz Crawl gestartet.");
});

app.post("/api/crawl-haf", async (req, res) => {
  logger.info("Starte Hart aber Fair Crawl...");
  await crawlHartAberFair();
  logger.info("Hart aber Fair Crawl abgeschlossen.");
  res.send("Hart aber Fair Crawl gestartet.");
});

app.post("/api/crawl-illner", async (req, res) => {
  logger.info("Starte Illner Crawl...");
  await crawlNewMaybritIllnerEpisodes();
  logger.info("Illner Crawl abgeschlossen.");
  res.send("Illner Crawl gestartet.");
});

app.post("/api/crawl-maischberger", async (req, res) => {
  logger.info("Starte Maischberger Crawl...");
  await crawlNewMaischbergerEpisodes();
  logger.info("Maischberger Crawl abgeschlossen.");
  res.send("Maischberger Crawl gestartet.");
});

app.post("/api/crawl-miosga", async (req, res) => {
  logger.info("Starte Caren Miosga Crawl...");
  await crawlIncrementalCarenMiosgaEpisodes();
  logger.info("Caren Miosga Crawl abgeschlossen.");
  res.send("Caren Miosga Crawl gestartet.");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
