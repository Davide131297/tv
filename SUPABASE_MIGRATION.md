# Migration zu Supabase - Übersicht

## ✅ Durchgeführte Änderungen

### 1. Supabase Client Installation

- `@supabase/supabase-js` wurde installiert
- Neue Supabase-Konfiguration in `/lib/supabase.ts` erstellt

### 2. Umstellung der Datenbank-Integration

#### Neue Dateien:

- `/lib/supabase.ts` - Supabase Client Konfiguration und Typen
- `/lib/supabase-server-utils.ts` - Serverside Utilities für Supabase
- `.env.local.example` - Beispiel für Umgebungsvariablen

#### Aktualisierte Dateien:

- `/app/api/politics/route.ts` - Komplett auf Supabase umgestellt
- `/app/api/crawl/maischberger/route.ts` - Server-Utils auf Supabase umgestellt
- `/app/api/crawl/lanz/route.ts` - Server-Utils auf Supabase umgestellt
- `/app/api/crawl/illner/route.ts` - Server-Utils auf Supabase umgestellt
- `/app/api/crawl/miosga/route.ts` - Server-Utils auf Supabase umgestellt

### 3. Benötigte Umgebungsvariablen

Du musst folgende Variablen in deiner `.env.local` Datei setzen:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 4. Supabase Tabellen-Schema

Die Anwendung erwartet eine Tabelle `tv_show_politicians` mit folgenden Spalten:

```sql
CREATE TABLE tv_show_politicians (
  id SERIAL PRIMARY KEY,
  show_name TEXT NOT NULL,
  episode_date DATE NOT NULL,
  politician_name TEXT NOT NULL,
  party_name TEXT,
  politician_id INTEGER,
  party_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraint: Ein Politiker kann nur einmal pro Sendung/Datum erscheinen
  UNIQUE(show_name, episode_date, politician_id)
);

-- Indices für bessere Performance
CREATE INDEX idx_tv_show_politicians_show_date ON tv_show_politicians(show_name, episode_date);
CREATE INDEX idx_tv_show_politicians_politician ON tv_show_politicians(politician_id);
CREATE INDEX idx_tv_show_politicians_party ON tv_show_politicians(party_id);
```

### 5. API-Funktionalität

Alle bestehenden API-Endpunkte funktionieren weiterhin gleich:

#### Politics API (`/api/politics`)

- `GET /api/politics?type=party-stats` - Partei-Statistiken
- `GET /api/politics?type=episodes` - Episoden mit Politiker-Anzahl
- `GET /api/politics?type=recent` - Letzte Auftritte
- `GET /api/politics?type=summary` - Gesamt-Statistiken
- `GET /api/politics?type=detailed-appearances` - Detaillierte Auftritte
- `GET /api/politics?type=shows` - Liste der Shows

#### Crawler APIs

- `POST /api/crawl/maischberger` - Maischberger Crawler
- `POST /api/crawl/lanz` - Lanz Crawler
- `POST /api/crawl/illner` - Illner Crawler
- `POST /api/crawl/miosga` - Miosga Crawler
- `DELETE /api/crawl/maischberger` - Lösche Maischberger Daten

### 6. Änderungen in der Funktionsweise

#### Supabase vs. SQLite Unterschiede:

- **Upserts**: Verwendet jetzt Supabase's `upsert()` anstatt SQLite's `INSERT OR IGNORE`
- **Async/Await**: Alle Datenbankoperationen sind jetzt asynchron
- **Fehlerbehandlung**: Verbesserte Fehlerbehandlung mit Supabase-spezifischen Fehlern
- **Batch-Operations**: Bessere Performance durch Batch-Inserts
- **Type Safety**: Verbesserte TypeScript-Typen für Datenbankoperationen

### 7. Migration Schritte

1. **Supabase Projekt erstellen**: Erstelle ein neues Supabase Projekt
2. **Tabelle erstellen**: Führe das oben genannte SQL-Schema aus
3. **Umgebungsvariablen setzen**: Füge die Supabase Credentials hinzu
4. **Daten migrieren** (optional): Importiere bestehende SQLite-Daten nach Supabase
5. **Testen**: Alle API-Endpunkte sollten funktionieren

### 8. Vorteile der Migration

- ✅ **Cloud-basiert**: Keine lokale Datenbankdatei mehr nötig
- ✅ **Skalierbar**: Automatisches Scaling durch Supabase
- ✅ **Echtzeit**: Möglichkeit für Echtzeit-Features
- ✅ **Backup**: Automatische Backups durch Supabase
- ✅ **Multi-User**: Gleichzeitiger Zugriff möglich
- ✅ **Performance**: Bessere Query-Performance bei größeren Datenmengen
- ✅ **Administration**: Web-Interface für Datenbankadministration

### 9. Troubleshooting

**Fehler "Missing Supabase environment variables":**

- Prüfe ob `.env.local` existiert und die korrekten Variablen enthält

**"relation 'tv_show_politicians' does not exist":**

- Führe das SQL-Schema in deinem Supabase Projekt aus

**Crawler funktioniert nicht:**

- Prüfe ob die Tabelle die richtigen Spalten und Constraints hat
- Prüfe die Supabase-Permissions (RLS Policies)

---

Die Migration ist abgeschlossen! Das Frontend verwendet jetzt ausschließlich Supabase als Datenbank.
