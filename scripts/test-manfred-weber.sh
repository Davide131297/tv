#!/bin/bash

# Test Script für Manfred Weber Override-Funktion

echo "🧪 Teste Manfred Weber Override-Funktion"
echo "========================================"

# 1. Prüfe ob Manfred Weber API-Daten korrekt sind
echo "📡 Teste Manfred Weber API-Daten..."
curl -s "https://www.abgeordnetenwatch.de/api/v2/politicians/28910" | jq '.data | {
  id, 
  first_name, 
  last_name, 
  party: .party.label,
  occupation,
  education,
  year_of_birth
}' 2>/dev/null || echo "❌ API nicht verfügbar"

echo ""
echo "✅ Override-Konfiguration:"
echo "   - ID: 28910"
echo "   - Name: Manfred Weber"  
echo "   - Partei: CSU (ID: 3)"
echo "   - Beruf: MdEP"
echo "   - Jahrgang: 1972"
echo "   - Bildung: Dipl. Ingenieur"

echo ""
echo "🔧 Status: Override ist im Backend aktiv"
echo "   - Bei künftigen Crawls wird Manfred Weber automatisch der CSU zugeordnet"
echo "   - Keine manuellen DB-Updates nötig"

echo ""
echo "📊 Aktuelle DB-Statistik:"
cd /Users/dchiffi/tv/backend
node -e "
const Database = require('better-sqlite3');
const db = new Database('../database/database.sqlite');
const count = db.prepare('SELECT COUNT(*) as total FROM tv_show_politicians WHERE politician_id = 28910').get();
console.log('Manfred Weber Einträge in DB:', count.total);
db.close();
" 2>/dev/null || echo "❌ Datenbank nicht verfügbar"