"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.crawlAllMarkusLanzEpisodes = exports.crawlNewMarkusLanzEpisodes = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
const axios_1 = __importDefault(require("axios"));
const db_tv_shows_1 = require("../db-tv-shows");
const LIST_URL = "https://www.zdf.de/talk/markus-lanz-114";
// Hilfsfunktion: Name in Vor- und Nachname aufteilen
function splitFirstLast(name) {
    var _a;
    const parts = name.split(/\s+/).filter(Boolean);
    return { first: (_a = parts[0]) !== null && _a !== void 0 ? _a : "", last: parts.slice(1).join(" ").trim() };
}
// Hilfsfunktion zur Disambiguierung basierend auf ZDF-Rolle
function disambiguateByRole(politicians, role) {
    const roleUpper = role.toUpperCase();
    // Partei-Mappings für die Disambiguierung
    const partyMappings = {
        CDU: ["CDU", "CHRISTLICH DEMOKRATISCHE UNION"],
        CSU: ["CSU", "CHRISTLICH-SOZIALE UNION"],
        SPD: ["SPD", "SOZIALDEMOKRATISCHE PARTEI"],
        FDP: ["FDP", "FREIE DEMOKRATISCHE PARTEI"],
        GRÜNE: ["BÜNDNIS 90/DIE GRÜNEN", "DIE GRÜNEN"],
        LINKE: ["DIE LINKE"],
        AFD: ["AFD", "ALTERNATIVE FÜR DEUTSCHLAND"],
    };
    // Positionen für die Disambiguierung
    const positionMappings = {
        BUNDESKANZLER: ["BUNDESKANZLER", "KANZLER"],
        MINISTERPRÄSIDENT: [
            "MINISTERPRÄSIDENT",
            "REGIERUNGSCHEF",
            "LANDESVORSITZENDE",
        ],
        MINISTER: ["MINISTER", "BUNDESMINISTER", "STAATSSEKRETÄR"],
        BUNDESTAG: ["BUNDESTAG", "MDB", "ABGEORDNETE"],
        LANDTAG: ["LANDTAG", "MDL", "LANDESABGEORDNETE"],
    };
    // 1. Versuche Partei-Match
    for (const [party, variants] of Object.entries(partyMappings)) {
        if (variants.some((variant) => roleUpper.includes(variant))) {
            const partyMatch = politicians.find((p) => p.party && p.party.label.toUpperCase().includes(party));
            if (partyMatch) {
                console.log(`✅ Partei-Match gefunden: ${party}`);
                return partyMatch;
            }
        }
    }
    // 2. Versuche Position-Match
    for (const [position, variants] of Object.entries(positionMappings)) {
        if (variants.some((variant) => roleUpper.includes(variant))) {
            // Für spezifische Positionen, nimm den ersten Treffer
            if (["BUNDESKANZLER", "MINISTERPRÄSIDENT"].includes(position)) {
                console.log(`✅ Position-Match gefunden: ${position}`);
                return politicians[0];
            }
        }
    }
    return null;
}
// Spezielle Override-Cases für bestimmte Politiker
const POLITICIAN_OVERRIDES = {
    "Manfred Weber": {
        name: "Manfred Weber",
        isPolitician: true,
        politicianId: 28910,
        party: 3, // CSU
    },
};
// Politiker-Prüfung mit Disambiguierung
function checkPolitician(name, role) {
    var _a, _b, _c, _d;
    return __awaiter(this, void 0, void 0, function* () {
        // Prüfe zuerst Override-Cases
        if (POLITICIAN_OVERRIDES[name]) {
            console.log(`✅ Override angewendet für ${name} -> CSU`);
            return POLITICIAN_OVERRIDES[name];
        }
        const { first, last } = splitFirstLast(name);
        if (!first || !last) {
            return {
                name,
                isPolitician: false,
                politicianId: null,
            };
        }
        const url = `https://www.abgeordnetenwatch.de/api/v2/politicians?first_name=${encodeURIComponent(first)}&last_name=${encodeURIComponent(last)}`;
        try {
            const { data } = yield axios_1.default.get(url, { timeout: 10000 });
            const politicians = (data === null || data === void 0 ? void 0 : data.data) || [];
            if (politicians.length === 0) {
                return {
                    name,
                    isPolitician: false,
                    politicianId: null,
                };
            }
            if (politicians.length === 1) {
                // Nur ein Treffer - verwende ihn direkt
                const hit = politicians[0];
                return {
                    name,
                    isPolitician: true,
                    politicianId: hit.id,
                    party: (_a = hit.party) === null || _a === void 0 ? void 0 : _a.id,
                };
            }
            // Mehrere Treffer - versuche Disambiguierung über ZDF-Rolle
            if (role && politicians.length > 1) {
                console.log(`🔍 Disambiguierung für ${name}: ${politicians.length} Treffer gefunden, Rolle: "${role}"`);
                const selectedPolitician = disambiguateByRole(politicians, role);
                if (selectedPolitician) {
                    console.log(`✅ Politiker ausgewählt: ${selectedPolitician.label} (${(_b = selectedPolitician.party) === null || _b === void 0 ? void 0 : _b.label})`);
                    return {
                        name,
                        isPolitician: true,
                        politicianId: selectedPolitician.id,
                        party: (_c = selectedPolitician.party) === null || _c === void 0 ? void 0 : _c.id,
                    };
                }
            }
            // Fallback: ersten Treffer verwenden
            console.log(`⚠️  Keine eindeutige Zuordnung für ${name}, verwende ersten Treffer`);
            const hit = politicians[0];
            return {
                name,
                isPolitician: true,
                politicianId: hit.id,
                party: (_d = hit.party) === null || _d === void 0 ? void 0 : _d.id,
            };
        }
        catch (_e) {
            return {
                name,
                isPolitician: false,
                politicianId: null,
            };
        }
    });
}
// Extrahiere die neuesten Episode-Links (nur die ersten paar)
function getLatestEpisodeLinks(page, limit = 10) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("🔍 Lade die neuesten Episode-Links...");
        yield page.goto(LIST_URL, { waitUntil: "networkidle2", timeout: 60000 });
        // Cookie-Banner akzeptieren falls vorhanden
        try {
            yield page.waitForSelector('[data-testid="cmp-accept-all"]', {
                timeout: 5000,
            });
            yield page.click('[data-testid="cmp-accept-all"]');
            console.log("Cookie-Banner akzeptiert");
            yield new Promise((resolve) => setTimeout(resolve, 2000));
        }
        catch (e) {
            console.log("Kein Cookie-Banner gefunden oder bereits akzeptiert");
        }
        // Hole die ersten Episode-Links (neueste zuerst)
        const urls = yield page.$$eval('a[href^="/video/talk/markus-lanz-114/"]', (as) => Array.from(new Set(as.map((a) => a.href))).slice(0, limit));
        console.log(`📺 Gefunden: ${urls.length} Episode-Links`);
        return urls;
    });
}
// Extrahiere ALLE verfügbaren Episode-Links durch Scrollen und Paginierung
function getAllEpisodeLinks(page) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        console.log("🔍 Lade ALLE verfügbaren Episode-Links...");
        yield page.goto(LIST_URL, { waitUntil: "networkidle2", timeout: 60000 });
        // Cookie-Banner akzeptieren falls vorhanden
        try {
            yield page.waitForSelector('[data-testid="cmp-accept-all"]', {
                timeout: 5000,
            });
            yield page.click('[data-testid="cmp-accept-all"]');
            console.log("Cookie-Banner akzeptiert");
            yield new Promise((resolve) => setTimeout(resolve, 2000));
        }
        catch (e) {
            console.log("Kein Cookie-Banner gefunden oder bereits akzeptiert");
        }
        let allUrls = new Set();
        let previousCount = 0;
        let scrollAttempts = 0;
        const maxScrollAttempts = 100; // Verhindere Endlosschleife
        console.log("📜 Scrolle für alle verfügbaren Episoden...");
        while (scrollAttempts < maxScrollAttempts) {
            // Sammle alle aktuell sichtbaren Episode-Links
            const currentUrls = yield page.$$eval('a[href^="/video/talk/markus-lanz-114/"]', (as) => as.map((a) => a.href));
            // Füge neue URLs hinzu
            currentUrls.forEach((url) => allUrls.add(url));
            console.log(`   � Gefunden: ${allUrls.size} Episoden (Runde ${scrollAttempts + 1})`);
            // Wenn keine neuen URLs gefunden wurden, sind wir am Ende
            if (allUrls.size === previousCount) {
                console.log("   ✅ Keine neuen Episoden mehr gefunden");
                break;
            }
            previousCount = allUrls.size;
            scrollAttempts++;
            // Scrolle nach unten für Lazy Loading
            yield page.evaluate(() => {
                window.scrollBy(0, window.innerHeight * 2);
            });
            // Warte auf neuen Content
            yield new Promise((resolve) => setTimeout(resolve, 1500));
            // Prüfe auf "Mehr laden" Button oder ähnliches
            try {
                const loadMoreButton = yield page.$('button[data-tracking*="load"], button:contains("Mehr"), button:contains("Weitere")');
                if (loadMoreButton) {
                    console.log("   🔄 Klicke 'Mehr laden' Button...");
                    yield loadMoreButton.click();
                    yield new Promise((resolve) => setTimeout(resolve, 3000));
                }
            }
            catch (e) {
                // Kein Load-More Button gefunden, das ist ok
            }
        }
        const finalUrls = Array.from(allUrls);
        console.log(`📺 Gesamt gefunden: ${finalUrls.length} Episode-Links`);
        // Sortiere nach Datum (neuste zuerst)
        const urlsWithDates = finalUrls
            .map((url) => ({
            url,
            date: parseISODateFromUrl(url),
        }))
            .filter((ep) => ep.date !== null)
            .sort((a, b) => b.date.localeCompare(a.date));
        console.log(`📅 Zeitraum: ${(_a = urlsWithDates[urlsWithDates.length - 1]) === null || _a === void 0 ? void 0 : _a.date} bis ${(_b = urlsWithDates[0]) === null || _b === void 0 ? void 0 : _b.date}`);
        return urlsWithDates.map((ep) => ep.url);
    });
}
// Extrahiere Datum aus URL (bereits vorhandene Funktion)
function parseISODateFromUrl(url) {
    const DE_MONTHS = {
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
    const m = url.match(/vom-(\d{1,2})-([a-zäöü]+)-(\d{4})/i);
    if (!m)
        return null;
    let [_, d, mon, y] = m;
    const key = mon
        .normalize("NFD")
        .replace(/\u0308/g, "")
        .toLowerCase();
    const mm = DE_MONTHS[key];
    if (!mm)
        return null;
    const dd = d.padStart(2, "0");
    return `${y}-${mm}-${dd}`;
}
// Filtere nur neue Episoden (neuere als das letzte Datum in der DB)
function filterNewEpisodes(episodeUrls, latestDbDate) {
    console.log(`🗓️  Letzte Episode in DB: ${latestDbDate || "Keine"}`);
    const episodesWithDates = episodeUrls
        .map((url) => ({
        url,
        date: parseISODateFromUrl(url),
    }))
        .filter((ep) => ep.date !== null);
    if (!latestDbDate) {
        console.log("📋 Keine Episoden in DB - alle sind neu");
        return episodesWithDates;
    }
    const newEpisodes = episodesWithDates.filter((ep) => ep.date > latestDbDate);
    console.log(`🆕 ${newEpisodes.length} neue Episoden gefunden (nach ${latestDbDate})`);
    return newEpisodes.sort((a, b) => b.date.localeCompare(a.date)); // Neueste zuerst
}
// Name-Filter (bereits vorhanden)
function seemsLikePersonName(name) {
    if (!/\S+\s+\S+/.test(name))
        return false;
    const re = /^[\p{Lu}][\p{L}\-]+(?:\s+(?:von|van|de|da|del|der|den|du|le|la|zu|zur|zum))?(?:\s+[\p{Lu}][\p{L}\-]+)+$/u;
    return re.test(name);
}
// Extrahiere Gäste aus einer Episode
function extractGuestsFromEpisode(page, episodeUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`🎬 Crawle Episode: ${episodeUrl}`);
        yield page.goto(episodeUrl, { waitUntil: "networkidle2", timeout: 60000 });
        yield page.setExtraHTTPHeaders({
            "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
        });
        yield page.waitForSelector("main", { timeout: 15000 }).catch(() => { });
        // Sanft scrollen für Lazy-Content
        yield page
            .evaluate(() => __awaiter(this, void 0, void 0, function* () {
            yield new Promise((res) => {
                let y = 0;
                const i = setInterval(() => {
                    window.scrollBy(0, 500);
                    if ((y += 500) > document.body.scrollHeight) {
                        clearInterval(i);
                        res();
                    }
                }, 50);
            });
        }))
            .catch(() => { });
        // Primär: Gäste-Sektion mit Rollen
        let guestsWithRoles = yield page
            .$$eval('section[tabindex="0"] p b, section.tdeoflm p b', (els) => Array.from(new Set(els
            .map((el) => (el.textContent || "").replace(/\s+/g, " ").trim())
            .filter(Boolean)
            .filter((t) => t.includes(","))
            .map((t) => {
            const parts = t.split(",");
            return {
                name: parts[0].trim(),
                role: parts.slice(1).join(",").trim() || undefined,
            };
        }))))
            .catch(() => []);
        // Fallback: alle <b> Tags
        if (!guestsWithRoles.length) {
            guestsWithRoles = yield page
                .$$eval("main b", (els) => Array.from(new Set(els
                .map((el) => (el.textContent || "").replace(/\s+/g, " ").trim())
                .filter(Boolean)
                .filter((t) => t.includes(","))
                .map((t) => {
                const parts = t.split(",");
                return {
                    name: parts[0].trim(),
                    role: parts.slice(1).join(",").trim() || undefined,
                };
            }))))
                .catch(() => []);
        }
        // Fallback: Alt-Text vom Bild
        if (!guestsWithRoles.length) {
            const alt = yield page
                .$eval('main img[alt*="Markus Lanz"]', (el) => el.getAttribute("alt") || "")
                .catch(() => "");
            if (alt && alt.includes(":")) {
                const list = alt
                    .split(":")[1]
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                guestsWithRoles = list.map((name) => ({ name, role: undefined }));
            }
        }
        // Filter und Duplikat-Entfernung
        const filteredGuests = guestsWithRoles.filter((guest) => seemsLikePersonName(guest.name));
        const uniqueGuests = filteredGuests.reduce((acc, current) => {
            const existing = acc.find((guest) => guest.name === current.name);
            if (!existing) {
                acc.push(current);
            }
            return acc;
        }, []);
        console.log(`👥 Gäste gefunden: ${uniqueGuests.map((g) => g.name).join(", ")}`);
        return uniqueGuests;
    });
}
// Hauptfunktion: Crawle nur neue Episoden
function crawlNewMarkusLanzEpisodes() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("🚀 Starte inkrementellen Markus Lanz Crawler...");
        console.log(`📅 Datum: ${new Date().toISOString()}`);
        // Stelle sicher dass die Tabelle existiert
        (0, db_tv_shows_1.initTvShowPoliticiansTable)();
        // Hole das letzte Datum aus der DB
        const latestDbDate = (0, db_tv_shows_1.getLatestEpisodeDate)("Markus Lanz");
        console.log(`🗃️  Letzte Episode in DB: ${latestDbDate || "Keine"}`);
        const browser = yield puppeteer_1.default.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
            ],
        });
        try {
            const page = yield browser.newPage();
            yield page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36");
            yield page.setViewport({ width: 1280, height: 1000 });
            yield page.setExtraHTTPHeaders({
                "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
            });
            // Hole die neuesten Episode-Links
            const latestEpisodeUrls = yield getLatestEpisodeLinks(page);
            if (latestEpisodeUrls.length === 0) {
                console.log("❌ Keine Episode-Links gefunden");
                return;
            }
            // Filtere nur neue Episoden
            const newEpisodes = filterNewEpisodes(latestEpisodeUrls, latestDbDate);
            if (newEpisodes.length === 0) {
                console.log("✅ Keine neuen Episoden gefunden - alles aktuell!");
                return;
            }
            console.log(`🆕 Crawle ${newEpisodes.length} neue Episoden:`);
            newEpisodes.forEach((ep) => console.log(`   📺 ${ep.date}: ${ep.url}`));
            let totalPoliticiansInserted = 0;
            let episodesProcessed = 0;
            // Verarbeite jede neue Episode
            for (const episode of newEpisodes) {
                try {
                    console.log(`\n🎬 Verarbeite Episode vom ${episode.date}`);
                    const guests = yield extractGuestsFromEpisode(page, episode.url);
                    if (guests.length === 0) {
                        console.log("   ❌ Keine Gäste gefunden");
                        continue;
                    }
                    // Prüfe jeden Gast auf Politiker-Status
                    const politicians = [];
                    for (const guest of guests) {
                        console.log(`   🔍 Prüfe: ${guest.name}${guest.role ? ` (${guest.role})` : ""}`);
                        const details = yield checkPolitician(guest.name, guest.role);
                        if (details.isPolitician && details.politicianId) {
                            console.log(`      ✅ Politiker: ID ${details.politicianId}, Partei ${details.party}`);
                            politicians.push({
                                politicianId: details.politicianId,
                                partyId: details.party,
                            });
                        }
                        else {
                            console.log(`      ❌ Kein Politiker`);
                        }
                        // Pause zwischen API-Calls
                        yield new Promise((resolve) => setTimeout(resolve, 300));
                    }
                    // Speichere Politiker in die Datenbank
                    if (politicians.length > 0) {
                        const inserted = (0, db_tv_shows_1.insertMultipleTvShowPoliticians)("Markus Lanz", episode.date, politicians);
                        totalPoliticiansInserted += inserted;
                        console.log(`   💾 ${inserted}/${politicians.length} Politiker gespeichert`);
                    }
                    else {
                        console.log(`   📝 Keine Politiker in dieser Episode`);
                    }
                    episodesProcessed++;
                }
                catch (error) {
                    console.error(`❌ Fehler beim Verarbeiten von Episode ${episode.date}:`, error);
                }
            }
            console.log(`\n🎉 Inkrementeller Crawl abgeschlossen!`);
            console.log(`📊 Episoden verarbeitet: ${episodesProcessed}`);
            console.log(`👥 Politiker eingefügt: ${totalPoliticiansInserted}`);
        }
        finally {
            yield browser.close().catch(() => { });
        }
    });
}
exports.crawlNewMarkusLanzEpisodes = crawlNewMarkusLanzEpisodes;
// Hauptfunktion: VOLLSTÄNDIGER historischer Crawl ALLER Episoden
function crawlAllMarkusLanzEpisodes() {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        console.log("🚀 Starte VOLLSTÄNDIGEN Markus Lanz Crawler...");
        console.log(`📅 Datum: ${new Date().toISOString()}`);
        // Stelle sicher dass die Tabelle existiert
        (0, db_tv_shows_1.initTvShowPoliticiansTable)();
        const browser = yield puppeteer_1.default.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
            ],
        });
        try {
            const page = yield browser.newPage();
            yield page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36");
            yield page.setViewport({ width: 1280, height: 1000 });
            yield page.setExtraHTTPHeaders({
                "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
            });
            // Hole ALLE verfügbaren Episode-Links
            const allEpisodeUrls = yield getAllEpisodeLinks(page);
            if (allEpisodeUrls.length === 0) {
                console.log("❌ Keine Episode-Links gefunden");
                return;
            }
            // Konvertiere URLs zu Episode-Objekten mit Datum
            const allEpisodes = allEpisodeUrls
                .map((url) => ({
                url,
                date: parseISODateFromUrl(url),
            }))
                .filter((ep) => ep.date !== null)
                .sort((a, b) => a.date.localeCompare(b.date)); // Älteste zuerst für historischen Crawl
            console.log(`📺 Gefunden: ${allEpisodes.length} Episoden zum Crawlen`);
            console.log(`📅 Zeitraum: ${(_a = allEpisodes[0]) === null || _a === void 0 ? void 0 : _a.date} bis ${(_b = allEpisodes[allEpisodes.length - 1]) === null || _b === void 0 ? void 0 : _b.date}`);
            let totalPoliticiansInserted = 0;
            let episodesProcessed = 0;
            let episodesWithErrors = 0;
            // Verarbeite jede Episode
            for (let i = 0; i < allEpisodes.length; i++) {
                const episode = allEpisodes[i];
                try {
                    console.log(`\n🎬 [${i + 1}/${allEpisodes.length}] Verarbeite Episode vom ${episode.date}`);
                    const guests = yield extractGuestsFromEpisode(page, episode.url);
                    if (guests.length === 0) {
                        console.log("   ❌ Keine Gäste gefunden");
                        continue;
                    }
                    // Prüfe jeden Gast auf Politiker-Status
                    const politicians = [];
                    for (const guest of guests) {
                        console.log(`   🔍 Prüfe: ${guest.name}${guest.role ? ` (${guest.role})` : ""}`);
                        const details = yield checkPolitician(guest.name, guest.role);
                        if (details.isPolitician && details.politicianId) {
                            console.log(`      ✅ Politiker: ID ${details.politicianId}, Partei ${details.party}`);
                            politicians.push({
                                politicianId: details.politicianId,
                                partyId: details.party,
                            });
                        }
                        else {
                            console.log(`      ❌ Kein Politiker`);
                        }
                        // Pause zwischen API-Calls
                        yield new Promise((resolve) => setTimeout(resolve, 300));
                    }
                    // Speichere Politiker in die Datenbank
                    if (politicians.length > 0) {
                        const inserted = (0, db_tv_shows_1.insertMultipleTvShowPoliticians)("Markus Lanz", episode.date, politicians);
                        totalPoliticiansInserted += inserted;
                        console.log(`   💾 ${inserted}/${politicians.length} Politiker gespeichert`);
                    }
                    else {
                        console.log(`   📝 Keine Politiker in dieser Episode`);
                    }
                    episodesProcessed++;
                    // Fortschritt alle 10 Episoden
                    if ((i + 1) % 10 === 0) {
                        console.log(`\n📊 Zwischenstand: ${episodesProcessed}/${allEpisodes.length} Episoden, ${totalPoliticiansInserted} Politiker`);
                    }
                }
                catch (error) {
                    console.error(`❌ Fehler beim Verarbeiten von Episode ${episode.date}:`, error);
                    episodesWithErrors++;
                }
            }
            console.log(`\n🎉 VOLLSTÄNDIGER Crawl abgeschlossen!`);
            console.log(`📊 Episoden verarbeitet: ${episodesProcessed}/${allEpisodes.length}`);
            console.log(`👥 Politiker eingefügt: ${totalPoliticiansInserted}`);
            console.log(`❌ Episoden mit Fehlern: ${episodesWithErrors}`);
            if (episodesWithErrors > 0) {
                console.log(`⚠️  ${episodesWithErrors} Episoden hatten Fehler und wurden übersprungen`);
            }
        }
        finally {
            yield browser.close().catch(() => { });
        }
    });
}
exports.crawlAllMarkusLanzEpisodes = crawlAllMarkusLanzEpisodes;
// CLI-Support für direkten Aufruf
if (require.main === module) {
    const mode = process.argv[2] || "incremental";
    console.log(`🎯 Crawler-Modus: ${mode}`);
    if (mode === "full" || mode === "all" || mode === "complete") {
        crawlAllMarkusLanzEpisodes()
            .then(() => {
            console.log("✅ Vollständiger Crawler beendet");
            process.exit(0);
        })
            .catch((error) => {
            console.error("❌ Vollständiger Crawler Fehler:", error);
            process.exit(1);
        });
    }
    else {
        crawlNewMarkusLanzEpisodes()
            .then(() => {
            console.log("✅ Inkrementeller Crawler beendet");
            process.exit(0);
        })
            .catch((error) => {
            console.error("❌ Inkrementeller Crawler Fehler:", error);
            process.exit(1);
        });
    }
}
