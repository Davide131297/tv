import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { postToBackend } from "@/lib/backend-api";

export const runtime = "nodejs";

// Speichert die in der Vorschau bestätigten Politiker über das Backend
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  try {
    const { status, data } = await postToBackend(
      "/api/import-episode/confirm",
      await request.json(),
    );
    return NextResponse.json(data, { status });
  } catch (error) {
    console.error("Admin import confirm error:", error);
    return NextResponse.json(
      { error: "Backend für den Link-Import nicht erreichbar." },
      { status: 502 },
    );
  }
}
