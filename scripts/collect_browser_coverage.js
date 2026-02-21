import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

async function run() {
  // allow CI to override the preview URL; default matches FigmaUI preview used in CI
  const url = process.env.FIGMA_UI_URL || 'http://127.0.0.1:5175/figma-ui/';
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  // start PreciseCoverage via CDP (more reliable across Puppeteer versions)
  // Create CDP sessions for all current and future page targets so we capture coverage
  const sessions = new Map();
  async function startCoverageForTarget(target) {
    try {
      if (target.type() !== 'page') return;
      const s = await target.createCDPSession();
      // enable debugger to capture scriptParsed events and profiler for coverage
      try {
        await s.send('Debugger.enable');
      } catch (e) {}
      try {
        await s.send('Profiler.enable');
        await s.send('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
      } catch (e) {}
      // record parsed scripts for mapping
      sessions.set(target, s);
      try {
        s.on('Debugger.scriptParsed', (ev) => {
          try {
            // store parsed script urls on the session object
            if (!s.__parsedScripts) s.__parsedScripts = new Set();
            if (ev && ev.url) s.__parsedScripts.add(ev.url);
          } catch (e) {}
        });
      } catch (e) {}
    } catch (e) {
      // ignore
    }
  }

  // start for existing targets
  for (const t of await browser.targets()) {
    // eslint-disable-next-line no-await-in-loop
    await startCoverageForTarget(t);
  }
  // start for any future targets (frames/pages)
  browser.on('targetcreated', (t) => {
    startCoverageForTarget(t).catch(() => {});
  });

  // navigate to the UI (assumes a local preview or static server is running)
  // use a valid Puppeteer waitUntil value
  await page.goto(url, { waitUntil: 'networkidle2' });

  // wait for app to render
  await page.waitForSelector('body', { timeout: 15000 }).catch(() => {});

  // navigate to a few likely app routes to exercise route-based code
  const routes = ['/','/findings','/policy','/settings','/dashboard','/pr-review'];
  for (const r of routes) {
    try {
      const dest = new URL(r, url).toString();
      await page.goto(dest, { waitUntil: 'networkidle2' });
      await page.waitForTimeout(800).catch(() => {});
    } catch (e) {
      // ignore navigation failures
    }
  }

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

  // collect precise coverage from CDP
  // gather coverage from all sessions
  const allResults = [];
  for (const [t, s] of sessions) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const take = await s.send('Profiler.takePreciseCoverage');
      // eslint-disable-next-line no-await-in-loop
      await s.send('Profiler.stopPreciseCoverage');
      // eslint-disable-next-line no-await-in-loop
      await s.send('Profiler.disable');
      if (take && take.result) allResults.push(...take.result);
    } catch (e) {}
  }
  const v8Coverage = allResults;
  await browser.close();

  // write raw V8 coverage into .nyc_output so CI can inspect it.
  try {
    fs.mkdirSync('.nyc_output', { recursive: true });
    const rawOutPath = `.nyc_output/v8-coverage-${Date.now()}.json`;
    fs.writeFileSync(rawOutPath, JSON.stringify(v8Coverage), 'utf8');
    console.log(`Browser V8 coverage written to ${rawOutPath}`);

    // try to convert V8 coverage -> Istanbul format using v8-to-istanbul
    let v8ToIstanbulModule;
    try {
      v8ToIstanbulModule = await import('v8-to-istanbul');
      // CJS default interop
      v8ToIstanbulModule = v8ToIstanbulModule.default || v8ToIstanbulModule;
    } catch (e) {
      console.warn('v8-to-istanbul not installed; skipping conversion to Istanbul format.');
      return;
    }

    // helper: try to map a served URL to a local file in FigmaUI/dist
    function findLocalBuildFile(servedUrl) {
      try {
        const u = new URL(servedUrl);
        let pathname = u.pathname || '';
        // remove leading slash
        pathname = pathname.replace(/^\//, '');
        // if the app is served under a base (e.g. figma-ui/), remove it when mapping to dist
        const basePrefix = 'figma-ui/';
        if (pathname.startsWith(basePrefix)) pathname = pathname.slice(basePrefix.length);
        const candidate = path.resolve(process.cwd(), 'FigmaUI', 'dist', pathname);
        if (fs.existsSync(candidate)) return candidate;

        // fallback: search by basename inside FigmaUI/dist
        const basename = path.basename(pathname);
        const distDir = path.resolve(process.cwd(), 'FigmaUI', 'dist');
        const stack = [distDir];
        while (stack.length) {
          const cur = stack.pop();
          try {
            for (const ent of fs.readdirSync(cur, { withFileTypes: true })) {
              const p = path.join(cur, ent.name);
              if (ent.isDirectory()) stack.push(p);
              else if (ent.isFile() && ent.name === basename) return p;
            }
          } catch (e) {}
        }
      } catch (e) {}
      return null;
    }

    const istanbulCoverage = {};
    for (const entry of v8Coverage) {
      const scriptUrl = entry.url || entry.scriptId || '';
      if (!scriptUrl || scriptUrl === '') continue;
      const localFile = findLocalBuildFile(scriptUrl);
      if (!localFile) {
        console.warn('Could not map served URL to local file:', scriptUrl);
        continue;
      }

      try {
        const converter = v8ToIstanbulModule(localFile, 0, {});
        // load file and source maps
        // converter.load() returns a promise
        // apply coverage and get istanbul format
        // eslint-disable-next-line no-await-in-loop
        await converter.load();
        converter.applyCoverage(entry);
        const fileCov = converter.toIstanbul();
        Object.assign(istanbulCoverage, fileCov);
      } catch (e) {
        console.warn('Failed converting', localFile, e && e.message ? e.message : e);
      }
    }

    if (Object.keys(istanbulCoverage).length > 0) {
      const istanbulOut = `.nyc_output/istanbul-coverage-${Date.now()}.json`;
      fs.writeFileSync(istanbulOut, JSON.stringify(istanbulCoverage), 'utf8');
      console.log('Wrote Istanbul coverage for nyc to', istanbulOut);
    } else {
      console.log('No Istanbul coverage produced (no mappings found).');
    }
  } catch (e) {
    console.error('Failed to write coverage:', e && e.message ? e.message : e);
  }
}

run().catch((e) => {
  console.error('collect_browser_coverage failed:', e && e.stack ? e.stack : e);
  process.exit(1);
});
