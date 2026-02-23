import puppeteer from "puppeteer";

export async function createBrowser() {
  const isProduction = process.env.NODE_ENV === "production";

  return await puppeteer.launch({
    headless: true,
    executablePath: isProduction ? "/usr/bin/google-chrome-stable" : undefined,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-extensions",
      "--single-process",
      "--no-zygote",
      "--disable-software-rasterizer",
    ],
  });
}

export async function setupSimplePage(browser: any) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  return page;
}
