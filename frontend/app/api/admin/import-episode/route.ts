import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { postToBackend } from "@/lib/backend-api";

export const runtime = "nodejs";
export const maxDuration = 60;

// Vorschau: das Backend lädt die Episodenseite und gleicht Gäste ab – schreibt nichts in die DB
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  try {
    const { status, data } = await postToBackend(
      "/api/import-episode/preview",
      await request.json(),
    );
    return NextResponse.json(data, { status });
  } catch (error) {
    console.error("Admin import preview error:", error);
    return NextResponse.json(
      { error: "Backend für den Link-Import nicht erreichbar." },
      { status: 502 },
    );
  }
}
