import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

async function run() {
  // allow CI to override the preview URL; default matches FigmaUI preview used in CI
  const url = process.env.FIGMA_UI_URL || 'http://127.0.0.1:5175/figma-ui/';
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  // small helper instead of `page.waitForTimeout` which may not exist in some Puppeteer builds
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  // start PreciseCoverage via CDP (more reliable across Puppeteer versions)
  // Create CDP sessions for all current and future page targets so we capture coverage
  const sessions = new Map();
  // also attempt Puppeteer's JS coverage API as a fallback (some Chromium builds provide it)
  let jsCoverageEnabled = false;
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

  // Try to enable Puppeteer's page.coverage as an additional source of coverage
  try {
    if (page && page.coverage && typeof page.coverage.startJSCoverage === 'function') {
      await page.coverage.startJSCoverage({ includeRawScriptCoverage: true });
      jsCoverageEnabled = true;
    }
  } catch (e) {
    // ignore if not available
  }

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
      await sleep(800);
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
    await sleep(800);

    // try to open first finding card by looking for common class or text
    const opened = await page.evaluate(() => {
      const card = Array.from(document.querySelectorAll('a,button,div'))
        .find(n => n.innerText && /findings|violation|violation detail|open policy/i.test(n.innerText));
      if (card) { card.click(); return true; }
      const rows = document.querySelectorAll('[role="row"], .list-item, .card');
      if (rows && rows[0]) { rows[0].click(); return true; }
      return false;
    });
    if (opened) await sleep(700);

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
    await sleep(700);

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
      await sleep(700);
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
        if (box) { await el.click({ delay: 40 }); await sleep(250); }
      } catch (e) {}
    }
  } catch (e) {
    console.warn('UI interactions failed (tolerant):', e && e.message ? e.message : e);
  }

  // collect precise coverage from CDP
  // gather coverage from all sessions
  const allResults = [];
  // if Puppeteer JS coverage was enabled, stop it and merge
  if (jsCoverageEnabled) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const jsCov = await page.coverage.stopJSCoverage();
      if (Array.isArray(jsCov)) {
        for (const item of jsCov) {
          try {
            const ranges = item.ranges || [];
            const functions = [{ functionName: '(anonymous)', ranges: ranges.map(r => ({ startOffset: r.start || r.startOffset || 0, endOffset: r.end || r.endOffset || 0, count: r.count || 1 })) }];
            allResults.push({ url: item.url || item.scriptId || '', functions });
          } catch (e) {}
        }
      }
    } catch (e) {
      // ignore fallback failures
    }
  }
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

  // emit compact debug info to job logs so CI shows whether any coverage was captured
  try {
    console.log('COLLECTED_COVERAGE_COUNT:', Array.isArray(v8Coverage) ? v8Coverage.length : 0);
    try {
      const sample = (Array.isArray(v8Coverage) ? v8Coverage.slice(0, 20).map(e => (e && (e.url || e.scriptId)) || null) : []);
      console.log('COLLECTED_COVERAGE_URLS_SAMPLE:', JSON.stringify(sample));
    } catch (e) {}
  } catch (e) {}

  // write raw V8 coverage into .nyc_output so CI can inspect it.
  try {
    // save raw V8 coverage for debugging outside of .nyc_output so nyc doesn't attempt to parse it
    const rawDir = path.resolve(process.cwd(), '.nyc_debug');
    fs.mkdirSync(rawDir, { recursive: true });
    const rawOutPath = path.join(rawDir, `v8-coverage-${Date.now()}.json`);
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

        // Common case: assets served from /figma-ui/assets/<name>
        if (pathname.startsWith('assets/')) {
          const assetCandidate = path.resolve(process.cwd(), 'FigmaUI', 'dist', pathname);
          if (fs.existsSync(assetCandidate)) return assetCandidate;
          const assetBasename = path.basename(pathname).split('?')[0];
          const tryAsset = path.resolve(process.cwd(), 'FigmaUI', 'dist', 'assets', assetBasename);
          if (fs.existsSync(tryAsset)) return tryAsset;
        }

        // fallback: search by basename inside FigmaUI/dist using heuristics
        const basename = path.basename(pathname).split('?')[0];
        const token = basename.replace(/\.[^.]+$/, '');
        const tokenPrefix = (token.split(/[-_.]/)[0] || token);
        const distDir = path.resolve(process.cwd(), 'FigmaUI', 'dist');
        const stack = [distDir];
        const includesMatches = [];
        const startsWithMatches = [];
        while (stack.length) {
          const cur = stack.pop();
          try {
            for (const ent of fs.readdirSync(cur, { withFileTypes: true })) {
              const p = path.join(cur, ent.name);
              if (ent.isDirectory()) { stack.push(p); continue; }
              if (!ent.isFile()) continue;
              const name = ent.name;
              if (name === basename) return p; // exact match
              // case-insensitive checks and contains-any-token check
              const lname = name.toLowerCase();
              if (lname === basename.toLowerCase()) return p;
              if (lname.startsWith(tokenPrefix.toLowerCase())) startsWithMatches.push(p);
              else if (lname.includes(token.toLowerCase())) includesMatches.push(p);
            }
          } catch (e) {}
        }
        if (startsWithMatches.length) return startsWithMatches[0];
        if (includesMatches.length) return includesMatches[0];
      } catch (e) {}
      return null;
    }

    const istanbulCoverage = {};
    // put fetched sources and debug dumps outside of .nyc_output so nyc won't try to parse them
    const sourcesDir = path.resolve(process.cwd(), '.nyc_debug', 'sources');
    if (!fs.existsSync(sourcesDir)) fs.mkdirSync(sourcesDir, { recursive: true });
    const mappingLogs = [];

    for (const entry of v8Coverage) {
      const scriptUrl = entry.url || entry.scriptId || '';
      if (!scriptUrl || scriptUrl === '') continue;
      const mappingAttempt = { scriptUrl, attemptedAt: new Date().toISOString(), mappedBy: null, localFile: null, fetched: null, pptrFile: null, converterSuccess: false, applyCoverageError: null, notes: [] };

      // ignore puppeteer internal/instrumentation scripts which don't map to real source files
      if (typeof scriptUrl === 'string' && scriptUrl.startsWith('pptr:')) {
        // allow pptr:...file:// mappings to be handled below, but skip simple pptr:internal entries
        if (!scriptUrl.includes('file://')) {
          // console.debug('Skipping puppeteer internal script', scriptUrl);
          continue;
        }
      }

      // try local mapping first
      let localFile = findLocalBuildFile(scriptUrl);
      if (localFile) { mappingAttempt.mappedBy = 'local-build-file'; mappingAttempt.localFile = localFile; }

      // helper to write fetched remote script to .nyc_output/sources
      async function fetchAndSave(urlStr) {
        try {
          const u = new URL(urlStr);
          const safeName = encodeURIComponent(u.pathname.replace(/\//g, '_')) + (u.search ? '_' + encodeURIComponent(u.search) : '');
          const outPath = path.join(sourcesDir, `${safeName}.js`);
          if (fs.existsSync(outPath)) return outPath;
          // use global fetch (Node 18+) or fallback to require('node-fetch') if needed
          const res = await fetch(u.toString());
          if (!res.ok) return null;
          const text = await res.text();
          fs.writeFileSync(outPath, text, 'utf8');

          // try to find sourceMappingURL and fetch the map next to the file
          const m = /sourceMappingURL=([^\n\r]+)/.exec(text);
          if (m && m[1]) {
            try {
              let mapUrl = m[1].trim();
              // strip possible inline comment markers
              mapUrl = mapUrl.replace(/[*\\/]+$/, '').trim();
              const resolved = new URL(mapUrl, u).toString();
              const mapRes = await fetch(resolved);
              if (mapRes.ok) {
                const mapText = await mapRes.text();
                const mapOut = outPath + '.map';
                fs.writeFileSync(mapOut, mapText, 'utf8');

                // attempt to fetch original sources listed in the source map
                try {
                  const mapObj = JSON.parse(mapText);
                  const sources = Array.isArray(mapObj.sources) ? mapObj.sources : [];
                  const sourceRoot = mapObj.sourceRoot || '';
                  for (const src of sources) {
                    try {
                      // resolve source against the map location
                      const srcUrl = new URL(src, resolved).toString();
                      const safeSrcName = src.replace(/[:\\/*?"<>|]/g, '_');
                      const srcOut = path.join(sourcesDir, safeSrcName);
                      if (fs.existsSync(srcOut)) continue;
                      const srcRes = await fetch(srcUrl);
                      if (srcRes.ok) {
                        const srcText = await srcRes.text();
                        fs.writeFileSync(srcOut, srcText, 'utf8');
                      }
                    } catch (e) {
                      // ignore individual source fetch failures
                    }
                  }
                } catch (e) {}
              }
            } catch (e) {
              // ignore map fetch errors
            }
          }
          return outPath;
        } catch (e) {
          return null;
        }
      }

      if (!localFile) {
        // handle puppeteer-evaluate inline script urls like 'pptr:evaluate;run (file:///...)'
        try {
          if (scriptUrl.startsWith('pptr:') && scriptUrl.includes('file://')) {
            const m = /file:\/\/[^")]+/.exec(scriptUrl);
            if (m) {
              const f = decodeURIComponent(m[0].replace(/^file:\/\//, ''));
              if (fs.existsSync(f)) localFile = f;
            }
          }
        } catch (e) {}
        if (localFile) { mappingAttempt.mappedBy = 'pptr-file'; mappingAttempt.pptrFile = localFile; }
      }

      if (!localFile) {
        // try fetching the served URL and saving it for conversion
        try {
          if (scriptUrl.startsWith('http:') || scriptUrl.startsWith('https:')) {
            // eslint-disable-next-line no-await-in-loop
            const fetched = await fetchAndSave(scriptUrl);
            mappingAttempt.fetched = fetched || null;
            if (fetched) { localFile = fetched; mappingAttempt.mappedBy = 'fetched'; mappingAttempt.localFile = fetched; }
          }
        } catch (e) {}
      }

      if (!localFile) {
        try {
          const debugMap = { scriptUrl, attemptedAt: new Date().toISOString() };
          try {
            const dbgPath = path.join(sourcesDir, 'mapping-fail-' + encodeURIComponent(scriptUrl).slice(0,80) + '-' + Date.now() + '.json');
            fs.writeFileSync(dbgPath, JSON.stringify(debugMap, null, 2), 'utf8');
            console.warn('Wrote mapping debug file to', dbgPath);
          } catch (e) {}
        } catch (e) {}
        console.warn('Could not map served URL to local file and fetch failed:', scriptUrl);
        mappingAttempt.notes.push('mapping-failed');
        mappingLogs.push(mappingAttempt);
        continue;
      }

      try {
        const converter = v8ToIstanbulModule(localFile, 0, {});
        // eslint-disable-next-line no-await-in-loop
        await converter.load();

        // Normalize CDP PreciseCoverage entry shape to what v8-to-istanbul expects
        const normalizeEntry = (ent) => {
          const copy = Object.assign({}, ent);
          if (Array.isArray(copy.functions)) {
            copy.functions = copy.functions.map((fn) => {
              const fcopy = Object.assign({}, fn);
              // some CDP variants name ranges differently; ensure 'ranges' and 'blocks' exist as arrays
              const ranges = fn.ranges || fn.blocks || [];
              const rangesArr = Array.isArray(ranges) ? ranges : Array.from(ranges || []);
              // convert ranges to plain objects array
              const plainRanges = rangesArr.map(r => ({ startOffset: r.startOffset, endOffset: r.endOffset, count: r.count }));
              // some converters expect blocks as array-of-arrays [start,end,count]
              const blocksArr = plainRanges.map(r => [r.startOffset, r.endOffset, r.count]);
              fcopy.ranges = plainRanges;
              fcopy.blocks = blocksArr;
              return fcopy;
            });
          }
          return copy;
        };

        const tryApply = async (covEntry) => {
          try {
            converter.applyCoverage(covEntry);
            return true;
          } catch (err) {
            // try wrapping in { result: [entry] }
            try {
              converter.applyCoverage({ result: [covEntry] });
              return true;
            } catch (err2) {
              console.error('applyCoverage stack:', err2 && err2.stack ? err2.stack : err2);
              throw err2;
            }
          }
        };

        const normalized = normalizeEntry(entry);
        const blocksToApply = (normalized.functions || []).map((f) => ({ functionName: f.functionName || '(anonymous)', ranges: f.ranges || [], isBlockCoverage: !!f.isBlockCoverage }));
        console.log('Converting', localFile, 'functions=', blocksToApply.length, 'firstRangesIsArray=', Array.isArray(blocksToApply[0] && blocksToApply[0].ranges));
        // eslint-disable-next-line no-await-in-loop
        await tryApply(blocksToApply).then(() => {
          mappingAttempt.converterSuccess = true;
        }).catch((err) => {
          console.warn('applyCoverage failed for', localFile, 'error:', err && err.message ? err.message : err);
          if (normalized && normalized.functions && normalized.functions.length) {
            try {
              const sample = normalized.functions.slice(0,3).map(f => ({ functionName: f.functionName, rangesType: typeof f.ranges, rangesLen: Array.isArray(f.ranges) ? f.ranges.length : 0 }));
              console.warn('Sample functions:', JSON.stringify(sample));
            } catch (e) {}
            try {
              const debugPath = path.join(sourcesDir, 'debug-' + path.basename(localFile) + '-' + Date.now() + '.json');
              fs.writeFileSync(debugPath, JSON.stringify(normalized, null, 2), 'utf8');
              console.warn('Wrote debug normalized entry to', debugPath);
            } catch (e) {}
          }
          mappingAttempt.applyCoverageError = err && (err.message || (err.stack || String(err)));
          mappingLogs.push(mappingAttempt);
          throw err;
        });

        const fileCov = converter.toIstanbul();
        // v8-to-istanbul may return either:
        // - an object keyed by filename: { "/abs/path/file.js": { ... } }
        // - or a single-file coverage object: { path: ..., statementMap: ..., s: ... }
        // Normalize both cases and ensure nyc gets an object keyed by absolute POSIX paths.
        try {
          if (fileCov && typeof fileCov === 'object') {
            const keys = Object.keys(fileCov);
            const looksLikeWrapped = keys.length > 0 && keys.some(k => (k.includes('/') || k.includes('\\')) && (k.endsWith('.js') || k.endsWith('.ts') || k.endsWith('.tsx')));
            const looksLikeSingle = ('path' in fileCov) && (fileCov.statementMap || fileCov.s || fileCov.fnMap);

            if (looksLikeSingle) {
              const abs = path.resolve(localFile);
              const normalizedKey = abs.split(path.sep).join('/');
              istanbulCoverage[normalizedKey] = fileCov;
            } else if (looksLikeWrapped) {
              for (const k of keys) {
                try {
                  const val = fileCov[k];
                  // If key is not absolute, try to resolve relative to localFile
                  let resolvedKey = k;
                  if (!path.isAbsolute(k)) resolvedKey = path.resolve(path.dirname(localFile), k);
                  const normalizedKey = resolvedKey.split(path.sep).join('/');
                  istanbulCoverage[normalizedKey] = val;
                } catch (e) {
                  // skip individual key failures
                }
              }
            } else {
              // Fallback: attach under the discovered localFile path
              const abs = path.resolve(localFile);
              const normalizedKey = abs.split(path.sep).join('/');
              istanbulCoverage[normalizedKey] = fileCov;
            }
          }
        } catch (e) {
          // if normalization fails, avoid merging unknown shapes (would produce invalid keys like 'url'/'functions')
          console.warn('Could not normalize converter.toIstanbul output for', localFile, 'skipping. Error:', e && e.message ? e.message : e);
        }
        mappingLogs.push(mappingAttempt);
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
    try {
      const mapLogOut = path.join(path.resolve(process.cwd(), '.nyc_debug'), `mapping-${Date.now()}.json`);
      fs.writeFileSync(mapLogOut, JSON.stringify(mappingLogs, null, 2), 'utf8');
      console.log('Wrote mapping debug log to', mapLogOut);
    } catch (e) {}
  } catch (e) {
    console.error('Failed to write coverage:', e && e.message ? e.message : e);
  }
}

run().catch((e) => {
  console.error('collect_browser_coverage failed:', e && e.stack ? e.stack : e);
  process.exit(1);
});
