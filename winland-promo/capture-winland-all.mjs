import puppeteer from 'puppeteer';
import fs from 'fs';

const BASE = 'http://localhost:5173';
const OUT_DIR = './public/textures/live';
fs.mkdirSync(OUT_DIR, { recursive: true });

async function run() {
  console.log('Launching headless browser to capture all WinLand feature textures...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });

  // 1. Capture Settings Window (3D WebGL Device Catalog)
  console.log('Navigating to Settings 3D Catalog...');
  await page.goto(`${BASE}/?settings`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 2500));
  await page.screenshot({ path: `${OUT_DIR}/settings_3d_catalog.png`, omitBackground: true });
  console.log('Captured settings_3d_catalog.png');

  // 2. Capture Dynamic Island Main Stage (Idle & Music Expanded)
  console.log('Navigating to Dynamic Island Main Stage...');
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 1000));

  // Expand Music Player
  await page.evaluate(() => {
    const el = document.querySelector('.island-pill-container') || document.querySelector('.dynamic-island') || document.body;
    el.click();
  });
  await new Promise((r) => setTimeout(r, 1200));

  const islandEl = await page.$('.dynamic-island') || await page.$('.island-overlay-stage') || await page.$('#root');
  if (islandEl) {
    await islandEl.screenshot({ path: `${OUT_DIR}/island_expanded.png`, omitBackground: true });
    console.log('Captured island_expanded.png');
  }

  await browser.close();
  console.log('All WinLand feature textures captured successfully!');
}

run().catch((err) => {
  console.error('Capture error:', err);
  process.exit(1);
});
