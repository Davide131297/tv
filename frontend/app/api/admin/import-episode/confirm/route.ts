import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { parseImportConfirmPayload } from "@/lib/episode-import";
import { saveImportedPoliticians } from "@/lib/episode-import-server";

export const runtime = "nodejs";

// Speichert die in der Vorschau bestätigten Politiker
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  let payload;
  try {
    payload = parseImportConfirmPayload(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ungültige Anfrage." },
      { status: 400 },
    );
  }

  try {
    const result = await saveImportedPoliticians(payload);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin import confirm error:", error);
    return NextResponse.json(
      { error: "Politiker konnten nicht gespeichert werden." },
      { status: 500 },
    );
  }
}
