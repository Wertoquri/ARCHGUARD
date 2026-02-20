import puppeteer from 'puppeteer';
import { writeCoverage } from 'puppeteer-to-istanbul';

async function run() {
  const url = process.env.FIGMA_UI_URL || 'http://127.0.0.1:5173/';
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  // start V8 coverage collection
  await page.coverage.startJSCoverage({ includeRawScriptCoverage: true });

  // navigate to the UI (assumes a local preview or static server is running)
  await page.goto(url, { waitUntil: 'networkidle' });

  // wait for app to render
  await page.waitForSelector('body', { timeout: 10000 }).catch(() => {});

  // perform lightweight, tolerant interactions to exercise UI flows
  try {
    // click up to a few visible links/buttons to traverse the app
    const clickables = await page.$$('a[href], button, [role="button"]');
    const maxClicks = Math.min(6, clickables.length);
    for (let i = 0; i < maxClicks; i++) {
      try {
        const el = clickables[i];
        // ensure element is visible before clicking
        const box = await el.boundingBox();
        if (box) {
          await el.click({ delay: 50 });
          await page.waitForTimeout(300);
        }
      } catch (e) {
        // ignore individual click failures
      }
    }

    // try typing into the first text input or textarea we find
    const inputs = await page.$$('input[type="text"], input:not([type]), textarea');
    if (inputs.length > 0) {
      try {
        const input = inputs[0];
        await input.focus();
        await page.keyboard.type('test');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(300);
      } catch (e) {
        // ignore input failures
      }
    }
  } catch (e) {
    console.warn('UI interactions failed (tolerant):', e && e.message ? e.message : e);
  }

  const v8Coverage = await page.coverage.stopJSCoverage();
  await browser.close();

  // write coverage into .nyc_output (puppeteer-to-istanbul default)
  writeCoverage(v8Coverage);
  console.log('Browser coverage written to .nyc_output/ (puppeteer-to-istanbul)');
}

run().catch((e) => {
  console.error('collect_browser_coverage failed:', e && e.stack ? e.stack : e);
  process.exit(1);
});
