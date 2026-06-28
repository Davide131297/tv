# TV Politik Dashboard - Crawler Backend

Dieses Repository enthält das automatisierte Web-Crawling- und Analyse-Backend für das TV Politik Dashboard. Es extrahiert Gäste-Auftritte aus bekannten deutschen Politik-Talkshows, validiert Politiker über die API von *abgeordnetenwatch.de*, klassifiziert die besprochenen politischen Themen via Gemini-KI und speichert die Ergebnisse in einer Supabase-Datenbank. Zudem erfasst es täglich Einschaltquoten (Zuschauerzahlen & Marktanteile).

---

## 🎯 Zweck & unterstützte Formate

Das System crawlt automatisch folgende Talkshows und Datenquellen:

1. **Markus Lanz** (ZDF)
2. **Maybrit Illner** (ZDF)
3. **Caren Miosga** (ARD)
4. **Maischberger** (ARD)
5. **Hart aber fair** (ARD)
6. **Pinar Atalay** (RTL+)
7. **Phoenix Runde** (Phoenix)
8. **Phoenix Persönlich** (Phoenix)
9. **Blome & Pfeffer** (RTL+ Podcast)
10. **Einschaltquoten / TV-Ratings** (WDR Quoten-Service für ARD & ZDF Teletext für ZDF)

---

## 📁 Projektstruktur

```
backend/
├── src/
│   ├── app.ts                  # Express-Server, Middleware & API-Definitionen
│   ├── supabase.ts             # Supabase Client-Initialisierung
│   ├── crawler/                # Die Crawler-Skripte für die Shows
│   │   ├── lanz.ts             # Markus Lanz (ZDF API + Puppeteer-Fallback)
│   │   ├── illner.ts           # Maybrit Illner (ZDF API + Puppeteer-Fallback)
│   │   ├── miosga.ts           # Caren Miosga (ARD-Audiothek GraphQL-API)
│   │   ├── maischberger.ts     # Maischberger (ARD-Mediathek JSON-API)
│   │   ├── haf.ts              # Hart aber fair (Axios + Cheerio HTML-Parsing)
│   │   ├── atalay.ts           # Pinar Atalay (Puppeteer Scraping für RTL+)
│   │   ├── phoenix-runde.ts    # Phoenix Runde (Puppeteer Scraping)
│   │   ├── phoenix-persoenlich.ts # Phoenix Persönlich (Puppeteer Scraping)
│   │   ├── blome-pfeffer.ts    # Blome & Pfeffer (Puppeteer Scraping für RTL+ Podcasts)
│   │   ├── tv-ratings.ts       # Einschaltquoten (WDR HTML & ZDF Teletext Parsing)
│   │   └── test-scrape-all.ts  # Testskript für lokale Ausführung aller Crawler
│   ├── lib/                    # Gemeinsam genutzter Code und Helpers
│   │   ├── browser-configs.ts  # Zentrale Puppeteer- & Chromium-Konfiguration
│   │   ├── crawler-utils.ts    # Parsing-Funktionen, Cookie-Banner-Handling etc.
│   │   ├── utils.ts            # Datenbank-Helper, Gemini API (Themen- & Gästeextraktion)
│   │   └── zdf-api.ts          # Direkte GraphQL-Queries für ZDF-Mediathek-APIs
│   └── types/                  # TypeScript Typdefinitionen
│       └── abgeordnetenwatch.ts # Schnittstelle zu abgeordnetenwatch.de
├── Dockerfile                  # Containerisierung für Cloud-Deployments (z. B. Cloud Run)
├── package.json                # npm-Projektabhängigkeiten
├── tsconfig.json               # TypeScript-Konfiguration
└── README.md                   # Dieses Dokument
```

---

## ⚙️ Installation & Setup

1. **Repository klonen & Abhängigkeiten installieren:**
   ```bash
   cd backend
   npm install
   ```

2. **Umgebungsvariablen konfigurieren:**
   Erstelle eine `.env` Datei im `backend/`-Verzeichnis:
   ```env
   # Supabase-Verbindung
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-supabase-anon-key

   # API Keys
   CRAWL_API_KEY=your-secure-crawl-api-key    # Authentifizierung für Crawler-Trigger
   GOOGLE_AI_KEY=your-gemini-api-key          # Für Gemini KI-Klassifizierung
   GOOGLE_AI_MODEL=gemini-2.5-flash          # AI-Modell für Themen- und Gäste-Extraktion

   # Server-Port (optional, Standard ist 8080)
   PORT=8080
   ```

---

## 🚀 Entwicklung & Ausführung

```bash
# Entwicklungsserver mit Hot-Reload (via tsx)
npm run dev

# TypeScript kompilieren
npm run build

# Produktiven Node-Server starten
npm run start

# Tests ausführen
npm run test
```

Standardmäßig läuft der Server lokal unter `http://localhost:8080`.

---

## 🔗 API Endpunkte

Alle `/api/*`-Endpunkte (außer dem Health Check) sind mit einem Bearer-Token geschützt. Im Request-Header muss folgendes mitgesendet werden:
`Authorization: Bearer <CRAWL_API_KEY>`

### 1. Alle Talkshow-Crawler triggern
* **Pfad:** `GET /api/crawl/all`
* **Zweck:** Führt nacheinander die inkrementellen Crawler für *Lanz, Illner, Hart aber Fair, Maischberger und Miosga* aus.
* **Erwartete Antwort:** JSON-Zusammenfassung mit Anzahl erfolgreicher und fehlgeschlagener Crawler.

### 2. Einzelne Crawler manuell triggern
* **Pfad:** `POST /api/crawl/:show`
* **Unterstützte Parameter für `:show`:**
  * `lanz` — Markus Lanz (POST)
  * `illner` — Maybrit Illner (POST). Unterstützt im Body `{"runType": "full"}` für einen historischen Crawl.
  * `haf` — Hart aber Fair (POST)
  * `maischberger` — Maischberger (POST). Unterstützt im Body `{"runType": "full"}`.
  * `miosga` — Caren Miosga (POST). Unterstützt im Body `{"runType": "full"}`.
  * `atalay` — Pinar Atalay (POST)
  * `phoenix-runde` — Phoenix Runde (POST)
  * `phoenix-persoenlich` — Phoenix Persönlich (POST)
  * `blome-pfeffer` — Blome & Pfeffer (POST)
* **Datenbereinigung:**
  * `DELETE /api/crawl/maischberger` — Löscht alle Maischberger-Gästeeinträge aus der DB.

### 3. Einschaltquoten / TV-Ratings
* **Pfad:** `POST /api/crawl/tv-ratings`
* **Zweck:** Ruft die aktuellen Einschaltquoten der ARD (über WDR-Services) und ZDF (über Teletext-Web-Scraping) ab und speichert sie für Shows, die bereits mit Politikern in der DB vorhanden sind.

### 4. Health Check
* **Pfad:** `GET /` (ohne API-Key)
* **Erwartete Antwort:** Status-JSON mit Timestamp.

---

## 🔄 Detaillierte Crawler-Strategien

Die Crawler wurden optimiert, um so ressourcenschonend wie möglich zu arbeiten und Timeouts zu vermeiden:

| Show / Datenquelle | Crawler-Strategie & Methode | Gäste-Erkennung |
| :--- | :--- | :--- |
| **Markus Lanz** | Primär: Direkte Abfrage der **ZDF GraphQL-API** (schnell, stabil). <br> Fallback: **Puppeteer**-Scraping der Mediathek-Webseite. | HTML-Strukturanalyse der ZDF-Mediathek + Abgeordnetenwatch-Validierung. |
| **Maybrit Illner** | Primär: Direkte Abfrage der **ZDF GraphQL-API**. <br> Fallback: **Puppeteer**-Scraping der Mediathek-Webseite. | HTML-Strukturanalyse der ZDF-Mediathek + Abgeordnetenwatch-Validierung. |
| **Caren Miosga** | Direkte Abfrage der **ARD-Audiothek GraphQL-API**. Kein Browser erforderlich. | **Gemini AI** (`extractGuestsWithAI`) extrahiert Gäste-Namen aus dem Beschreibungstext. |
| **Maischberger** | Direkte Abfrage des **ARD Mediathek Page-Gateway** (JSON-Schnittstelle) und anschließendes HTML-Regex-Parsing der Meta-Beschreibungen. | **Gemini AI** (`extractGuestsWithAI`) extrahiert Gäste-Namen aus dem Beschreibungstext. |
| **Hart aber fair** | Direktes HTML-Parsing mittels **Axios & Cheerio** (WDR Homepage & Archiv). | Primär: HTML-Strukturanalyse der Gästeliste. <br> Fallback: **Gemini AI** extrahiert Namen aus Beschreibungstexten. |
| **Pinar Atalay** | **Puppeteer** lädt die RTL+ Teaserseite und berechnet das Sendedatum anhand der Episodennummer (Intervall: 14 Tage ab dem 06.10.2025). | **Gemini AI** (`extractGuestsWithAI`) extrahiert Gäste-Namen aus der Episodenbeschreibung. |
| **Phoenix Runde** & <br>**Phoenix Persönlich** | **Puppeteer** navigiert auf die Phoenix-Gespraechsseite, klickt auf "Weitere laden" und parst Datum (German Format) sowie Meta-Informationen. | **Gemini AI** (`extractGuestsWithAI`) extrahiert Gäste-Namen aus Beschreibung und Titel. |
| **Blome & Pfeffer** | **Puppeteer** lädt RTL+ Podcast-Übersicht und parst Metadaten (Titel, Datum im Format `dd.mm.yy` und Episodentexte). | **Gemini AI** (`extractGuestsWithAI`) extrahiert Gäste-Namen aus Beschreibung und Titel. |
| **TV-Ratings** | **Axios** lädt WDR Quoten-HTML (für ARD) sowie ZDF Teletext-HTML. Daten werden per Regex geparst (Zeitstempel, Name, Zuschauerzahl, Marktanteil). | Vergleicht und speichert Ratings nur bei bereits existierenden Episoden-Einträgen in `tv_show_politicians`. |

---

## 🤖 AI-Inhalte & KI-Features

Das Backend verwendet die **Google GenAI API** (`gemini-2.5-flash`), um:
1. **Gäste zu extrahieren (`extractGuestsWithAI`):** Textbeschreibungen werden an die KI gesendet, um strukturierte Namen der Talkshowgäste zu erhalten.
2. **Themen zu klassifizieren (`getPoliticalArea`):** Zu jeder Episode wird die Inhaltsbeschreibung analysiert, um sie einer oder mehreren vordefinierten politischen Kategorien (z. B. Wirtschaft, Umwelt, Soziales) zuzuordnen (gespeichert in `episode_political_areas`).

---

## ⏰ Zeitsteuerung (Automation)

Das Backend führt **keine** internen cron-Skripte aus. Die Zeitsteuerung ist komplett über **GitHub Actions** geregelt. Die Workflows rufen die API-Endpunkte der gehosteten Anwendung auf:

* **Wöchentlicher Crawl (`crawl-weekly.yml`):** Läuft jeden Montag um 2:00 Uhr UTC und triggert `GET /api/crawl/all`.
* **Täglicher Quoten-Crawl (`tv-ratings-crawl.yml`):** Läuft jeden Tag um 15:00 Uhr UTC und triggert `POST /api/crawl/tv-ratings`.

---

## 🗃️ Datenbank-Schema (Supabase)

Das Backend befüllt folgende PostgreSQL-Tabellen:

* `tv_show_politicians`: Speichert Gästelisten und Parteizugehörigkeit (Spalten: `show_name`, `episode_date`, `politician_name`, `party_name`, `tv_channel`, etc.).
* `show_links`: Speichert die URLs zu den jeweiligen Mediathek-Beiträgen (`episode_url`, `episode_date`, `show_name`).
* `political_areas`: Definiert Themengebiete wie Außenpolitik, Wirtschaft, Klimaschutz etc.
* `episode_political_areas`: Mapping-Tabelle zwischen Episoden und zugeordneten politischen Themenbereichen.
* `tv_ratings`: Einschaltquoten zu den jeweiligen Sendeterminen (`show_name`, `episode_date`, `market_share`, `viewers_millions`).

---

## 🔐 Sicherheit

* **Authentifizierung:** Jede API-Anfrage (außer Health Check) validiert das gesendete Bearer-Token gegen `process.env.CRAWL_API_KEY`.
* **Rate-Limiting (in API Gateway / Proxy):** Zum Schutz der Supabase-Datenbank und der externen APIs ist im Frontend-Proxy ein Rate Limiting eingerichtet.
* **Credentials:** API-Schlüssel werden über Umgebungsvariablen geladen und niemals ins Git-Repository hochgeladen.
