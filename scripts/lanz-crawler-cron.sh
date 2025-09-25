#!/bin/bash

# Markus Lanz Crawler Cron Job
# Läuft jeden Mittwoch, Donnerstag und Freitag um 1:00 Uhr nachts

# Script-Verzeichnis ermitteln
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Wechsle ins Backend-Verzeichnis
cd "$PROJECT_DIR/backend" || {
    echo "❌ Fehler: Backend-Verzeichnis nicht gefunden: $PROJECT_DIR/backend"
    exit 1
}

# Log-Datei mit Datum
LOG_DATE=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="$PROJECT_DIR/logs/lanz-crawler-$LOG_DATE.log"

# Erstelle Logs-Verzeichnis falls es nicht existiert
mkdir -p "$PROJECT_DIR/logs"

# Funktion für strukturiertes Logging
log() {
    local level="$1"
    shift
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*" | tee -a "$LOG_FILE"
}

# Script starten
log "INFO" "🚀 Starte Markus Lanz Crawler Cron Job"
log "INFO" "📍 Arbeitsverzeichnis: $(pwd)"
log "INFO" "📝 Log-Datei: $LOG_FILE"

# Node.js Version prüfen
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    log "INFO" "📦 Node.js Version: $NODE_VERSION"
else
    log "ERROR" "❌ Node.js nicht gefunden!"
    exit 1
fi

# NPX verfügbar?
if command -v npx &> /dev/null; then
    log "INFO" "✅ NPX verfügbar"
else
    log "ERROR" "❌ NPX nicht gefunden!"
    exit 1
fi

# Prüfe ob TypeScript-Datei existiert
CRAWLER_FILE="src/crawler/lanz-incremental.ts"
if [[ ! -f "$CRAWLER_FILE" ]]; then
    log "ERROR" "❌ Crawler-Datei nicht gefunden: $CRAWLER_FILE"
    exit 1
fi

# Starte den inkrementellen Crawler
log "INFO" "🎬 Starte inkrementellen Markus Lanz Crawler..."

if npx ts-node "$CRAWLER_FILE" >> "$LOG_FILE" 2>&1; then
    log "INFO" "✅ Crawler erfolgreich abgeschlossen"
    
    # Zeige Zusammenfassung aus dem Log
    if grep -q "Episoden verarbeitet:" "$LOG_FILE"; then
        EPISODES_PROCESSED=$(grep "Episoden verarbeitet:" "$LOG_FILE" | tail -1 | sed 's/.*Episoden verarbeitet: //')
        POLITICIANS_INSERTED=$(grep "Politiker eingefügt:" "$LOG_FILE" | tail -1 | sed 's/.*Politiker eingefügt: //')
        
        log "INFO" "📊 Zusammenfassung: $EPISODES_PROCESSED Episoden, $POLITICIANS_INSERTED Politiker"
        
        # Bei neuen Episoden: Notification senden (optional)
        if [[ "$EPISODES_PROCESSED" -gt 0 ]]; then
            log "INFO" "🆕 Neue Episoden gefunden! Episoden: $EPISODES_PROCESSED, Politiker: $POLITICIANS_INSERTED"
            
            # Hier könnte man zusätzlich eine E-Mail oder Slack-Notification senden
            # curl -X POST -H 'Content-type: application/json' \
            #   --data '{"text":"🎬 Neue Markus Lanz Episode: '"$EPISODES_PROCESSED"' Episoden, '"$POLITICIANS_INSERTED"' Politiker gefunden!"}' \
            #   $SLACK_WEBHOOK_URL
        fi
    fi
    
    # Cleanup: Behalte nur die letzten 30 Log-Dateien
    find "$PROJECT_DIR/logs" -name "lanz-crawler-*.log" -type f -mtime +30 -delete 2>/dev/null || true
    
    exit 0
else
    log "ERROR" "❌ Crawler ist fehlgeschlagen"
    
    # Bei Fehler: letzte Zeilen des Logs zeigen
    log "ERROR" "📋 Letzte Log-Einträge:"
    tail -10 "$LOG_FILE" | while read line; do
        log "ERROR" "   $line"
    done
    
    exit 1
fi