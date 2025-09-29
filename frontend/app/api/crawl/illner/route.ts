import { NextResponse, NextRequest } from "next/server";
import {
  crawlNewMaybritIllnerEpisodes,
  crawlAllMaybritIllnerEpisodes,
} from "@/crawler/illner";

export async function POST(request: NextRequest) {
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
        crawlNewMaybritIllnerEpisodes();
        break;
      case "full":
        crawlAllMaybritIllnerEpisodes();
        break;
      default:
        crawlNewMaybritIllnerEpisodes();
        break;
    }
    return NextResponse.json(
      { message: `Maybrit Illner Crawler erfolgreich abgeschlossen` },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Fehler im Maybrit Illner Crawler:", error);
    return NextResponse.json(
      { message: "Fehler beim Durchführen des Maybrit Illner Crawlers" },
      { status: 500 }
    );
  }
}
