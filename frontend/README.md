# TV Politik Dashboard - Frontend

Interaktives Web-Dashboard zur Analyse der Politik-Landschaft in deutschen Talkshows mit React, Next.js und modernen UI-Komponenten.

## 🎯 Projektübersicht

Das TV Politik Dashboard visualisiert und analysiert Politiker-Auftritte in den wichtigsten deutschen Politik-Talkshows:

- **📺 Markus Lanz** (ZDF)
- **🗣️ Maybrit Illner** (ZDF)
- **📰 Caren Miosga** (ARD)
- **💬 Maischberger** (ARD)
- **⚖️ Hart aber fair** (ARD)
- **📺 Pinar Atalay** (RTL/NTV)
- **🗣️ Phoenix Runde** (Phoenix)

### Features

- 📊 **Interaktive Statistiken** - Charts, Tabellen und Dashboards
- 🔍 **Erweiterte Filter** - Nach Show, Partei, Zeitraum
- 📱 **Responsive Design** - Mobile-First Approach
- ⚡ **Real-time Updates** - Automatische Datenaktualisierung
- 🎨 **Moderne UI** - TailwindCSS + Radix UI Komponenten

## 📁 Projektstruktur

```
frontend/
├── app/                          # Next.js App Router
│   ├── globals.css              # Globale Styles
│   ├── layout.tsx               # Root Layout
│   ├── page.tsx                 # Homepage
│   ├── api/                     # API Routes (Backend Integration)
│   │   ├── database-entries/route.ts # DB-Verwaltung
│   │   ├── political-areas/route.ts  # Politische Themen
│   │   └── politics/route.ts    # Hauptdaten-API
│   ├── datenbank/page.tsx       # Datenbankübersicht
│   ├── parteien/page.tsx        # Partei-Statistiken
│   ├── politiker/page.tsx       # Politiker-Tabelle
│   ├── politiker-rankings/page.tsx # Politiker-Rankings
│   ├── politische-themen/page.tsx  # Themen-Analysen
│   ├── sendungen/page.tsx       # Sendungsübersicht
│   ├── uebersicht/page.tsx      # Dashboard-Übersicht
│   ├── datenschutz/page.tsx     # Datenschutz
│   └── impressum/page.tsx       # Impressum
├── components/                   # React Komponenten
│   ├── EnhancedPoliticsStats.tsx # Erweiterte Statistiken
│   ├── Footer.tsx               # Seitenfuß
│   ├── LastShowTable.tsx        # Letzte Sendungen
│   ├── Navigation.tsx           # Hauptnavigation
│   ├── OverviewPageContent.tsx  # Übersichts-Content
│   ├── PartyChart.tsx           # Partei-Diagramme
│   ├── PoliticalAreasChart.tsx  # Themen-Charts
│   ├── PoliticianRankings.tsx   # Politiker-Rankings
│   ├── PoliticianTable.tsx      # Politiker-Tabelle
│   ├── PoliticsStats.tsx        # Basis-Statistiken
│   ├── SearchParamsSuspense.tsx # URL-Parameter-Handling
│   ├── ShowOptionsButtons.tsx   # Show-Filter-Buttons
│   ├── database/                # Datenbank-Komponenten
│   │   └── DatabaseEntries.tsx  # DB-Einträge-Verwaltung
│   └── ui/                      # Basis-UI-Komponenten
│       ├── button.tsx           # Button-Komponente
│       ├── card.tsx             # Card-Layout
│       ├── chart.tsx            # Chart-Wrapper
│       ├── dialog.tsx           # Modal-Dialoge
│       ├── dropdown-menu.tsx    # Dropdown-Menüs
│       ├── input-group.tsx      # Input-Gruppierung
│       ├── input.tsx            # Text-Inputs
│       ├── navigation-menu.tsx  # Navigation-Menü
│       ├── select.tsx           # Select-Komponenten
│       ├── switch.tsx           # Toggle-Switches
│       ├── textarea.tsx         # Textareas
│       └── tooltip.tsx          # Tooltips
├── lib/                         # Utility-Bibliotheken
│   ├── db.ts                    # Datenbank-Utils
│   ├── server-utils.ts          # Server-Utilities
│   ├── supabase-server-utils.ts # Supabase Server-Utils
│   ├── supabase.ts              # Supabase Client
│   └── utils.ts                 # Allgemeine Utils
├── public/                      # Statische Assets
├── types.ts                     # TypeScript-Definitionen
├── components.json              # shadcn/ui Konfiguration
├── middleware.ts                # Next.js Middleware
├── next.config.ts               # Next.js Konfiguration
├── package.json                 # Dependencies & Scripts
├── postcss.config.mjs           # PostCSS Konfiguration
├── tailwind.config.ts           # TailwindCSS Konfiguration
└── tsconfig.json                # TypeScript Konfiguration
```

## ⚙️ Installation & Setup

### Voraussetzungen

- **Node.js** 18+ (empfohlen: 20+)
- **npm/yarn/pnpm**
- **Supabase** Account & Projekt

### 1. Repository klonen

```bash
cd frontend
npm install
```

### 2. Umgebungsvariablen konfigurieren

Erstelle `.env.local`:

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# API Keys (Optional) – CRAWL_API_KEY schützt Bot- und Embedding-Routen
CRAWL_API_KEY=your_secure_api_key
POLITICS_API_KEY=your_politics_api_key

# Hugging Face (Optional - für AI-Features)
HUGGING_FACE_API_KEY=your_hf_api_key

# Database (nur für lokale SQLite, wenn nicht Supabase)
DATABASE_URL=file:./database.db
```

### 3. Supabase-Setup

Siehe [SUPABASE_MIGRATION.md](../SUPABASE_MIGRATION.md) für detaillierte Anweisungen.

Wichtigste Tabellen:

```sql
-- Politiker-Auftritte
CREATE TABLE tv_show_politicians (
  id SERIAL PRIMARY KEY,
  show_name TEXT NOT NULL,
  episode_date DATE NOT NULL,
  politician_name TEXT NOT NULL,
  party_name TEXT,
  politician_id INTEGER,
  party_id INTEGER
);

-- Show-Links
CREATE TABLE show_links (
  id SERIAL PRIMARY KEY,
  show_name TEXT NOT NULL,
  episode_date DATE NOT NULL,
  episode_url TEXT NOT NULL
);
```

## 🚀 Entwicklung

### Development Server starten

```bash
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000) im Browser.

### Weitere Scripts

```bash
# Produktions-Build
npm run build

# Produktions-Server
npm run start

# Linting
npm run lint

# TypeScript-Check
npm run ts-check

# Tests
npm run test
```

## 🎨 Design-System

### TailwindCSS + Radix UI

Das Projekt verwendet ein modernes Design-System:

- **TailwindCSS** - Utility-First CSS Framework
- **Lucide React** - Icon-Bibliothek
- **shadcn/ui** - Komponenten-Sammlung

## 📊 Dashboard-Bereiche

### 🏠 Homepage (`/`)

- Hero-Section mit Projektübersicht
- Navigation zu allen Bereichen
- Feature-Highlights

### 📈 Übersicht (`/uebersicht`)

- Gesamt-Statistiken aller Shows
- Trend-Analysen
- Key Performance Indicators

### 📊 Parteien (`/parteien`)

- Interaktive Partei-Verteilungs-Charts
- Pie-Charts und Bar-Charts
- Filter nach Show und Zeitraum

### 👥 Politiker (`/politiker`)

- Durchsuchbare Tabelle aller Auftritte
- Sortierung nach verschiedenen Kriterien
- Links zu abgeordnetenwatch.de

### 🏆 Politiker-Rankings (`/politiker-rankings`)

- Top-Listen nach Auftritts-Häufigkeit
- Show-spezifische Rankings
- Trend-Analysen

### 🗂️ Politische Themen (`/politische-themen`)

- KI-gestützte Themen-Klassifikation
- Heatmaps und Trend-Analysen
- Themen-Verteilung pro Show

### 📺 Sendungen (`/sendungen`)

- Chronologische Sendungsübersicht
- Episode-Details und Gäste-Listen
- Verlinkung zu Mediatheken

### 🗄️ Datenbank (`/datenbank`)

- Admin-Interface für Datenbank-Operationen
- Crawler-Status und -Kontrolle
- Daten-Export-Funktionen

## 🔗 API Integration

### Frontend API Routes

Das Frontend stellt mehrere API-Endpunkte bereit:

#### Politics API (`/api/politics`)

```typescript
// Basis-Statistiken
GET /api/politics?type=party-stats&show=Markus%20Lanz

// Episoden mit Politiker-Anzahl
GET /api/politics?type=episodes&limit=50

// Letzte Auftritte
GET /api/politics?type=recent&limit=20

// Detaillierte Auftritte mit Paginierung
GET /api/politics?type=detailed-appearances&limit=100&offset=0

// Politiker-Rankings
GET /api/politics?type=politician-rankings&show=all&limit=50

// Gesamt-Zusammenfassung
GET /api/politics?type=summary&show=all
```

#### Crawler

Das Crawling läuft ausschließlich im Backend (`backend/`, Cloud Run).

#### Weitere APIs

```typescript
// Datenbank-Einträge verwalten
GET / api / database - entries;
DELETE / api / database - entries;

// Politische Bereiche
GET / api / political - areas;
```

## 🎯 Komponenten-Details

### Interaktive Charts

```typescript
// PartyChart.tsx - Partei-Verteilungs-Diagramme
<PartyChart
  showName="Markus Lanz"
  chartType="pie"
  interactive={true}
/>

// PoliticalAreasChart.tsx - Themen-Analysen
<PoliticalAreasChart
  timeRange="last-6-months"
  showComparison={true}
/>
```

### Daten-Tabellen

```typescript
// PoliticianTable.tsx - Erweiterte Politiker-Tabelle
<PoliticianTable
  initialShow="all"
  pageSize={20}
  enableSearch={true}
  enableExport={true}
/>
```

### URL-basierte Filter

Das Frontend unterstützt URL-Parameter für Deep-Linking:

```
/politiker?show=Markus%20Lanz&search=merkel
/parteien?show=all&timeRange=2025
/politik-rankings?show=Maybrit%20Illner&limit=50
```

### Erweiterte Suche

- **Volltext-Suche** in Politiker-Namen
- **Partei-Filter** mit Multi-Select
- **Datums-Filter** mit Bereichen
- **Show-Filter** mit Einzelauswahl
- **Kombinierte Filter** mit UND-Verknüpfung

## 📱 Responsive Design

### Breakpoints

```css
/* Mobile First Approach */
sm: 640px   /* Small screens */
md: 768px   /* Medium screens */
lg: 1024px  /* Large screens */
xl: 1280px  /* Extra large screens */
2xl: 1536px /* 2X large screens */
```

### Mobile Optimierungen

- **Touch-freundliche** Button-Größen
- **Optimierte Tabellen** mit Card-Layout auf Mobile
- **Swipe-Gesten** für Navigation
- **Progressive Enhancement** für bessere Performance

## ⚡ Performance-Optimierungen

### Next.js Features

- **App Router** - Server Components & Client Components
- **Image Optimization** - Automatische Bildoptimierung
- **Font Optimization** - Web-Font-Optimierung
- **Bundle Splitting** - Automatisches Code-Splitting

### Daten-Strategien

- **Static Generation** für statische Seiten
- **Incremental Static Regeneration** für Daten-Updates
- **Client-Side Caching** für API-Responses
- **Lazy Loading** für Charts und große Komponenten

### Build-Optimierungen

```bash
# Turbopack für schnellere Builds
npm run dev --turbo

# Bundle-Analyse
npm run build && npm run analyze
```

## 🔐 Sicherheit & Middleware

### API-Schutz

```typescript
// middleware.ts - Rate Limiting & Auth
export function proxy(request: NextRequest) {
  // API Key Validation
  // Rate Limiting
  // CORS Headers
}
```

---

### 🔗 Links

- **Backend-Dokumentation**: [../backend/README.md](../backend/README.md)
- **API-Middleware**: [../API_MIDDLEWARE.md](../API_MIDDLEWARE.md)
- **Supabase-Migration**: [../SUPABASE_MIGRATION.md](../SUPABASE_MIGRATION.md)
- **Next.js Dokumentation**: [https://nextjs.org/docs](https://nextjs.org/docs)
- **TailwindCSS**: [https://tailwindcss.com](https://tailwindcss.com)
- **Radix UI**: [https://www.radix-ui.com](https://www.radix-ui.com)

```

```
