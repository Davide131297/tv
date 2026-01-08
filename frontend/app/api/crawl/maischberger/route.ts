import { NextResponse, NextRequest } from "next/server";
import {
  crawlMaischbergerFull,
  crawlNewMaischbergerEpisodes,
  clearMaischbergerData,
} from "@/crawler/maischberger";

export async function POST(request: NextRequest) {
  let runType: "incremental" | "full" = "incremental";

  try {
    const body = await request.json();
    runType = body.runType || "incremental";
  } catch {
    console.log("⚠️ No valid JSON body found, using default 'incremental'");
  }

  try {
    switch (runType) {
      case "incremental":
        await crawlNewMaischbergerEpisodes();
        break;
      case "full":
        await crawlMaischbergerFull();
        break;
      default:
        await crawlNewMaischbergerEpisodes();
        break;
    }

    return NextResponse.json(
      { message: `Maischberger Crawler erfolgreich (${runType})` },
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
