import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "ptw_admin_session";

function getAdminPassword(): string {
  const password =
    process.env.ADMIN_DASHBOARD_PASSWORD || process.env.ADMIN_PASSWORD;

  if (!password) {
    throw new Error(
      "Missing ADMIN_DASHBOARD_PASSWORD or ADMIN_PASSWORD environment variable.",
    );
  }

  return password;
}

function buildSessionToken(password: string): string {
  return createHash("sha256")
    .update(`${password}:${process.env.NEXT_PUBLIC_SITE_URL || "local"}`)
    .digest("hex");
}

export function verifyAdminPassword(password: string): boolean {
  const expectedPassword = Buffer.from(getAdminPassword());
  const suppliedPassword = Buffer.from(password);

  if (expectedPassword.length !== suppliedPassword.length) {
    return false;
  }

  return timingSafeEqual(expectedPassword, suppliedPassword);
}

export function getAdminSessionToken(): string {
  return buildSessionToken(getAdminPassword());
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!sessionCookie) {
    return false;
  }

  const expected = Buffer.from(getAdminSessionToken());
  const actual = Buffer.from(sessionCookie);

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}
