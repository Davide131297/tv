import { NextResponse } from "next/server";
import {
  crawlMaischberger2025,
  crawlNewMaischbergerEpisodes,
  clearMaischbergerData,
} from "@/crawler/maischberger";

export async function POST(request: Request) {
  let runType: "incremental" | "full" = "incremental";

  try {
    const body = await request.json();
    runType = body.runType || "incremental";
  } catch (error) {
    console.log(
      "Fehler beim Parsen des Request Body - verwende Default 'incremental':",
      error
    );
  }

  try {
    switch (runType) {
      case "incremental":
        await crawlNewMaischbergerEpisodes();
        break;
      case "full":
        await crawlMaischberger2025();
        break;
      default:
        await crawlNewMaischbergerEpisodes();
        break;
    }

    return NextResponse.json(
      { message: "Maischberger Crawler erfolgreich" },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Fehler im Maischberger Crawler:", error);
    return NextResponse.json(
      { error: "Fehler im Maischberger Crawler" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    console.log("🗑️  Lösche alle Maischberger-Episoden aus der Datenbank...");

    const deletedCount = await clearMaischbergerData();

    console.log(
      `✅ ${deletedCount} Maischberger-Episoden erfolgreich gelöscht`
    );

    return NextResponse.json(
      {
        message: `${deletedCount} Maischberger-Episoden erfolgreich gelöscht`,
        deletedCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Fehler beim Löschen der Maischberger-Daten:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen der Maischberger-Daten" },
      { status: 500 }
    );
  }
}
