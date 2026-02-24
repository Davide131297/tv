# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Polittalk-Watcher** — A tool that automatically crawls, analyzes, and visualizes German political talk shows (Lanz, Illner, Miosga, Maischberger, Hart aber Fair, Pinar Atalay, Phoenix Runde, etc.). It tracks guest appearances, party representation, and discussed topics.

## Commands

### Development
```bash
# Run frontend dev server (port 3000)
npm run frontend
# or from frontend/ directory:
cd frontend && npm run dev

# Run linting + TypeScript check
npm run test-frontend
# or individually:
cd frontend && npm run lint
cd frontend && npm run ts-check

# Run jest tests
cd frontend && npm run test

# Production build
cd frontend && npm run build
```

### Package Manager
Yarn 4.9.2 is used. Use `yarn` commands inside `frontend/` or `backend/` directories.

## Architecture

### Active vs. Deprecated
- **`frontend/`** — The active, full application (Next.js 16 App Router). All new development happens here.
- **`backend/`** — **DEPRECATED** Express.js server. Do not modify.

### Data Flow
```
ZDF/ARD/RTL Mediathek websites
  → Puppeteer crawlers (frontend/crawler/*.ts)
  → Guest extraction + abgeordnetenwatch.de API validation
  → AI topic classification (Gemini / local LM Studio)
  → Supabase PostgreSQL
  → Next.js API routes (/api/politics, etc.)
  → React dashboard UI
```

### Frontend Structure (`frontend/`)

**Crawlers** (`frontend/crawler/*.ts`): One file per show. Each crawler uses Puppeteer to scrape the show's mediathek page, extracts politician guests, validates them against abgeordnetenwatch.de, and writes to Supabase. Shared utilities in `lib/crawler-utils.ts`.

**API Routes** (`frontend/app/api/`):
- `/api/crawl/[show]` — Trigger crawl for a specific show (POST). Protected by `CRAWL_API_KEY`.
- `/api/crawl/all` — Trigger all crawlers sequentially.
- `/api/politics` — Main data query endpoint (GET). Protected by `POLITICS_API_KEY`.
- `/api/threads-bot/`, `/api/embed-documents/` — Automation endpoints.

**Middleware** (`frontend/proxy.ts`): API key auth, IP-based rate limiting, HTTP method validation. Applied to all `/api/crawl/*`, `/api/politics`, `/api/threads-bot/*`, `/api/embed-documents/*` routes.

**UI Pages** (`frontend/app/`): German-language routes — `uebersicht/` (overview dashboard), `politiker/` (politicians table), `parteien/` (party stats), `sendungen/` (episodes), `politische-themen/` (topics), `politiker-rankings/` (rankings).

**Key libs**:
- `lib/supabase.ts` / `lib/supabase-server-utils.ts` — Database client
- `lib/browser-config.ts` — Puppeteer/Chrome configuration
- `lib/crawler-utils.ts` — Shared crawler helpers
- `lib/ai-utils.ts` — Gemini / LM Studio integration for topic classification
- `types.ts` — Central TypeScript type definitions

### Database (Supabase PostgreSQL)
Main tables: `tv_show_politicians` (guest appearances), `tv_show_episode_political_areas` (episode topics), `show_links` (episode URLs), `political_areas` (topic categories).

### Automation (GitHub Actions)
- **`crawl-weekly.yml`** — Calls `/api/crawl/all` every Monday at 2 AM UTC
- **`threads-weekly.yml` / `threads-monthly.yml`** — Posts stats to Threads social media
- **`nightly-embed.yml`** — Nightly document embedding for AI search
- **`deploy-cloud-run.yml`** — Deploys backend Docker image to Google Cloud Run (triggered on backend changes to main)

## Environment Variables

Frontend (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_POLITICS_API_KEY
CRAWL_API_KEY
GEMINI_API_KEY
```

## Key Conventions

- All crawler files follow the same pattern: fetch episode list → for each episode, extract guests → validate against abgeordnetenwatch → classify topics via AI → upsert to Supabase.
- The frontend uses Next.js App Router with server components where possible; client components are marked `"use client"`.
- TailwindCSS v4 with shadcn/ui components (in `components/ui/`).
- German is used for route names, UI labels, and most comments/variable names related to show names or political topics.
