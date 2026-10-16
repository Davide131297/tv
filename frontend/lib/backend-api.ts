import "server-only";

const BACKEND_TIMEOUT_MS = 55000;

/**
 * Ruft eine Route des Crawler-Backends (Cloud Run) auf und gibt Status und JSON-Body zurück.
 * Authentifiziert sich mit demselben Bearer-Token wie die GitHub-Workflows.
 */
export async function postToBackend(
  path: string,
  body: unknown,
): Promise<{ status: number; data: unknown }> {
  const backendUrl = process.env.BACKEND_URL;
  const apiKey = process.env.CRAWL_API_KEY ?? process.env.NEXT_PUBLIC_CRAWL_API_KEY;

  if (!backendUrl || !apiKey) {
    throw new Error("BACKEND_URL oder CRAWL_API_KEY ist nicht konfiguriert.");
  }

  const response = await fetch(new URL(path, backendUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
  });

  const data: unknown = await response.json().catch(() => ({
    error: `Backend antwortete mit HTTP ${response.status}.`,
  }));

  return { status: response.status, data };
}
