import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  getAdminSessionToken,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { password } = (await request.json()) as { password?: string };

    if (!password || !verifyAdminPassword(password)) {
      return NextResponse.json(
        { error: "Ungültiges Passwort." },
        { status: 401 },
      );
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: getAdminSessionToken(),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { error: "Login fehlgeschlagen." },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
