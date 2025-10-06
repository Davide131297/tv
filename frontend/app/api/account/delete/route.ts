import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Service Role Client für Admin-Operationen
const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Regular Client für User-Authentifizierung
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { password, confirmText } = await request.json();

    // Validierung
    if (!password) {
      return NextResponse.json(
        { error: "Passwort ist erforderlich" },
        { status: 400 }
      );
    }

    if (confirmText !== "ACCOUNT LÖSCHEN") {
      return NextResponse.json(
        { error: "Bestätigungstext ist falsch" },
        { status: 400 }
      );
    }

    // Auth Header prüfen
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    // User Session validieren
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (userError || !user) {
      return NextResponse.json({ error: "Ungültige Session" }, { status: 401 });
    }

    // Passwort verifizieren
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: password,
    });

    if (signInError) {
      return NextResponse.json(
        { error: "Passwort ist falsch" },
        { status: 400 }
      );
    }

    // Account mit Service Role löschen
    const { error: deleteError } =
      await supabaseServiceRole.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error("Delete user error:", deleteError);
      return NextResponse.json(
        { error: "Fehler beim Löschen des Accounts" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Account erfolgreich gelöscht" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { error: "Ein unerwarteter Fehler ist aufgetreten" },
      { status: 500 }
    );
  }
}
