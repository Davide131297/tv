# Frontend Architektur

Dieses Dokument beschreibt die technische Architektur der Frontend-Anwendung des Polittalk-Watchers.

## 🛠 Tech Stack

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router)
- **Sprache**: TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Komponenten**: [shadcn/ui](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Datenbank-Client**: [Supabase JS](https://supabase.com/docs/reference/javascript/introduction)
- **Charts**: [Chart.js](https://www.chartjs.org/) / [Recharts](https://recharts.org/)
- **Animationen**: [Framer Motion](https://www.framer.com/motion/)

## 📂 Projektstruktur

Die Anwendung folgt der modernen Next.js App Router Struktur:

```
frontend/
├── app/                    # App Router Pages & Layouts
│   ├── api/                # Backend API Routes (Next.js API)
│   ├── (routes)/           # Fachliche Routen (uebersicht, politiker, etc.)
│   ├── layout.tsx          # Root Layout (Navigation, Fonts, Metadata)
│   └── page.tsx            # Landing Page
├── components/             # React Komponenten
│   ├── ui/                 # Wiederverwendbare Basis-Komponenten (Buttons, Cards...)
│   └── [feature]/          # Feature-spezifische Komponenten (Charts, Tabellen)
├── lib/                    # Utilities & Helper
│   ├── supabase.ts         # Supabase Client Konfiguration
│   └── utils.ts            # Allgemeine Hilfsfunktionen (z.B. cn())
├── hooks/                  # Custom React Hooks
├── types.ts                # Globale TypeScript Definitionen
└── public/                 # Statische Assets (Bilder, Fonts)
```

## 🧩 Architektur-Konzepte

### Design System

Das UI basiert auf einem konsistenten Design-System:

- **Tailwind CSS**: Für Utility-First Styling.
- **Shadcn/UI**: Bietet zugängliche, ungestylte Komponenten als Basis, die wir mit Tailwind anpassen.
- **Responsive Design**: "Mobile First" Ansatz für alle Layouts.

### 4. Routing & Navigation

Die Hauptnavigation spiegelt die Ordnerstruktur in `app/` wider:

- `/uebersicht`: Dashboard mit KPIs
- `/politiker`: Tabelle und Details zu Politikern
- `/parteien`: Analysen zur Parteienverteilung
- `/sendungen`: Liste der gecrawlten Episoden
- `/politische-themen`: Themenanalysen

## 🔄 Datenfluss

1. **Crawler (Backend, Cloud Run)** -> Schreibt Daten in Supabase DB.
2. **Frontend** -> Interaktive Filterung und Sortierung der Daten im Browser.
