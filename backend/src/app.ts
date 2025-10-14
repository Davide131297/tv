import express from "express";
import dotenv from "dotenv";
import cron from "node-cron";
import CrawlLanz from "./crawler/lanz";
import { crawlNewMaybritIllnerEpisodes } from "./crawler/illner";
import { crawlNewMaischbergerEpisodes } from "./crawler/maischberger";
import { crawlIncrementalCarenMiosgaEpisodes } from "./crawler/miosga";
import crawlHartAberFair from "./crawler/haf";
import pino from "pino";
const logger = pino();

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

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

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
