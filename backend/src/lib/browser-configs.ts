import puppeteer from "puppeteer";

export async function createBrowser() {
  const isProduction = process.env.NODE_ENV === "production";

  return await puppeteer.launch({
    headless: true,
    executablePath: isProduction ? "/usr/bin/google-chrome-stable" : undefined,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage", // Kritisch!
      "--disable-gpu",
      "--disable-software-rasterizer",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-sync",
      "--disable-translate",
      "--hide-scrollbars",
      "--metrics-recording-only",
      "--mute-audio",
      "--no-first-run",
      "--safebrowsing-disable-auto-update",
      "--ignore-certificate-errors",
      "--ignore-ssl-errors",
      "--ignore-certificate-errors-spki-list",
      "--disable-features=VizDisplayCompositor",
      "--disable-web-security",
      // Memory Optimierungen
      "--disable-accelerated-2d-canvas",
      "--disable-dev-tools",
      "--disable-blink-features=AutomationControlled",
      "--js-flags=--max-old-space-size=512",
    ],
  });
}

export async function setupSimplePage(browser: any) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 }); // Kleiner = weniger RAM

  // Memory-Optimierung: Bilder/CSS blockieren wenn nicht nötig
  await page.setRequestInterception(true);
  page.on("request", (request: any) => {
    const resourceType = request.resourceType();
    if (["image", "stylesheet", "font", "media"].includes(resourceType)) {
      request.abort();
    } else {
      request.continue();
    }
  });

  return page;
}
