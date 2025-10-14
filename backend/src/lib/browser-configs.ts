import puppeteer, {
  LaunchOptions,
  Browser,
  Page,
  HTTPRequest,
} from "puppeteer";

// Browser-Konfiguration für verschiedene Umgebungen
export async function createBrowser() {
  const isProduction = process.env.NODE_ENV === "production";
  const isVercel = !!process.env.VERCEL;

  let launchOptions: LaunchOptions;

  if (isProduction && isVercel) {
    // Vercel Production Environment
    console.log("🌐 Starte Browser in Vercel-Umgebung");

    // Dynamischer Import für @sparticuz/chromium nur in Production
    const chromium = await import("@sparticuz/chromium");

    launchOptions = {
      args: [
        ...chromium.default.args,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process", // <- Wichtig für Vercel
        "--disable-gpu",
        "--hide-scrollbars",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
      ],
      defaultViewport: chromium.default.defaultViewport,
      executablePath: await chromium.default.executablePath(),
      headless: chromium.default.headless,
    };
  } else if (isProduction) {
    // Andere Production Environments
    console.log("🏗️ Starte Browser in Production-Umgebung");

    launchOptions = {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--disable-gpu",
      ],
    };
  } else {
    // Development Environment
    console.log("🚀 Starte Browser in Development-Umgebung");

    launchOptions = {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    };
  }

  try {
    const browser = await puppeteer.launch(launchOptions);
    console.log("✅ Browser erfolgreich gestartet");
    return browser;
  } catch (error) {
    console.error("❌ Fehler beim Starten des Browsers:", error);
    throw error;
  }
}

// Hilfsfunktion für Page-Setup
export async function setupPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
  );

  await page.setViewport({ width: 1280, height: 1000 });

  await page.setExtraHTTPHeaders({
    "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
  });

  return page;
}

// Einfache Page-Setup ohne Request-Interception für bessere Vercel-Kompatibilität
export async function setupSimplePage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
  );

  await page.setViewport({ width: 1280, height: 1000 });

  await page.setExtraHTTPHeaders({
    "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
  });

  // Nur in Development Request Interception verwenden
  if (process.env.NODE_ENV !== "production") {
    await page.setRequestInterception(true);
    page.on("request", (request: HTTPRequest) => {
      const resourceType = request.resourceType();

      // Blockiere unnötige Ressourcen
      if (["image", "stylesheet", "font", "media"].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });
  }

  return page;
}
