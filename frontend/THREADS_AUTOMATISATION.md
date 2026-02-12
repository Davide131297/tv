# Threads Bot Automatisierung

Der Bot erstellt jeden Montag einen Thread auf [Threads](https://www.threads.net), der die Gäste und Shows der vergangenen Woche zusammenfasst.

### Hauptkomponenten

1.  **API Route (`route.ts`)**: Die Kernlogik, die Daten von Supabase abruft, den Text formatiert und mit der Threads API kommuniziert.
2.  **GitHub Workflow (`threads-weekly.yml`)**: Der Cron-Job, der die API Route wöchentlich aufruft.

## Funktionsweise

1.  **Trigger**:
    - Automatisch: Jeden Montag um 09:00 Uhr CET via GitHub Actions Cron-Job.
    - Manuell: Über den "Run workflow" Button im GitHub Actions Tab.
2.  **Authentifizierung**:
    - Der API Aufruf ist durch einen `secret` Query-Parameter geschützt (`CRON_SECRET`).
    - Die Authentifizierung gegenüber Threads erfolgt via `THREADS_ACCESS_TOKEN` und `THREADS_USER_ID`, die in der Supabase Tabelle `bot_configuration` gespeichert sind.
3.  **Token Refresh**:
    - Das Access Token für Threads wird bei jedem regulären Aufruf (nicht Dry-Run) automatisch erneuert und in der Datenbank aktualisiert, da diese Tokens nach 60 Tagen ablaufen.
4.  **Datenabruf**:
    - Es werden alle Einträge aus `tv_show_politicians` für die letzte Woche (Montag bis Sonntag) geladen.
5.  **Posting**:
    - Der Text wird generiert und falls nötig in mehrere Teile (Chunks) à max. 500 Zeichen aufgeteilt.
    - Die Posts werden als Thread (aneinandergereht) veröffentlicht.
