// QA: drive infinizoom's real state hook (window.__izT / window.__izB), capture
// console errors + pageerrors, screenshot at 6 checkpoints across the track.
import { chromium } from "playwright";
import fs from "node:fs";

const URL = "http://localhost:3000";
const OUT = process.env.QA_OUT ?? "qa-shots";
fs.mkdirSync(OUT, { recursive: true });

const messages = [];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      messages.push({ kind: `console.${msg.type()}`, text: msg.text() });
    }
  });
  page.on("pageerror", (err) => messages.push({ kind: "pageerror", text: String(err.stack || err) }));
  page.on("requestfailed", (req) => messages.push({ kind: "requestfailed", url: req.url(), text: req.failure()?.errorText }));

  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(500); // let first frame(s) render

  // Discover the real max t: N-0.32 where N = route(branches).length.
  // We don't have route() in-page scope, but __izT setter clamps to [0.03, N-0.32],
  // so probe by setting a huge value and reading back the clamp.
  await page.evaluate(() => { window.__izT = 1e9; });
  await page.waitForTimeout(200); // let rAF loop clamp t against the real track length
  const maxT = await page.evaluate(() => window.__izT);
  // reset before starting checkpoint sweep
  await page.evaluate(() => { window.__izT = 0.05; });
  await page.waitForTimeout(200);

  const N = 6;
  const results = [];
  for (let i = 0; i < N; i++) {
    const t = i === 0 ? 0.05 : (i / (N - 1)) * maxT;
    await page.evaluate((val) => { window.__izT = val; }, t);
    // force a couple of animation frames so the HUD/scene settle at the new t
    await page.waitForTimeout(250);
    const hud = await page.evaluate(() => ({
      name: document.querySelector("#hud .name")?.textContent,
      scale: document.querySelector("#hud .scale")?.textContent,
      actualT: window.__izT,
    }));
    const path = `${OUT}/t${i}.png`;
    await page.screenshot({ path, fullPage: false });
    results.push({ i, requestedT: t, ...hud, path });
  }

  await browser.close();

  fs.writeFileSync(`${OUT}/report.json`, JSON.stringify({ maxT, results, messages }, null, 2));
  console.log(JSON.stringify({ maxT, results, messages }, null, 2));
})();
