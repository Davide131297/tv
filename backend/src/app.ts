import express from "express";
import db from "./db";
import { crawlAllMarkusLanzEpisodes } from "./crawler/lanz";

db.serialize();

const app = express();
const PORT = process.env.PORT || 3000;

// Starte den Crawler automatisch beim App-Start
crawlAllMarkusLanzEpisodes()
  .then(() => {
    console.log("Crawling completed");
  })
  .catch((err: any) => {
    console.error("Crawling failed:", err);
  });

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
