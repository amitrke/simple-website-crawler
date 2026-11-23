const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const START_URL = "https://www.mycollegely.com/"; // change this
const OUTPUT_DIR = "./extracted_pages";

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await fs.promises.mkdir(OUTPUT_DIR, { recursive: true });
  await page.goto(START_URL, { waitUntil: "networkidle0" });

  // Get all page URLs in your Google Site’s sidebar menu
  const links = await page.$$eval("a[href*='/view/']", (as) =>
    Array.from(new Set(as.map((a) => a.href))).filter((u) => !u.includes("#"))
  );

  console.log(`Found ${links.length} pages.`);

  for (const url of links) {
    console.log("Extracting:", url);
    await page.goto(url, { waitUntil: "networkidle2" });
    await page.waitForTimeout(2000); // Give it time to render

    // Wait for Google Sites’ content container
    await page.waitForSelector("main, div[role='main']", { timeout: 10000 }).catch(() => {});

    // Extract visible text (and optionally basic HTML)
    const content = await page.evaluate(() => {
      // Try to find the Sites main container
      const main = document.querySelector("main") || document.querySelector("div[role='main']");
      if (!main) return "No main content found.";
      return main.innerText.trim();
    });

    const title = url.split("/").pop().replace(/[^a-z0-9]/gi, "_");
    const filePath = path.join(OUTPUT_DIR, `${title || "home"}.txt`);

    fs.writeFileSync(filePath, content, "utf8");
  }

  await browser.close();
  console.log(`✅ Extracted content saved in ${OUTPUT_DIR}`);
})();
