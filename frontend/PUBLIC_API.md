# Öffentliche API-Dokumentation (v1)

Dieses Dokument beschreibt die öffentliche API unter `/api/v1/`.
Diese Endpunkte ermöglichen externen Nutzern den Zugriff auf Daten zu politischen Parteien, Politiker-Auftritten und diskutierten Themen in TV-Sendungen.

**Basis-URL**: `https://polittalk-watcher.de/api/v1`

---

## 1. Parteien-Zeitverlauf

**Endpunkt**: `GET /party-timeline`

Gibt die Häufigkeit von Parteiauftritten im Zeitverlauf zurück, gruppiert nach Monat. Ohne Parameter wird das aktuelle Jahr verwendet.

### Parameter

| Parameter    | Typ    | Erforderlich | Beschreibung                                                                                      |
| ------------ | ------ | ------------ | ------------------------------------------------------------------------------------------------- |
| `year`       | string | Nein         | Filter nach Jahr (z.B. `2024` oder `2025`). Standard: aktuelles Jahr. Nutze `all` für alle Jahre. |
| `show`       | string | Nein         | Filter nach Sendungsname (z.B. `Markus Lanz`).                                                    |
| `tv_channel` | string | Nein         | Filter nach TV-Sender (z.B. `ZDF`).                                                               |

### Antwort-Beispiel

```json
{
  "success": true,
  "data": [
    {
      "month": "2024-01",
      "CDU": 5,
      "SPD": 3,
      "Grüne": 2
    },
    ...
  ],
  "parties": ["CDU", "SPD", "Grüne"],
  "year": "2024"
}
```

---

## 2. Politische Themenbereiche

**Endpunkt**: `GET /political-areas`

Gibt Statistiken zu den in Sendungen diskutierten politischen Themen zurück. Ohne Parameter werden alle Jahre und Sendungen berücksichtigt.

### Parameter

| Parameter    | Typ    | Erforderlich | Beschreibung                    |
| ------------ | ------ | ------------ | ------------------------------- |
| `year`       | string | Nein         | Filter nach Jahr (z.B. `2024`). |
| `show`       | string | Nein         | Filter nach Sendungsname.       |
| `tv_channel` | string | Nein         | Filter nach TV-Sender.          |

### Antwort-Beispiel

```json
{
  "success": true,
  "data": [
    {
      "area_id": 1,
      "area_label": "Wirtschaft",
      "count": 15
    },
    ...
  ],
  "total": 120
}
```

---

## 3. Politiker-Details

**Endpunkt**: `GET /politician-details`

Gibt eine Liste von Auftritten für einen bestimmten Politiker zurück. Ohne Jahr wird jedes Jahr berücksichtigt.

### Parameter

| Parameter    | Typ    | Erforderlich | Beschreibung                                                    |
| ------------ | ------ | ------------ | --------------------------------------------------------------- |
| `first_name` | string | **Ja**       | Der Vorname des Politikers (z.B. "Alice"). Alias: `firstname`.  |
| `last_name`  | string | **Ja**       | Der Nachname des Politikers (z.B. "Weidel"). Alias: `lastname`. |
| `year`       | string | Nein         | Filter nach Jahr (z.B. `2024`).                                 |

### Antwort-Beispiel

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid...",
      "show_name": "Markus Lanz",
      "episode_date": "2024-03-12",
      "episode_url": "https://..."
    },
    ...
  ],
  "count": 15
}
```

---

## 4. Politik (Allgemeine Statistiken)

**Endpunkt**: `GET /politics`

Ein vielseitiger Endpunkt, der verschiedene Arten von Statistiken basierend auf dem `type`-Parameter zurückgibt.

### Parameter

| Parameter | Typ    | Erforderlich | Beschreibung                                  |
| --------- | ------ | ------------ | --------------------------------------------- |
| `type`    | string | **Ja**       | Die Art der Statistik. Optionen: siehe unten. |
| `year`    | string | Nein         | Filter nach Jahr.                             |
| `show`    | string | Nein         | Filter nach Sendungsname.                     |
| `limit`   | number | Nein         | Begrenzt die Anzahl der Ergebnisse.           |

### Verfügbare `type`-Werte

#### `party-stats`

Gibt die Gesamtanzahl der Auftritte pro Partei zurück.

```json
{
  "success": true,
  "data": [
    { "party_name": "CDU", "count": 50 },
    ...
  ]
}
```

#### `episodes`

Gibt eine Liste von Episoden und der Anzahl der Politiker darin zurück.

```json
{
  "success": true,
  "data": [
    { "episode_date": "2024-01-01", "politician_count": 3 },
    ...
  ]
}
```

#### `episodes-with-politicians`

Gibt Episoden mit einer Aufschlüsselung der aufgetretenen Politiker zurück.

```json
{
  "success": true,
  "data": [
    {
      "episode_date": "2024-01-01",
      "politicians": [{ "name": "Name", "party_name": "Partei" }]
    }
  ]
}
```

#### `recent`

Gibt die aktuellsten Politiker-Auftritte zurück.

```json
{
  "success": true,
  "data": [{ "show_name": "...", "politician_name": "..." }]
}
```

#### `summary`

Gibt allgemeine Zusammenfassungs-Statistiken zurück (Gesamtauftritte, Episoden, Politiker, etc.).

```json
{
  "success": true,
  "data": {
    "total_appearances": 150,
    "unique_politicians": 40,
    ...
  }
}
```

#### `detailed-appearances`

Gibt eine paginierte Liste aller Auftritte zurück.

- **Zusatz-Parameter**: `offset` (number).

```json
{
  "success": true,
  "data": [...],
  "pagination": { "total": 100, "limit": 10, "offset": 0 }
}
```

#### `politician-rankings`

Gibt ein Ranking der Politiker nach Anzahl der Auftritte zurück.

```json
{
  "success": true,
  "data": [
    { "politician_name": "Name", "total_appearances": 12, ... }
  ]
}
```

#### `topic-party-matrix`

Gibt eine Matrix von Parteien vs. diskutierten Themen zurück.

```json
{
  "success": true,
  "data": {
    "topics": [...],
    "parties": [...],
    "matrix": [ { "party": "CDU", "topicId": 1, "count": 5 } ]
  }
}
```
