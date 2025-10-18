# Polittalk-Watcher

Kurze Übersicht zu diesem Monorepo für das TV-Politik-Crawler- und Dashboard-Projekt.

## Inhalt

- backend/ — Node.js + TypeScript Crawler & API  
  (siehe [backend/README.md](backend/README.md) und Einstiegspunkt [backend/src/app.ts](backend/src/app.ts))
- frontend/ — Next.js Dashboard (React, Supabase)  
  (siehe [frontend/README.md](frontend/README.md))
- API_MIDDLEWARE.md — Dokumentation zur Middleware, Auth & Rate-Limits ([API_MIDDLEWARE.md](API_MIDDLEWARE.md))
- SUPABASE_MIGRATION.md — Hinweise zur Datenbank / Supabase ([SUPABASE_MIGRATION.md](SUPABASE_MIGRATION.md))
- package.json — Root-Scripts & Abhängigkeiten ([package.json](package.json))

## Voraussetzungen

- Node.js (siehe .nvmrc in frontend/ und backend/)
- npm
- Supabase-Instanz (für das Frontend / DB-Operationen)
- Hugging Face / HF-Keys für AI-Extraktion (siehe frontend/.env / backend/.env)

## Installation (lokal)

1. Repository klonen
   git clone <repo>
2. Abhängigkeiten installieren
   - frontend: cd frontend && npm install
   - backend: cd backend && npm install

## Environment

- frontend/.env und backend/.env enthalten secrets (Supabase, HF-Tokens, API-Keys).  
  Siehe [API_MIDDLEWARE.md](API_MIDDLEWARE.md) für erwartete Keys (CRAWL_API_KEY, POLITICS_API_KEY).
- Für Supabase siehe [SUPABASE_MIGRATION.md](SUPABASE_MIGRATION.md) für Schema/Hinweise.

## Lokales Entwickeln

- Frontend:
  - cd frontend
  - npm run dev
  - Öffne http://localhost:3000
- Backend:
  - cd backend
  - npm run dev (oder npm run start:dev)
  - API-Routen/Crawler werden in [backend/src/app.ts](backend/src/app.ts) registriert

Crawler-Trigger (Beispiele):

- Frontend-API Endpunkt für HAF: [frontend/app/api/crawl/haf/route.ts](frontend/app/api/crawl/haf/route.ts)
- Backend-Server-Endpoints in [backend/src/app.ts](backend/src/app.ts)

## Deployment

- Frontend: empfohlen Vercel (siehe [frontend/README.md](frontend/README.md)). Achte auf Umgebungsvariablen (NEXT*PUBLIC_SUPABASE*\* etc.).
- Backend: Node / Vercel-Serverless oder eigener Server; stelle sicher, dass Puppeteer/Browser-Setup in der Zielumgebung läuft.

## Nützliche Dateien / Einstiegspunkte

- Crawler-Implementationen: backend/src/crawler/_ und frontend/crawler/_ (z. B. [backend/src/crawler/haf.ts](backend/src/crawler/haf.ts))
- Browser-Konfiguration: [backend/src/lib/browser-configs.ts](backend/src/lib/browser-configs.ts)
- Utility-Funktionen (AI, Supabase): [backend/src/lib/utils.ts](backend/src/lib/utils.ts) und [frontend/lib/utils.ts](frontend/lib/utils.ts)
- Supabase-Server-Utilities (Inserts, Overrides): [frontend/lib/supabase-server-utils.ts](frontend/lib/supabase-server-utils.ts)

## Troubleshooting

- Auth / Middleware: siehe [API_MIDDLEWARE.md](API_MIDDLEWARE.md)
- DB / Migration: siehe [SUPABASE_MIGRATION.md](SUPABASE_MIGRATION.md)
- Fehlende Env-Variablen: überprüfe frontend/.env und backend/.env

## Beitrag & Tests

- Pre-commit Hooks sind konfiguriert (.husky/).
- Qualität: ESLint & TypeScript in jeweiligen Packages (siehe frontend/ und backend/ package.json).

---

Bei spezifischen Fragen zu Start, Crawler-Fehlern oder Umgebungsvariablen, siehe die verlinkten Dateien oben oder öffne die jeweiligen Module (z. B. [backend/src/crawler/haf.ts](backend/src/crawler/haf.ts), [frontend/crawler/maischberger.ts](frontend/crawler/maischberger.ts)).
