# Polittalk-Watcher

Monorepo fuer `polittalk-watcher.de`. Das Projekt analysiert politische TV-Talkshows in Deutschland und stellt die Daten als Next.js-Webanwendung, interne API-Routen und oeffentliche `v1`-API bereit.

Das `frontend/` liefert die Webanwendung und die API-Oberflaeche. Das separate `backend/` laeuft als Crawler-Service auf Google Cloud Run und automatisiert den Abruf sowie die Speicherung der Daten aus den Mediatheken.

## Repo-Struktur

```text
.
├── frontend/              # Hauptanwendung (Next.js 16, App Router)
├── backend/               # Express/TypeScript Crawler-Service fuer Google Cloud Run
├── SUPABASE_MIGRATION.md  # Notizen zur Supabase-Migration
├── API_MIDDLEWARE.md      # Doku zur API-Absicherung
└── README.md
```

## Was im Frontend steckt

`frontend/` enthaelt nicht nur die UI, sondern auch den Web- und API-Teil der Anwendung:

- Seiten fuer Uebersicht, Parteien, Politiker, Rankings, Themen, Sendungen und Admin
- API-Routen unter `frontend/app/api/*`
- oeffentliche API unter `frontend/app/api/v1/*`
- interne Crawler-Endpunkte unter `frontend/app/api/crawl/*`
- Chat-, Embedding- und Automations-Endpunkte
- Supabase-Anbindung
- lokale/remote KI-Integration fuer Themen- und Chat-Funktionen

Die automatisierte Erfassung und Speicherung neuer Mediathek-Daten laeuft dagegen ueber das `backend/` als separaten Crawler-Service auf Google Cloud Run.

Relevante Routen im Frontend:

- `/`
- `/uebersicht`
- `/parteien`
- `/parteien-zeitverlauf`
- `/politiker`
- `/politiker/vergleich`
- `/politiker-rankings`
- `/politische-themen`
- `/sendungen`
- `/datenbank`
- `/admin`
- `/api-docs`

## Technologie-Stack

- Frontend: Next.js 16, React 19, TypeScript
- UI: Tailwind CSS 4, Radix UI, Recharts
- Daten: Supabase
- Crawling: Puppeteer / Chromium
- KI: Google GenAI, optional lokales LLM
- Backend-Service: Express + TypeScript
- Deployment: Google Cloud Run

## Entwicklung starten

Empfohlen ist `npm`, weil im Repo `package-lock.json` verwendet wird.

### 1. Abhaengigkeiten installieren

Im Root:

```bash
npm install
```

Im Frontend:

```bash
cd frontend
npm install
```

Optional fuer den lokalen Crawler-Service:

```bash
cd backend
npm install
```

### 2. Frontend starten

Aus dem Root:

```bash
npm run frontend
```

Oder direkt:

```bash
cd frontend
npm run dev
```

Standardmaessig laeuft Next.js lokal auf `http://localhost:3000`.

### 3. Backend lokal starten

Wenn du den Crawler-Service lokal entwickeln oder testen willst:

```bash
npm run backend
```

Oder:

```bash
cd backend
npm run dev
```

Der Express-Server verwendet standardmaessig Port `8080`. In Produktion laeuft dieser Service auf Google Cloud Run und uebernimmt dort die automatisierte Verarbeitung der Mediathek-Daten.

## Root-Skripte

Im Root stehen nur Delegations- und Hilfsskripte:

```bash
npm run frontend        # startet frontend/dev
npm run backend         # startet backend/dev lokal
npm run test-frontend   # lint + ts-check im Frontend
npm run test-backend    # TypeScript-Build im Backend
```

### Frontend / Next.js

Pflicht fuer Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Je nach genutzten Features zusaetzlich:

```env
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_POLITICS_API_KEY=
CRAWL_API_KEY=
ADMIN_DASHBOARD_PASSWORD=
ADMIN_PASSWORD=
GOOGLE_GENAI_API_KEY=
GOOGLE_AI_MODEL=
GOOGLE_SITE_VERIFICATION=
NEXT_PUBLIC_GA_ID=
NEXT_PUBLIC_CHATBOXLive=
LokalLLM=
```

### Backend / Crawler-Service

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
PORT=8080
POLITICS_API_KEY=
GOOGLE_AI_MODEL=
LokalLLM=
```

## API-Hinweise

Die aktive Web-API liegt im Frontend unter `frontend/app/api`.

- interne Endpunkte: `/api/*`
- oeffentliche Endpunkte: `/api/v1/*`
- Dokumentation: `frontend/PUBLIC_API.md` und die Seite `/api-docs`

Die automatisierten Abrufe aus den Mediatheken sowie das Schreiben der gewonnenen Daten in Supabase laufen ueber den separaten Backend-Service auf Google Cloud Run.

Im Middleware-/Proxy-Layer werden u. a. diese Routen geschuetzt bzw. limitiert:

- `/api/crawl/*`
- `/api/politics`
- `/api/threads-bot/*`
- `/api/embed-documents/*`

## Projektstatus

- `frontend/` ist der aktuelle Hauptpfad fuer die Webanwendung, UI-Entwicklung und API-Routen.
- `backend/` ist der Crawler-Service fuer die automatisierte Erfassung und Speicherung von Mediathek-Daten auf Google Cloud Run.
- Im Repo liegt ausserdem eine unversionierte Datei `ard-nutzungsbedingungen.png`, die nicht Teil der README-Aenderung ist.

## Weiterfuehrende Dateien

- `frontend/README.md`
- `backend/README.md`
- `frontend/PUBLIC_API.md`
- `SUPABASE_MIGRATION.md`
- `API_MIDDLEWARE.md`
