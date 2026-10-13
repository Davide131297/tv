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
5.  **Posting** (`lib/threads.ts`, genutzt von `weekly` und `monthly`):
    - Der Text wird generiert und falls nötig in mehrere Teile à max. 500 Zeichen aufgeteilt. Gezählt wird wie bei Threads: ein Zeichen pro Graphem, Emojis mit ihrer Anzahl an UTF-8 Bytes (z.B. 📊 = 4). Der Zähler „(1/3)“ ist im Limit enthalten.
    - Getrennt wird bevorzugt an Absätzen (eine Sendung bleibt zusammen), dann an Zeilenumbrüchen, dann an Wörtern.
    - Der erste Teil wird als normaler Post veröffentlicht (mit Topic-Tag `Polittalk` über den `topic_tag`-Parameter), alle weiteren Teile als Antworten (`reply_to_id`) darunter – jeweils auf den vorherigen Teil, damit die Reihenfolge erhalten bleibt.
    - Vor jedem Veröffentlichen wird der Container-Status abgefragt, bis er `FINISHED` ist. Das Erstellen einer Antwort wird bei Fehlern zweimal wiederholt.
    - Es wird **nie** auf eigenständige Posts ausgewichen. Schlägt eine Antwort endgültig fehl, liefert die Route einen Fehler (HTTP 500) inkl. der bereits veröffentlichten `publishedIds`.
    - Mit `?dryRun=true` werden nur die Teile (`chunks`) und ihre Längen (`chunkLengths`) zurückgegeben, ohne zu posten.
