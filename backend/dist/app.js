"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("./db"));
const lanz_1 = require("./crawler/lanz");
db_1.default.serialize();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Starte den Crawler automatisch beim App-Start
(0, lanz_1.crawlNewMarkusLanzEpisodes)()
    .then(() => {
    console.log("Crawling completed");
})
    .catch((err) => {
    console.error("Crawling failed:", err);
});
app.get("/", (req, res) => {
    res.send("Hello World!");
});
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
