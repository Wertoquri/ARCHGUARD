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
    // heuristic: click main nav item 'Findings' (by text) if present
    await page.evaluate(() => {
      function clickByText(selector, text) {
        const el = Array.from(document.querySelectorAll(selector)).find(n => n.innerText && n.innerText.trim().toLowerCase().includes(text.toLowerCase()));
        if (el) el.click();
        return !!el;
      }
      // try a few nav labels commonly used
      clickByText('a,button,[role="button"]', 'Findings') || clickByText('a,button,[role="button"]', 'Findings');
    });
    await page.waitForTimeout(800).catch(() => {});

    // try to open first finding card by looking for common class or text
    const opened = await page.evaluate(() => {
      const card = Array.from(document.querySelectorAll('a,button,div'))
        .find(n => n.innerText && /findings|violation|violation detail|open policy/i.test(n.innerText));
      if (card) { card.click(); return true; }
      const rows = document.querySelectorAll('[role="row"], .list-item, .card');
      if (rows && rows[0]) { rows[0].click(); return true; }
      return false;
    });
    if (opened) await page.waitForTimeout(700);

    // try to open Rule Editor / Open Policy buttons
    await page.evaluate(() => {
      function clickText(text) {
        const el = Array.from(document.querySelectorAll('button,a')).find(n => n.innerText && n.innerText.trim().toLowerCase().includes(text.toLowerCase()));
        if (el) el.click();
      }
      clickText('Open Policy');
      clickText('Rule Editor');
      clickText('Open Policy');
    });
    await page.waitForTimeout(700).catch(() => {});

    // try filling a remediation form: look for inputs labelled assignee/due/status
    try {
      const inputSelectors = ['input[placeholder*="assignee"]', 'input[name*="assignee"]', 'input[placeholder*="Assignee"]', 'input[type="text"]'];
      for (const sel of inputSelectors) {
        const el = await page.$(sel);
        if (el) { await el.focus(); await page.keyboard.type('demo'); break; }
      }
      // try clicking Save/Create buttons
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => /save|create|submit|create jira|create issue/i.test(b.innerText));
        if (btn) btn.click();
      });
      await page.waitForTimeout(700).catch(() => {});
    } catch (e) {
      // ignore form fill errors
    }

    // fallback: click a few visible buttons to increase coverage
    const clickables = await page.$$('a[href], button, [role="button"]');
    const maxClicks = Math.min(8, clickables.length);
    for (let i = 0; i < maxClicks; i++) {
      try {
        const el = clickables[i];
        const box = await el.boundingBox();
        if (box) { await el.click({ delay: 40 }); await page.waitForTimeout(250); }
      } catch (e) {}
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
