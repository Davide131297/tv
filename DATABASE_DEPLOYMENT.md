# Database Setup für Vercel Deployment

## Problem
SQLite-Datenbanken können in Vercel's serverless Umgebung nicht direkt verwendet werden, da das Dateisystem read-only ist und keine persistente Speicherung unterstützt.

## Lösung
Die Datenbank wird als statische Ressource im `public/` Ordner bereitgestellt und zur Laufzeit in das `/tmp` Verzeichnis kopiert.

## Setup

### 1. Lokale Entwicklung
- Die Datenbank liegt in `frontend/database/database.sqlite`
- Wird normal von better-sqlite3 verwendet

### 2. Production (Vercel)
- Die Datenbank wird nach `frontend/public/database.sqlite` kopiert
- Zur Laufzeit wird sie nach `/tmp/database.sqlite` kopiert
- Read-only Zugriff über better-sqlite3

## Deployment Workflow

### Automatisch (empfohlen)
```bash
cd frontend
npm run build  # führt automatisch sync-db aus
```

### Manuell
```bash
# Database synchronisieren
./scripts/sync-db.sh

# Oder direkt
cp frontend/database/database.sqlite frontend/public/database.sqlite

# Committen
git add frontend/public/database.sqlite
git commit -m "Update database for deployment"
git push
```

## Wichtige Hinweise

- ⚠️ **Read-only**: Die Datenbank ist in Production read-only
- 🔄 **Sync erforderlich**: Änderungen an der lokalen DB müssen manuell synchronisiert werden
- 📦 **Größe beachten**: Die Datenbankdatei wird Teil des Deployments
- 🔒 **Sicherheit**: Keine sensiblen Daten in die öffentliche Datenbank

## Alternative Lösungen (für die Zukunft)

### 1. Cloud-Datenbank
- PostgreSQL (Supabase, Vercel Postgres)
- MySQL (PlanetScale)
- MongoDB (Atlas)

### 2. Serverless Databases
- Vercel KV (Redis)
- Upstash Redis
- EdgeDB

### 3. Hybrid Approach
- API Backend mit eigener Datenbank
- Frontend als statische Site