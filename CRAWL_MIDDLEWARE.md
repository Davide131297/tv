# Crawl API Middleware

Die Crawl API Middleware ist als globale Next.js Middleware implementiert und bietet zentrale Funktionalitäten für alle Crawling-APIs der Anwendung.

## Features

### 🔒 Authentifizierung

- API-Key-basierte Authentifizierung über Authorization Header
- Konfigurierbar über Umgebungsvariable `CRAWL_API_KEY`
- Automatisch deaktiviert für Entwicklung (default-dev-key), aktiviert in Produktion

### 🚦 Rate Limiting

- Schutz vor übermäßigen Anfragen
- IP-basierte Limits mit automatischer Bereinigung
- Standard: 5 Anfragen pro Minute für Crawler APIs
- DELETE-Endpunkte: 3 Anfragen pro Minute (z.B. Maischberger DELETE)

### 📝 Logging

- Umfassendes Request-Logging
- IP-Adresse und User-Agent Tracking
- Performance-Monitoring vorbereitet
- Error-Tracking mit strukturierten Logs

### ✅ Validation

- HTTP-Method Validation (nur POST und DELETE erlaubt)
- Automatisches Error Handling
- Matcher-basierte Ausführung nur für `/api/crawl/*` Routen

## Implementierung

Die Middleware ist als globale Next.js Middleware in `/middleware.ts` implementiert und wird automatisch für alle Routen unter `/api/crawl/` ausgeführt.

### Matcher-Konfiguration

```typescript
export const config = {
  matcher: ["/api/crawl/:path*"],
};
```

## Verwendung

### Automatische Ausführung

Die Middleware läuft automatisch für alle Crawl-API-Routen:

- `/api/crawl/illner`
- `/api/crawl/lanz`
- `/api/crawl/maischberger`
- `/api/crawl/miosga`

### API-Routen (vereinfacht)

```typescript
// Beispiel: /app/api/crawl/illner/route.ts
export async function POST(request: NextRequest) {
  let runType: "incremental" | "full" = "incremental";

  try {
    const body = await request.json();
    runType = body.runType || "incremental";
  } catch {
    console.log("⚠️ No valid JSON body found, using default 'incremental'");
  }

  // Ihre Crawler-Logik hier...
}
```

## Authentifizierung

### Via Authorization Header

```bash
curl -X POST "http://localhost:3000/api/crawl/illner" \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"runType": "incremental"}'
```

## Umgebungsvariablen

```bash
# .env.local
CRAWL_API_KEY=your-secure-api-key-here
```

**Wichtig**:

- Entwicklung: Wird `default-dev-key` verwendet → Authentifizierung deaktiviert
- Produktion: Beliebiger anderer Wert aktiviert Authentifizierung

## Request/Response Format

### Request Body

```typescript
interface CrawlRequestBody {
  runType?: "incremental" | "full"; // Crawler-Modus
}
```

### Success Response

```json
{
  "message": "Crawler erfolgreich abgeschlossen (incremental)",
  "status": 200
}
```

### Error Responses

#### Rate Limit Exceeded (429)

```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 45
}
```

#### Unauthorized (401)

```json
{
  "error": "Unauthorized: Invalid or missing API key"
}
```

#### Method Not Allowed (405)

```json
{
  "error": "Method GET not allowed"
}
```

## Implementierte APIs

Alle folgenden Crawl-APIs verwenden die globale Middleware:

- `/api/crawl/illner` - Maybrit Illner Crawler (POST)
- `/api/crawl/lanz` - Markus Lanz Crawler (POST)
- `/api/crawl/maischberger` - Sandra Maischberger Crawler (POST + DELETE)
- `/api/crawl/miosga` - Caren Miosga Crawler (POST)

## Entwicklung vs. Produktion

### Entwicklung

- `CRAWL_API_KEY=default-dev-key` → Keine Authentifizierung
- Rate Limiting aktiv
- Umfassendes Logging

### Produktion

- `CRAWL_API_KEY=<secure-key>` → Authentifizierung aktiviert
- Rate Limiting aktiv
- Strukturierte Logs

## Performance & Monitoring

- Response-Zeit-Header werden gesetzt (`x-middleware-start-time`)
- Rate-Limit-Storage wird alle 5 Minuten automatisch bereinigt
- IP-basiertes Tracking für Sicherheit und Debugging
- Strukturierte Logs für einfache Analyse

## Vorteile der globalen Middleware

1. **Zentrale Verwaltung**: Eine einzige Datei für alle Crawl-APIs
2. **Performance**: Next.js optimiert globale Middleware automatisch
3. **Konsistenz**: Identisches Verhalten für alle Crawl-Endpunkte
4. **Wartbarkeit**: Einfache Änderungen wirken sich auf alle APIs aus
5. **Next.js Integration**: Native Nutzung der Next.js Middleware-Pipeline

## Security Best Practices

1. **API-Keys sicher verwalten**: Niemals in Code committen
2. **Rate Limiting aktivieren**: Standardmäßig aktiv
3. **Authentifizierung in Produktion**: Automatisch aktiv bei non-default API-Key
4. **Logs überwachen**: Strukturierte Logs für Anomalie-Erkennung
5. **HTTPS verwenden**: In Produktion immer HTTPS verwenden
