# Polittalk-Watcher — Mobile App

Native iOS- und Android-App (Expo / React Native) für den Polittalk-Watcher.
Sie visualisiert Auftritte von Politiker:innen in deutschen Polit-Talkshows,
Parteien­verteilung, Themen, Sendungen und Einschaltquoten.

Die App ist als eigenständige App gestaltet (native Tabs, große Titel,
Pull-to-Refresh, Haptik, Dark Mode) und keine Web-Kopie. Die Admin-/Datenbank­seite
der Web-App ist bewusst nicht enthalten.

## Stack

- **Expo SDK 52** (Managed Workflow) + **Expo Router** (file-based Navigation)
- **TypeScript**, wiederverwendbare Komponenten (`components/ui/`)
- **@shopify/react-native-skia** für native Charts (Donut, Balken, Linien)
- **@tanstack/react-query** für Caching, Pull-to-Refresh und Fehler-States

## Datenquelle

Die App konsumiert die bestehende Polittalk-Watcher-API. Konfiguration über
Umgebungsvariablen — `.env.example` nach `.env` kopieren und ausfüllen:

```
EXPO_PUBLIC_API_BASE_URL=https://polittalk-watcher.de
EXPO_PUBLIC_POLITICS_API_KEY=
```

- Die meisten Daten kommen über die öffentlichen Endpunkte
  `/api/v1/politics`, `/api/political-areas`, `/api/party-timeline` und
  `/api/tv-ratings` — **ohne API-Key**.
- Für die (optionalen) Politiker-Rankings nutzt die App `/api/politics`.
  Dieser Endpunkt ist per Key geschützt. Trage dafür in
  `EXPO_PUBLIC_POLITICS_API_KEY` denselben Wert wie `NEXT_PUBLIC_POLITICS_API_KEY`
  der Web-App ein (`frontend/.env`).

> Der neue Endpunkt `/api/tv-ratings` wurde im `frontend/`-Projekt ergänzt,
> damit die Einschaltquoten auch mobil verfügbar sind.

## Entwicklung

```bash
cd mobile
npm install          # oder: yarn
npx expo start       # QR-Code scannen (Expo Go) oder Simulator starten
npm run ios          # iOS-Simulator
npm run android      # Android-Emulator
npm run ts-check     # TypeScript prüfen
```

## Builds (EAS)

Profile sind in `eas.json` definiert (`development`, `preview`, `production`).

```bash
npm i -g eas-cli
eas login
eas build --profile preview --platform ios
eas build --profile production --platform android
```

Vor dem ersten Build:

- `expo.extra.eas.projectId` in `app.json` durch die echte EAS-Projekt-ID
  ersetzen (`eas init` legt sie an).
- Bundle Identifier / Package (`de.polittalkwatcher.app`) bei Bedarf anpassen.

## Struktur

```
app/                 Expo-Router-Routen
  (tabs)/            Bottom-Tabs: Übersicht, Parteien, Themen, Politiker, Sendungen
  filter.tsx         Globales Show-/Jahr-Filter-Modal
  politiker/[name]   Politiker-Detail
  sendung/[date]     Sendungs-Detail
  einschaltquoten    Quoten-Ranking
components/          Wiederverwendbare UI- und Domänen-Komponenten
  ui/                Card, Text, StatTile, SegmentedControl, Skeleton, ...
  charts/            Skia-Charts (Donut, Balken, Linie) + Legende
hooks/               React-Query-Hooks, Filter-Context, Pull-to-Refresh
lib/                 API-Client, Typen, Theme, Parteifarben, Formatierung
assets/images/       App-Icon, Splash, Adaptive Icon (per tools/gen-assets.js erzeugt)
```

## Assets neu generieren

```bash
node tools/gen-assets.js
```

Erzeugt einfache, markenkonforme Platzhalter-Icons. Für den Store durch echte
Grafiken ersetzen.
