export const DATABASE_SCHEMA = `
Verfügbare Tabellen:

1. tv_show_politicians:
   - id (serial)
   - show_name (text) - Name der TV-Sendung
   - episode_date (date) - Datum der Episode
   - politician_name (text) - Name des Politikers
   - party_name (text) - Name der Partei
   - politician_id (integer)
   - party_id (integer)
   - tv_channel (enum: ARD, ZDF, Phoenix)
   - abgeordnetenwatch_url (text)
   - created_at, updated_at (timestamp)

2. tv_show_episode_political_areas:
   - id (bigint)
   - show_name (text)
   - episode_date (date)
   - political_area_id (smallint)
   - tv_channel (enum: ARD, ZDF, Phoenix)
   - created_at (timestamp)

3. show_links:
   - id (bigint)
   - show_name (text)
   - episode_url (text)
   - episode_date (date)

4. political_area (referenziert):
   - id (smallint)
   - name (text) - Name des politischen Themas

Beispiel-Sendungen: "Markus Lanz", "Maybrit Illner", "Caren Miosga", "Maischberger", "Hart aber fair", "Phoenix Runde", "Phoenix Persönlich", "Pinar Atalay", "Blome & Pfeffer"
Beispiel-Parteien: "CDU", "SPD", "BÜNDNIS 90/DIE GRÜNEN", "FDP", "Die Linke", "AfD", "CSU"
Beispiel-Sender: "Das Erste", "ZDF", "Phoenix", "NTV"
`;
