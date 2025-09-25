# Markus Lanz Crawler Cron Job Setup

## Überblick

Dieser inkrementelle Crawler läuft automatisch jeden **Mittwoch, Donnerstag und Freitag um 1:00 Uhr nachts** und prüft auf neue Markus Lanz Episoden.

## Funktionsweise

1. **Intelligente Erkennung**: Prüft das Datum der neuesten Episode in der Datenbank
2. **Effizientes Crawling**: Crawlt nur neue Episoden (seit dem letzten DB-Eintrag)
3. **Automatische Speicherung**: Politiker werden automatisch in die Datenbank eingefügt
4. **Robuste Disambiguierung**: Nutzt ZDF-Partei-Info bei Namenskonflikten
5. **Vollständiges Logging**: Alle Aktivitäten werden protokolliert

## Dateien

- `src/crawler/lanz-incremental.ts` - Hauptcrawler für neue Episoden
- `scripts/lanz-crawler-cron.sh` - Bash-Script für Cron-Job
- `scripts/crontab-lanz.txt` - Cron-Konfiguration
- `logs/lanz-crawler-*.log` - Automatische Log-Dateien

## Installation

### 1. Cron-Job einrichten

```bash
# Aktuelle Crontab bearbeiten
crontab -e

# Folgende Zeile hinzufügen:
0 1 * * 3,4,5 /Users/username/tv/scripts/lanz-crawler-cron.sh

# Oder die vorgefertigte Konfiguration verwenden:
crontab /Users/username/tv/scripts/crontab-lanz.txt
```

### 2. Cron-Job prüfen

```bash
# Aktuelle Cron-Jobs anzeigen
crontab -l

# Cron-Service Status (macOS)
sudo launchctl list | grep cron
```

## Manueller Test

```bash
# Inkrementellen Crawler direkt testen
cd /Users/username/tv/backend
npx ts-node src/crawler/lanz-incremental.ts

# Cron-Script testen
/Users/username/tv/scripts/lanz-crawler-cron.sh
```

## Monitoring

### Log-Dateien

```bash
# Neueste Logs anzeigen
ls -la /Users/username/tv/logs/lanz-crawler-*.log | tail -5

# Live-Monitoring während Cron-Job
tail -f /Users/username/tv/logs/lanz-crawler-*.log
```

### Datenbank prüfen

```bash
# Letzte Episoden-Daten anzeigen
cd /Users/username/tv/backend
npx ts-node db-stats.ts

# Letzte Episode in DB
npx ts-node -e "
import { getLatestEpisodeDate } from './src/db-tv-shows';
console.log('Letzte Episode:', getLatestEpisodeDate('Markus Lanz'));
"
```

## Zeitplanung

**Standard: Mittwoch/Donnerstag/Freitag 1:00 Uhr**

- Markus Lanz läuft normalerweise **Dienstag, Mittwoch und Donnerstag**
- Der Crawler läuft am **nächsten Tag um 1:00 nachts**
- Dadurch werden neue Episoden am nächsten Morgen erfasst

**Alternative Zeiten** (in `crontab-lanz.txt` anpassen):

```bash
# Jeden Tag um 2:00 (falls unregelmäßige Sendetermine)
0 2 * * * /Users/username/tv/scripts/lanz-crawler-cron.sh

# Nur Donnerstag/Freitag/Samstag um 1:30
30 1 * * 4,5,6 /Users/username/tv/scripts/lanz-crawler-cron.sh
```

## Erwartete Ausgabe

### Keine neuen Episoden

```
✅ Keine neuen Episoden gefunden - alles aktuell!
📊 Zusammenfassung: 0 Episoden, 0 Politiker
```

### Neue Episode gefunden

```
🆕 Crawle 1 neue Episoden:
   📺 2025-09-26: https://www.zdf.de/video/talk/...
🎬 Verarbeite Episode vom 2025-09-26
👥 Gäste gefunden: Christian Lindner, Anna Lehmann
   🔍 Prüfe: Christian Lindner (FDP-Politiker)
   ✅ Politiker: ID 79408, Partei 4
   💾 1/1 Politiker gespeichert
📊 Zusammenfassung: 1 Episoden, 1 Politiker
```

## Troubleshooting

### Cron läuft nicht

```bash
# Cron-Service neu starten (macOS)
sudo launchctl unload /System/Library/LaunchDaemons/com.vixie.cron.plist
sudo launchctl load /System/Library/LaunchDaemons/com.vixie.cron.plist

# Cron-Logs prüfen (macOS)
grep CRON /var/log/system.log
```

### Pfad-Probleme

```bash
# Vollständige Pfade in Cron verwenden
which node
which npx
# Diese Pfade ggf. in lanz-crawler-cron.sh eintragen
```

### Permission-Probleme

```bash
# Script-Berechtigung prüfen
ls -la /Users/username/tv/scripts/lanz-crawler-cron.sh

# Ausführbar machen falls nötig
chmod +x /Users/username/tv/scripts/lanz-crawler-cron.sh
```

## Log-Cleanup

- **Automatisch**: Script löscht Logs älter als 30 Tage
- **Manuell**: `rm /Users/username/tv/logs/lanz-crawler-*.log` (alle löschen)

## Deaktivierung

```bash
# Cron-Job temporär deaktivieren (# vor die Zeile)
crontab -e

# Cron-Job komplett entfernen
crontab -r
```
