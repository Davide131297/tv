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
- **Politics API**: 30 Anfragen pro Minute

### ✅ Validation

- HTTP-Method Validation je nach API:
  - **Crawl APIs**: Nur POST und DELETE erlaubt
  - **Politics API**: Nur GET erlaubt
- Automatisches Error Handling
- Matcher-basierte Ausführung nur für geschützte Routen

## Implementierung

Die Middleware ist als globale Next.js Middleware in `/proxy.ts` implementiert.

### Matcher-Konfiguration

```typescript
export const config = {
  matcher: ["/api/crawl/:path*", "/api/politics"],
};
```

### Geschützte Routen

- **Crawl APIs**: `/api/crawl/*`
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
