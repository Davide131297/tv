# Polittalk-Watcher – Android-App

Native Android-App (Kotlin, Jetpack Compose, Material 3) für den Polittalk-Watcher.
Sie nutzt **dasselbe Backend wie das Web-Frontend**: die öffentlichen Next.js-API-Routen
unter `https://polittalk-watcher.de/api/…` (siehe [`frontend/PUBLIC_API.md`](../frontend/PUBLIC_API.md)).
Es werden keine Supabase-Schlüssel oder API-Keys in der App benötigt.

## Seitenaufbau

Die Struktur folgt der Web-Navigation, umgesetzt mit einer App-typischen Bottom-Navigation:

| Bereich (Bottom-Bar) | Inhalt | Web-Pendant |
| --- | --- | --- |
| **Start** | Hero, Kennzahlen, Navigationskarten, letzte Auftritte | `/` |
| **Parteien** | Tabs *Übersicht* (Balken/Kreis, Union-Schalter, Aufschlüsselung) und *Zeitverlauf* (Liniendiagramm) | `/parteien`, `/parteien-zeitverlauf` |
| **Politiker** | Tabs *Datenbank* (Suche, Endlos-Liste), *Rankings*, *Vergleich* | `/politiker`, `/politiker-rankings`, `/politiker/vergleich` |
| **Sendungen** | Statistik-Kacheln und Episodenliste mit Gästen und Mediathek-Link | `/sendungen` |
| **Mehr** | Übersicht, Politische Themen, Einschaltquoten, Links auf Web-Seiten | `/uebersicht`, `/politische-themen`, `/einschaltquoten` |

Unterseiten (z. B. die Politiker-Detailseite, das App-Pendant zum `PoliticianModal`) öffnen sich mit
Zurück-Navigation. Alle Datenseiten haben die Filter *Sendung* und *Jahr* wie im Web sowie Pull-to-Refresh.
Hell-/Dunkelmodus folgt der Systemeinstellung.

## Verwendete Endpunkte

| Endpunkt | Verwendung |
| --- | --- |
| `GET /api/v1/politics?type=summary\|recent\|party-stats\|detailed-appearances\|episodes-with-politicians\|episode-statistics\|politician-rankings` | Kennzahlen, Listen, Rankings |
| `GET /api/v1/political-areas` | Politische Themen |
| `GET /api/v1/party-timeline` | Zeitverlauf |
| `GET /api/v1/politician-details` | Auftritte eines Politikers inkl. Episoden-Link |
| `GET /api/politician-comparison` | Direkt-Vergleich, Auftritte je Sendung |
| `GET /api/tv-ratings` | Einschaltquoten |

> `type=politician-rankings` wurde für die App in `frontend/app/api/v1/politics/route.ts` ergänzt
> (war in `PUBLIC_API.md` bereits dokumentiert). Rankings und Vergleich funktionieren gegen die
> Produktiv-API erst, nachdem das Frontend mit dieser Änderung deployed ist.

## Entwicklung

Voraussetzungen: Android Studio (oder Android SDK mit Plattform 36) und JDK 17+.

```bash
cd mobile
./gradlew :app:assembleDebug        # Debug-APK → app/build/outputs/apk/debug/
./gradlew :app:testDebugUnitTest    # Unit-Tests (Repository gegen echte API-Antworten als Fixtures)
./gradlew :app:lintDebug            # Android Lint
./gradlew :app:installDebug         # auf verbundenes Gerät/Emulator installieren
```

Gegen einen lokalen Next.js-Server (`npm run frontend`, Port 3000) aus dem Emulator heraus:

```bash
./gradlew :app:installDebug -Ppolittalk.apiBaseUrl=http://10.0.2.2:3000/
```

(Für reines HTTP muss dafür ggf. `android:usesCleartextTraffic="true"` im Debug-Manifest ergänzt werden.)

## Architektur

```
app/src/main/java/de/polittalkwatcher/app/
├── data/            Retrofit-API, Datenmodelle (kotlinx.serialization), Repository, AppContainer (DI)
├── ui/
│   ├── components/  Filterleiste, Kacheln, Badges, Diagramme (Compose Canvas), Scaffold
│   ├── navigation/  Typsichere Routen + Bottom-Navigation
│   ├── screens/     Ein Screen + ViewModel pro Seite
│   └── theme/       Farben (Tailwind-Palette des Webs), Material-3-Theme
├── MainActivity.kt
└── PolittalkApp.kt
```

- **MVVM**: Jedes ViewModel hält `UiState` (Loading/Success/Error) als `StateFlow`;
  `FilteredViewModel` kapselt die Sendungs-/Jahresfilter.
- **Diagramme** sind eigene Compose-Canvas-Komponenten (keine Chart-Bibliothek nötig).
- **Farben** für Parteien und Sendungen entsprechen `frontend/types.ts` bzw. `lib/party-colors.ts`.

## Versionen

AGP 8.13, Kotlin 2.4, compileSdk/targetSdk 36, minSdk 26. Neuere AndroidX-Versionen
(Compose BOM 2026.x, Navigation 2.10, Lifecycle 2.11, Core 1.19) setzen AGP 9 und compileSdk 37 voraus –
das ist ein eigener Migrationsschritt.
