import dotenv from "dotenv";
dotenv.config();

const DEFAULT_BASE_URL = process.env.BLUESKY_BOT_BASE_URL || "http://127.0.0.1:3000";
const DEFAULT_PERIOD = process.env.BLUESKY_BOT_PERIOD || "weekly";

function parseArgs(argv) {
  const options = {
    period: DEFAULT_PERIOD,
    live: false,
    baseUrl: DEFAULT_BASE_URL,
  };

  for (const arg of argv) {
    if (arg === "--live") {
      options.live = true;
      continue;
    }

    if (arg.startsWith("--period=")) {
      options.period = arg.slice("--period=".length);
      continue;
    }

    if (arg.startsWith("--base-url=")) {
      options.baseUrl = arg.slice("--base-url=".length);
    }
  }

  if (!["weekly", "monthly"].includes(options.period)) {
    throw new Error(
      `Invalid period "${options.period}". Use --period=weekly or --period=monthly.`,
    );
  }

  return options;
}

async function main() {
  const { period, live, baseUrl } = parseArgs(process.argv.slice(2));
  const apiKey = process.env.NEXT_PUBLIC_CRAWL_API_KEY;

  if (!apiKey) {
    throw new Error("Missing NEXT_PUBLIC_CRAWL_API_KEY environment variable.");
  }

  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const url = new URL(`${normalizedBaseUrl}/api/bluesky-bot/${period}`);

  if (!live) {
    url.searchParams.set("dryRun", "true");
  }

  console.log(`Requesting ${url.toString()}`);
  console.log(`Mode: ${live ? "live-post" : "dry-run"}`);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  const bodyText = await response.text();
  let body;

  try {
    body = JSON.parse(bodyText);
  } catch {
    body = bodyText;
  }

  if (!response.ok) {
    console.error("Request failed:");
    console.error(JSON.stringify(body, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(body, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
