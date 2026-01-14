import { createBrowser, setupSimplePage } from "@/lib/browser-config";
import {
  insertMultipleTvShowPoliticians,
  getLatestEpisodeDate,
  insertMultipleShowLinks,
  checkPolitician,
  insertEpisodePoliticalAreas,
} from "@/lib/supabase-server-utils";
import { getPoliticalArea, extractGuestsWithAI } from "@/lib/ai-utils";

const LIST_URL = "https://plus.rtl.de/podcast/blome-pfeffer-sbtnrvt7l97b3";

export default async function CrawlBlomePfeffer() {
  console.log("🚀 Starte Blome Pfeffer Crawler...");
  console.log(`📅 Datum: ${new Date().toISOString()}`);

  const latestDbDate = await getLatestEpisodeDate("Blome & Pfeffer");
  console.log(`🗃️  Letzte Episode in DB: ${latestDbDate || "Keine"}`);

  const browser = await createBrowser();
  try {
    const page = await setupSimplePage(browser);

    // Neu: Zähler für die abschließende Zusammenfassung
    let totalEpisodeLinksInserted = 0;
    let episodesWithPoliticians = 0;
    let totalPoliticiansInserted = 0;
    let totalPoliticalAreasInserted = 0;

    await page.goto(LIST_URL, { waitUntil: "networkidle2", timeout: 60000 });

    // Neue Extraktion und Verarbeitung der Episoden:
    const rawEpisodes = await page.$$eval(
      "podcast-episode-teaser a.episode",
      (anchors) =>
        anchors.map((a) => {
          const titleEl = a.querySelector(".title");
          const metaEl = a.querySelector(".metadata");
          const descEl = a.querySelector(".description");
          const imgEl = a.querySelector("img");
          const href = (a.getAttribute("href") || "").trim();
          const metaText = metaEl?.textContent?.trim() || "";
          // metaText example: "28.10.25 • 41 Min."
          let dateText = "";
          let duration = "";
          const metaParts = metaText.split("•").map((s) => s.trim());
          if (metaParts.length >= 1) dateText = metaParts[0];
          if (metaParts.length >= 2) duration = metaParts[1];
          return {
            title: titleEl?.textContent?.trim() || "",
            href,
            url: href.startsWith("http") ? href : `https://plus.rtl.de${href}`,
            dateText,
            duration,
            description: descEl?.textContent?.trim() || "",
            image: imgEl?.getAttribute("src") || "",
          };
        })
    );

    // Hilfsfunktion: dd.mm.yy oder dd.mm.yyyy -> ISO
    const parseDateToISO = (dstr: string) => {
      const parts = dstr.split(".");
      if (parts.length < 3) return null;
      let [dd, mm, yy] = parts.map((p) => p.trim());
      if (yy.length === 2) yy = "20" + yy;
      const iso = `${yy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
      const dt = new Date(iso);
      return isNaN(dt.getTime()) ? null : dt.toISOString();
    };

    const latestDateObj = latestDbDate ? new Date(latestDbDate) : null;

    const episodes = rawEpisodes
      .map((ep) => ({ ...ep, isoDate: parseDateToISO(ep.dateText) }))
      .filter((ep) => ep.isoDate) // only keep if date parsed
      .filter((ep) => {
        if (!latestDateObj) return true;
        return new Date(ep.isoDate!) > latestDateObj;
      });

    if (episodes.length === 0) {
      console.log("🔎 Keine neuen Episoden gefunden.");
    } else {
      console.log(`✨ Gefundene neue Episoden: ${episodes.length}`);

      // Prepare payload for insertMultipleShowLinks (backend expects { episodeUrl, episodeDate })
      const episodeLinksToInsert = episodes.map((ep) => ({
        episodeUrl: ep.url,
        episodeDate: ep.isoDate!,
      }));

      try {
        const inserted = await insertMultipleShowLinks(
          "Blome & Pfeffer",
          episodeLinksToInsert
        );
        // inserted enthält Anzahl eingefügter Links
        totalEpisodeLinksInserted += inserted;
        console.log(
          `✅ Neue Episoden-Links in DB eingefügt: ${inserted}/${episodeLinksToInsert.length}`
        );
      } catch (err) {
        console.error("❌ Fehler beim Einfügen der Show-Links:", err);
      }

      // AI-Analyse auf Beschreibung ausführen und Politiker speichern
      for (const ep of episodes) {
        try {
          const guests = await extractGuestsWithAI(ep.description || ep.title);

          // normalize guests -> array of names
          let guestNames: string[] = [];
          if (Array.isArray(guests) && guests.length > 0) {
            if (typeof guests[0] === "string") {
              guestNames = guests as string[];
            } else if (
              typeof guests[0] === "object" &&
              (guests[0] as any).name
            ) {
              guestNames = (guests as any[]).map((g) => (g.name ? g.name : ""));
            }
          }

          if (!guestNames.length) {
            // trotzdem versuchen Themenbereiche zu speichern
            try {
              const areaIds = await getPoliticalArea(
                ep.description || ep.title
              );
              if (Array.isArray(areaIds) && areaIds.length > 0) {
                const insertedAreas = await insertEpisodePoliticalAreas(
                  "Blome & Pfeffer",
                  ep.isoDate!,
                  areaIds
                );
                totalPoliticalAreasInserted += insertedAreas;
                console.log(
                  `🏷️ Themenbereiche für Folge "${ep.title}" gespeichert: ${insertedAreas}/${areaIds.length}`
                );
              }
            } catch (areaErr) {
              console.error(
                `❌ Fehler beim Ermitteln/Speichern der Themenbereiche für ${ep.title}:`,
                areaErr
              );
            }
            continue;
          }

          const politicians: Array<{
            politicianId: number;
            politicianName: string;
            partyId?: number;
            partyName?: string;
          }> = [];

          for (const guestName of guestNames) {
            if (!guestName) continue;
            try {
              const details = await checkPolitician(guestName);
              if (
                details &&
                details.isPolitician &&
                details.politicianId &&
                details.politicianName
              ) {
                politicians.push({
                  politicianId: details.politicianId,
                  politicianName: details.politicianName,
                  partyId: details.party,
                  partyName: details.partyName,
                });
              }
            } catch (err) {
              console.error(
                `❌ Fehler beim Prüfen von Politiker ${guestName}:`,
                err
              );
            }

            // Kurze Pause, um API-Rate-Limits zu schonen
            await new Promise((r) => setTimeout(r, 250));
          }

          if (politicians.length > 0) {
            try {
              const insertedPols = await insertMultipleTvShowPoliticians(
                "NTV",
                "Blome & Pfeffer",
                ep.isoDate!,
                politicians
              );
              totalPoliticiansInserted += insertedPols;
              if (insertedPols > 0) episodesWithPoliticians += 1;
              console.log(
                `🧾 Politiker für Folge "${ep.title}" gespeichert (${insertedPols}/${politicians.length}).`
              );
            } catch (insErr) {
              console.error("❌ Fehler beim Speichern der Politiker:", insErr);
            }
          }

          // Extrahiere und speichere politische Themenbereiche aus der Episoden-Beschreibung
          try {
            const areaIds = await getPoliticalArea(ep.description || ep.title);
            if (Array.isArray(areaIds) && areaIds.length > 0) {
              const insertedAreas = await insertEpisodePoliticalAreas(
                "Blome & Pfeffer",
                ep.isoDate!,
                areaIds
              );
              totalPoliticalAreasInserted += insertedAreas;
              console.log(
                `🏷️ Themenbereiche für Folge "${ep.title}" gespeichert: ${insertedAreas}/${areaIds.length}`
              );
            }
          } catch (areaErr) {
            console.error(
              `❌ Fehler beim Ermitteln/Speichern der Themenbereiche für ${ep.title}:`,
              areaErr
            );
          }
        } catch (aiErr) {
          console.error("❌ Fehler bei AI-Analyse der Beschreibung:", aiErr);
        }
      }
    }

    console.log(`\n=== Datenbank-Speicherung Zusammenfassung ===`);
    console.log(`Episoden mit Politikern: ${episodesWithPoliticians}`);
    console.log(`Politiker gesamt eingefügt: ${totalPoliticiansInserted}`);
    console.log(
      `Politische Themenbereiche gesamt eingefügt: ${totalPoliticalAreasInserted}`
    );
    console.log(`Episode-URLs gesamt eingefügt: ${totalEpisodeLinksInserted}`);

    return {
      message: "Blome & Pfeffer erfolgreich durchlaufen",
      status: 200,
    };
  } catch (err) {
    console.error("Crawler Fehler:", err);
  } finally {
    try {
      await browser.close();
    } catch (e) {
      // ignore
    }
  }
}
