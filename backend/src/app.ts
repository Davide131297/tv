import express from "express";
import dotenv from "dotenv";
import cron from "node-cron";
import CrawlLanz from "./crawler/lanz.js";
import { crawlNewMaybritIllnerEpisodes } from "./crawler/illner.js";
import { crawlNewMaischbergerEpisodes } from "./crawler/maischberger.js";
import { crawlIncrementalCarenMiosgaEpisodes } from "./crawler/miosga.js";
import crawlHartAberFair from "./crawler/haf.js";
import CrawlPinarAtalay from "./crawler/atalay.js";
import CrawlPhoenixRunde from "./crawler/phoenix-runde.js";
import { handleChatRequest } from "./chat/chat.js";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 9000;

app.use(
  cors({
    origin: [
      "https://tv-git-dev-davide131297s-projects.vercel.app",
      "https://www.polittalk-watcher.de",
      "https://polittalk-watcher.de",
      "http://localhost:3000",
    ],
  })
);

// Middleware für JSON-Body-Parsing
app.use(express.json());

// // Lanz: Mittwochs, Donnerstags und Freitags um 2 Uhr morgens
// cron.schedule("0 2 * * 3,4,5", async () => {
//   console.log("Starte Lanz Crawl...");
//   await CrawlLanz();
//   console.log("Lanz Crawl abgeschlossen.");
// });

// // Hart aber Fair: Dienstags um 1 Uhr morgens
// cron.schedule("0 1 * * 2", async () => {
//   console.log("Starte Hart aber Fair Crawl...");
//   await crawlHartAberFair();
//   console.log("Hart aber Fair Crawl abgeschlossen.");
// });

// // Illner: Freitags um 2 Uhr morgens
// cron.schedule("0 2 * * 5", async () => {
//   console.log("Starte Illner Crawl...");
//   await crawlNewMaybritIllnerEpisodes();
//   console.log("Illner Crawl abgeschlossen.");
// });

// // Maischberger: Mittwochs und Donnerstags um 2 Uhr morgens
// cron.schedule("0 2 * * 3,4", async () => {
//   console.log("Starte Maischberger Crawl...");
//   await crawlNewMaischbergerEpisodes();
//   console.log("Maischberger Crawl abgeschlossen.");
// });

// // Miosga: Montags um 1 Uhr morgens
// cron.schedule("0 1 * * 1", async () => {
//   console.log("Starte Caren Miosga Crawl...");
//   await crawlIncrementalCarenMiosgaEpisodes();
//   console.log("Caren Miosga Crawl abgeschlossen.");
// });

// // Pinar Atalay: Jede 14 Tage Dienstags um 2 Uhr morgens
// cron.schedule("0 2 * * 2", async () => {
//   console.log("Starte Pinar Atalay Crawl...");
//   await CrawlPinarAtalay();
//   console.log("Pinar Atalay Crawl abgeschlossen.");
// });

// cron.schedule("0 3 * * 3,4,5", async () => {
//   console.log("Starte Phoenix Runde Crawl...");
//   await CrawlPhoenixRunde();
//   console.log("Phoenix Runde Crawl abgeschlossen.");
// });

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// app.post("/api/chat", handleChatRequest);

// app.post("/api/crawl-lanz", async (req, res) => {
//   console.log("Starte Lanz Crawl...");
//   await CrawlLanz();
//   console.log("Lanz Crawl abgeschlossen.");
//   res.send("Lanz Crawl gestartet.");
// });

// app.post("/api/crawl-haf", async (req, res) => {
//   console.log("Starte Hart aber Fair Crawl...");
//   await crawlHartAberFair();
//   console.log("Hart aber Fair Crawl abgeschlossen.");
//   res.send("Hart aber Fair Crawl gestartet.");
// });

// app.post("/api/crawl-illner", async (req, res) => {
//   console.log("Starte Illner Crawl...");
//   await crawlNewMaybritIllnerEpisodes();
//   console.log("Illner Crawl abgeschlossen.");
//   res.send("Illner Crawl gestartet.");
// });

// app.post("/api/crawl-maischberger", async (req, res) => {
//   console.log("Starte Maischberger Crawl...");
//   await crawlNewMaischbergerEpisodes();
//   console.log("Maischberger Crawl abgeschlossen.");
//   res.send("Maischberger Crawl gestartet.");
// });

// app.post("/api/crawl-miosga", async (req, res) => {
//   console.log("Starte Caren Miosga Crawl...");
//   await crawlIncrementalCarenMiosgaEpisodes();
//   console.log("Caren Miosga Crawl abgeschlossen.");
//   res.send("Caren Miosga Crawl gestartet.");
// });

// app.post("/api/crawl-atalay", async (req, res) => {
//   console.log("Starte Pinar Atalay Crawl...");
//   await CrawlPinarAtalay();
//   console.log("Pinar Atalay Crawl abgeschlossen.");
//   res.send("Pinar Atalay Crawl gestartet.");
// });

// app.post("/api/crawl-phoenix-runde", async (req, res) => {
//   console.log("Starte Phoenix Runde Crawl...");
//   await CrawlPhoenixRunde();
//   console.log("Phoenix Runde Crawl abgeschlossen.");
//   res.send("Phoenix Runde Crawl gestartet.");
// });

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
