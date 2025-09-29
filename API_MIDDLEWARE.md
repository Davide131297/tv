# API Middleware Documentation

Die API Middleware ist als globale Next.js Middleware implementiert und bietet zentrale Funktionalitäten für die Crawling-APIs und Politics-API der Anwendung.

## Features

### 🔒 Authentifizierung

- **Separate API-Keys**: Unterschiedliche Keys für verschiedene API-Bereiche
  - `CRAWL_API_KEY`: Für alle `/api/crawl/*` Endpunkte
  - `POLITICS_API_KEY`: Für `/api/politics` Endpunkt
- API-Key-basierte Authentifizierung über Authorization Header
- Automatisch deaktiviert für Entwicklung (default-dev-key), aktiviert in Produktion

### 🚦 Rate Limiting

- Schutz vor übermäßigen Anfragen
- IP-basierte Limits mit automatischer Bereinigung
- **Crawl APIs**: 5 Anfragen pro Minute (3 für DELETE)
- **Politics API**: 30 Anfragen pro Minute (höher, da read-only)

### 📝 Logging

- Umfassendes Request-Logging für alle geschützten APIs
- IP-Adresse und User-Agent Tracking
- Performance-Monitoring vorbereitet
- Error-Tracking mit strukturierten Logs

### ✅ Validation

- HTTP-Method Validation je nach API:
  - **Crawl APIs**: Nur POST und DELETE erlaubt
  - **Politics API**: Nur GET erlaubt
- Automatisches Error Handling
- Matcher-basierte Ausführung nur für geschützte Routen

## Implementierung

Die Middleware ist als globale Next.js Middleware in `/middleware.ts` implementiert.

### Matcher-Konfiguration

```typescript
export const config = {
  matcher: ["/api/crawl/:path*", "/api/politics"],
};
```

### Geschützte Routen

- **Crawl APIs**: `/api/crawl/illner`, `/api/crawl/lanz`, `/api/crawl/maischberger`, `/api/crawl/miosga`
- **Politics API**: `/api/politics`

## Authentifizierung

### Separate API-Keys für verschiedene Bereiche

#### Crawl APIs (Schreibzugriff)

```bash
curl -X POST "http://localhost:3000/api/crawl/illner" \
  -H "Authorization: Bearer your-crawl-api-key" \
  -H "Content-Type: application/json" \
  -d '{"runType": "incremental"}'
```

#### Politics API (Lesezugriff)

```bash
curl -H "Authorization: Bearer your-politics-api-key" \
     "http://localhost:3000/api/politics?type=episode-statistics&show=Markus%20Lanz"
```

## Umgebungsvariablen

```bash
# .env.local

# Crawl API Key (für /api/crawl/* Endpunkte)
CRAWL_API_KEY=your-secure-crawl-api-key-here

# Politics API Key (für /api/politics Endpunkt)
POLITICS_API_KEY=your-secure-politics-api-key-here
```

### Konfiguration

**Entwicklung** (Authentifizierung deaktiviert):

```bash
CRAWL_API_KEY=default-dev-key
POLITICS_API_KEY=default-dev-key
```

**Produktion** (Authentifizierung aktiviert):

```bash
CRAWL_API_KEY=prod-crawl-key-xyz789
POLITICS_API_KEY=prod-politics-key-abc123
```

## Request/Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... }
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

## Rate Limiting Details

| API-Bereich         | Limit pro Minute | Besonderheiten                                     |
| ------------------- | ---------------- | -------------------------------------------------- |
| Crawl APIs (POST)   | 5                | Niedrig, da ressourcenintensiv                     |
| Crawl APIs (DELETE) | 3                | Noch niedriger für kritische Operationen           |
| Politics API (GET)  | 30               | Höher, da read-only und weniger ressourcenintensiv |

## Security Best Practices

### 1. **Separate API-Keys verwenden**

- Verschiedene Keys für verschiedene Anwendungsbereiche
- Ermöglicht granulare Zugriffskontrolle
- Bei Kompromittierung eines Keys sind andere Bereiche geschützt

### 2. **Sichere Key-Verwaltung**

```bash
# ❌ Nicht so:
CRAWL_API_KEY=123456
POLITICS_API_KEY=abcdef

# ✅ Besser so:
CRAWL_API_KEY=crawl_prod_xK8mN2pQ7vR4sT9wE3yU6iO1
POLITICS_API_KEY=politics_prod_aB5cD8fG2hJ4kL7mN0pQ3rS6
```

### 3. **Umgebungsspezifische Konfiguration**

- Entwicklung: `default-dev-key` für einfaches Testen
- Staging: Separate Test-Keys
- Produktion: Starke, einzigartige Keys

### 4. **Monitoring & Logging**

- Regelmäßige Überprüfung der Logs auf verdächtige Aktivitäten
- Rate-Limit-Überschreitungen überwachen
- Failed Auth-Attempts tracken

## Entwicklung vs. Produktion

### Entwicklung

```typescript
// Automatische Deaktivierung bei default-dev-key
const requireAuth = !!(API_KEY && API_KEY !== "default-dev-key");
```

### Produktion

```typescript
// Aktiviert bei beliebigem anderen Wert
const requireAuth = !!(API_KEY && API_KEY !== "default-dev-key");
```

## Performance & Monitoring

- **Response-Zeit-Header**: `x-middleware-start-time` für Performance-Tracking
- **Automatische Bereinigung**: Rate-Limit-Storage alle 5 Minuten bereinigt
- **IP-basiertes Tracking**: Für Sicherheit und Debugging
- **Strukturierte Logs**: Einfache Analyse und Alerting

## Vorteile der Implementierung

1. **🎯 Zentrale Verwaltung**: Eine Middleware für alle geschützten APIs
2. **🚀 Performance**: Native Next.js Optimierungen
3. **🔧 Flexibilität**: Verschiedene Konfigurationen pro API-Bereich
4. **🛡️ Sicherheit**: Separate Keys für verschiedene Zugriffslevel
5. **📊 Konsistenz**: Identisches Logging und Monitoring überall
6. **🔍 Granularität**: Unterschiedliche Rate-Limits je nach API-Typ

## Troubleshooting

### Problem: "Unauthorized" trotz korrektem Key

```bash
# Prüfen Sie die Umgebungsvariable
echo $CRAWL_API_KEY
echo $POLITICS_API_KEY

# Stellen Sie sicher, dass der Key nicht "default-dev-key" ist
```

### Problem: Rate Limit zu niedrig

```typescript
// In middleware.ts anpassen:
maxRequestsPerWindow = 50; // Höheres Limit für Politics API
```

### Problem: Middleware läuft nicht

```typescript
// Matcher prüfen in middleware.ts:
export const config = {
  matcher: [
    "/api/crawl/:path*",
    "/api/politics", // ← Stellen Sie sicher, dass Ihre Route hier steht
  ],
};
```

Für weitere Hilfe siehe die [Next.js Middleware Dokumentation](https://nextjs.org/docs/app/building-your-application/routing/middleware).
