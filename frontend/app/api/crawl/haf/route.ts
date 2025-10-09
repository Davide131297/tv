import { NextResponse } from "next/server";
import crawlHartAberFair from "@/crawler/haf";

export async function POST() {
  try {
    await crawlHartAberFair();
    return NextResponse.json(
      { message: "Hart aber fair Crawler erfolgreich abgeschlossen" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Fehler beim Crawlen:", error);
    return NextResponse.json(
      { message: "Fehler beim Crawlen von Hart aber fair" },
      { status: 500 }
    );
  }
}
