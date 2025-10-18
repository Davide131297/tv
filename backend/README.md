````markdown
# TV Politik Dashboard - Backend

Automatisiertes Web-Crawling-System für deutsche Talkshows mit Zeitsteuerung und API-Endpunkten.

## 🎯 Zweck

Dieses Backend crawlt automatisch die Mediatheken deutscher Politik-Talkshows und extrahiert Politiker-Auftritte:

- **Markus Lanz** (ZDF)
- **Maybrit Illner** (ZDF)
- **Caren Miosga** (ARD)
- **Maischberger** (ARD)
- **Hart aber fair** (ARD)

## 📁 Projektstruktur

```
backend/
├── src/
│   ├── app.ts                   # Express Server & Cron Jobs
│   ├── supabase.ts             # Supabase Client Konfiguration
│   ├── crawler/                # Web-Crawler für jede Show
│   │   ├── haf.ts              # Hart aber Fair
│   │   ├── illner.ts           # Maybrit Illner
│   │   ├── lanz.ts             # Markus Lanz
│   │   ├── maischberger.ts     # Maischberger
│   │   └── miosga.ts           # Caren Miosga
│   ├── lib/
│   │   ├── browser-configs.ts   # Puppeteer Konfiguration
│   │   └── utils.ts            # Utility-Funktionen & DB-Operationen
│   └── types/
│       └── abgeordnetenwatch.ts # TypeScript Definitionen
├── package.json
├── tsconfig.json
└── README.md
```

## ⚙️ Installation

1. Repository klonen und Abhängigkeiten installieren:

```bash
cd backend
npm install
```

2. Umgebungsvariablen konfigurieren (`.env`):

```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key

# Optional: Port
PORT=9000
```

## 🚀 Entwicklung

```bash
# Development Server mit Hot-Reload
npm run dev

# TypeScript kompilieren
npm run build

# Production Server
npm run start
```

Der Server läuft standardmäßig auf `http://localhost:9000`

## ⏰ Automatische Crawling-Zeitpläne

Das System läuft automatische Cron-Jobs:

- **Lanz**: Mittwoch, Donnerstag, Freitag um 2:00 Uhr
- **Hart aber Fair**: Dienstag um 1:00 Uhr
- **Illner**: Freitag um 2:00 Uhr
- **Maischberger**: Mittwoch, Donnerstag um 2:00 Uhr
- **Miosga**: Montag um 1:00 Uhr

## 🔗 API Endpunkte

### Manuelle Crawler-Trigger

```bash
# Einzelne Crawler manuell starten
POST /api/crawl-lanz          # Markus Lanz
POST /api/crawl-haf           # Hart aber Fair
POST /api/crawl-illner        # Maybrit Illner
POST /api/crawl-maischberger  # Maischberger
POST /api/crawl-miosga        # Caren Miosga

# Health Check
GET /                         # "Hello World!"
```

### Beispiel-Aufruf

```bash
curl -X POST http://localhost:9000/api/crawl-lanz
```

## 🛠️ Technologie-Stack

- **Express.js** - Web-Framework
- **TypeScript** - Typsicherheit
- **Puppeteer** - Browser-Automatisierung für Web-Scraping
- **Node-Cron** - Zeitgesteuerte Aufgaben
- **Supabase** - Cloud-Datenbank (PostgreSQL)
- **Axios** - HTTP-Client für APIs
- **Cheerio** - Server-seitiges HTML-Parsing
- **Pino** - Strukturiertes Logging

## 🔄 Crawling-Prozess

1. **Mediathek-Navigation**: Puppeteer öffnet Show-Übersichtsseiten
2. **Episode-Extraktion**: Sammelt Links zu neuen Episoden
3. **Gäste-Analyse**: Extrahiert Gäste-Namen aus Beschreibungen
4. **Politiker-Validierung**: Abgleich mit abgeordnetenwatch.de API
5. **Datenbank-Speicherung**: Validierte Daten → Supabase
6. **Themen-Klassifikation**: KI-gestützte politische Themen-Analyse

## 🗃️ Datenbank-Schema

Das Backend arbeitet mit folgenden Supabase-Tabellen:

- `tv_show_politicians` - Politiker-Auftritte
- `show_links` - Episode-URLs
- `political_areas` - Themen-Kategorien
- `episode_political_areas` - Episode-Themen-Zuordnung

## 🔧 Konfiguration

### Browser-Setup (Puppeteer)

```typescript
// Optimierte Konfiguration für Server-Umgebungen
const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});
```

### Crawler-Fehlerbehandlung

- Automatische Wiederholungen bei Netzwerkfehlern
- Rate-Limiting für API-Aufrufe
- Graceful Degradation bei Parser-Problemen
- Ausführliche Logging für Debugging

## 🐛 Troubleshooting

### Häufige Probleme:

**Puppeteer startet nicht:**

```bash
# Linux: Chrome-Abhängigkeiten installieren
sudo apt-get install -y gconf-service libasound2 libatk1.0-0 libcairo2

# macOS: Keine zusätzlichen Schritte nötig
# Windows: Stelle sicher, dass Visual C++ Redistributable installiert ist
```

**Supabase-Verbindungsfehler:**

- Prüfe `SUPABASE_URL` und `SUPABASE_ANON_KEY`
- Überprüfe Supabase RLS-Policies
- Kontrolliere Netzwerk-/Firewall-Einstellungen

**Crawler findet keine Daten:**

- Websites können Layout-Änderungen haben
- Prüfe Browser-Logs in der Konsole
- Teste manuell mit `npm run dev` und einzelnen Endpunkten

## 📊 Monitoring & Logs

```bash
# Live-Logs anzeigen
npm run dev

# Crawler-Status prüfen
curl http://localhost:9000/

# Einzelnen Crawler testen
curl -X POST http://localhost:9000/api/crawl-lanz
```

## 📝 Logs & Debugging

Das System verwendet strukturiertes Logging:

```bash
# Beispiel-Log-Ausgabe
2025-10-18T10:00:00.000Z INFO: Starte Lanz Crawl...
2025-10-18T10:01:23.456Z INFO: Episode gefunden: 2025-10-17
2025-10-18T10:01:45.789Z INFO: ✅ Politiker: Angela Merkel (CDU)
2025-10-18T10:02:00.000Z INFO: Lanz Crawl abgeschlossen.
```

## 🔐 Sicherheit

- Keine API-Keys in Repository committet
- Rate-Limiting für externe APIs
- Input-Sanitization für alle Crawler-Daten
- Sichere Supabase RLS-Policies

## 📄 Lizenz

MIT License - siehe Frontend für Details.

---

Für Frontend-Integration siehe [../frontend/README.md](../frontend/README.md)
````
