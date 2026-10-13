import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { buildImportPreview } from "@/lib/episode-import-server";

export const runtime = "nodejs";
export const maxDuration = 60;

// Vorschau: lädt die Episodenseite und gleicht Gäste ab – schreibt nichts in die DB
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  try {
    const { url } = (await request.json()) as { url?: unknown };

    if (typeof url !== "string" || !url.trim()) {
      return NextResponse.json({ error: "Link fehlt." }, { status: 400 });
    }

    const preview = await buildImportPreview(url);
    return NextResponse.json({ preview });
  } catch (error) {
    console.error("Admin import preview error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Link konnte nicht ausgewertet werden.",
      },
      { status: 400 },
    );
  }
}
