# Polittalk-Watcher — Mobile App

Native iOS- und Android-App (Expo / React Native) für den Polittalk-Watcher.
Sie visualisiert Auftritte von Politiker:innen in deutschen Polit-Talkshows,
Parteien­verteilung, Themen, Sendungen und Einschaltquoten.

Die App ist als eigenständige App gestaltet (native Tabs, große Titel,
Pull-to-Refresh, Haptik, Dark Mode) und keine Web-Kopie. Die Admin-/Datenbank­seite
der Web-App ist bewusst nicht enthalten.

## Funktionen

- **Übersicht** – KPIs, Parteien-Verteilung (Donut), Aktivität pro Monat, letzte Auftritte
- **Parteien** – Auftritte je Partei, Zeitverlauf der Top-Parteien, optional CDU/CSU als „Union“
- **Themen** – per KI klassifizierte Themenfelder
- **Politiker** – Ranking mit Suche, Detailseite mit den letzten Auftritten und Mediathek-Links
- **Sendungen** – Episoden je Show inkl. Gäste; auch Sarah Tacke, Phoenix Runde und Phoenix Persönlich
- **Einschaltquoten** – Zuschauer & Marktanteile, Rankings nach Reichweite
- **Globaler Filter** (Show, Jahr, Union) – wird auf dem Gerät gespeichert

## Stack

- **Expo SDK 57** (Managed Workflow / Continuous Native Generation) + **Expo Router**
- **TypeScript**, wiederverwendbare Komponenten (`components/ui/`)
- **@shopify/react-native-skia** für native Charts (Donut, Balken, Linien)
- **@tanstack/react-query** für Caching, Retry, Pull-to-Refresh und Refetch beim App-Wechsel
- **AsyncStorage** für die gespeicherte Filterauswahl, **expo-web-browser** für Mediathek-Links

## Datenquelle

Die App nutzt ausschließlich die öffentlichen, lesenden Endpunkte der Web-App —
**es wird kein API-Key benötigt** und nichts Geheimes landet im App-Bundle:

| Endpunkt | Verwendung |
| --- | --- |
| `/api/v1/politics?type=…` | Summary, Parteien, Auftritte, Sendungen, Politiker-Rankings |
| `/api/v1/political-areas` | Themen |
| `/api/v1/party-timeline` | Zeitverlauf der Parteien |
| `/api/v1/politician-details` | Letzte Auftritte einer Person |
| `/api/tv-ratings` | Einschaltquoten (mit `show`/`year`-Filter) |

Die Basis-URL kommt aus `EXPO_PUBLIC_API_BASE_URL` (Standard:
`https://polittalk-watcher.de`). Für lokale Entwicklung `.env.example` nach
`.env` kopieren; EAS-Builds setzen den Wert in `eas.json`.

> Voraussetzung: Die Web-App (`frontend/`) muss mindestens den Stand dieses
> Branches haben (öffentlicher Typ `politician-rankings` in `/api/v1/politics`
> und Filter-Parameter für `/api/tv-ratings`).

## Entwicklung

```bash
cd mobile
npm install          # kopiert via postinstall auch canvaskit.wasm nach public/ (Web)
npx expo start       # QR-Code scannen (Expo Go) oder Simulator starten
npm run ios          # iOS-Simulator
npm run android      # Android-Emulator
npm run web          # Web-Version
```

### Qualitätschecks

```bash
npm run ts-check     # TypeScript
npm run lint         # ESLint (eslint-config-expo)
npm test             # Jest (jest-expo)
npm run check        # alle drei
npm run doctor       # expo-doctor (SDK-Kompatibilität der Abhängigkeiten)
```

Die GitHub Action `.github/workflows/mobile-ci.yml` führt diese Checks bei
Änderungen unter `mobile/` automatisch aus und prüft, dass sich das
iOS- und Android-Bundle exportieren lässt.

## Builds & Veröffentlichung (EAS)

Profile sind in `eas.json` definiert:

| Profil | Zweck |
| --- | --- |
| `preview` | Interne Verteilung (Android als APK, iOS Ad-hoc) |
| `production` | Store-Builds, Build-Nummer wird automatisch hochgezählt (`appVersionSource: remote`) |

```bash
npm i -g eas-cli
eas login
eas build --profile preview --platform android
eas build --profile production --platform all
eas submit --profile production --platform ios   # bzw. android
```

Vor dem ersten Store-Release:

- Die EAS-Projekt-ID in `app.json` (`expo.extra.eas.projectId`) muss zum eigenen
  EAS-Account passen (`eas init` legt sie an bzw. prüft sie).
- Bundle Identifier / Package (`de.polittalkwatcher.app`) bei Bedarf anpassen.
- App-Icon und Splash (`assets/images/`) sind generierte Platzhalter
  (`node tools/gen-assets.js`) und sollten durch finale Grafiken ersetzt werden.
- Für `eas submit` die Store-Zugänge (App Store Connect API Key bzw.
  Google-Play-Service-Account) in EAS hinterlegen.

## Web

`npm run export:web` erzeugt eine statische Web-Version in `dist/`. Skia läuft im
Web über CanvasKit (WASM); die Datei `public/canvaskit.wasm` wird beim
`npm install` aus `canvaskit-wasm` kopiert und selbst gehostet (keine
Abhängigkeit zu einem CDN). Für Aufrufe aus dem Browser muss die Web-App die
Herkunft per CORS erlauben (siehe `frontend/next.config.ts`).

## Struktur

```
app/                 Expo-Router-Routen
  (tabs)/            Bottom-Tabs: Übersicht, Parteien, Themen, Politiker, Sendungen
  filter.tsx         Globales Show-/Jahr-Filter-Modal
  politiker/[name]   Politiker-Detail inkl. letzter Auftritte
  sendung/[date]     Sendungs-Detail
  einschaltquoten    Quoten-Dashboard
components/          Wiederverwendbare UI- und Domänen-Komponenten
  ui/                Card, Text, StatTile, SegmentedControl, Skeleton, QueryBoundary, ...
  charts/            Skia-Charts (Donut, Balken, Linie) + Legende + ChartBoundary
hooks/               React-Query-Hooks, Filter-Context (persistiert), Pull-to-Refresh
lib/                 API-Client, Typen, Theme, Parteifarben, Formatierung, Links
__tests__/           Jest-Unit-Tests
assets/images/       App-Icon, Splash, Adaptive Icon (per tools/gen-assets.js erzeugt)
```
