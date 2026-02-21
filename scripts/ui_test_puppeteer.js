import puppeteer from 'puppeteer';
import path from 'path';

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  const base = 'http://localhost:5174/figma-ui/';
  try {
    await page.goto(base, { waitUntil: 'networkidle2' });

    // debug: list visible button texts
    const btns = await page.$$eval('button', (nodes) => nodes.map(n => n.innerText.trim()).filter(Boolean));
    console.log('Buttons on page:', btns.slice(0,40));
    // Navigate to Policy Studio (robust selector fallback)
    const clickedPolicy = await page.$$eval('button', (nodes, txt) => {
      const el = nodes.find(n => n.innerText && n.innerText.includes(txt));
      if (el) { el.click(); return true; }
      return false;
    }, 'Policy Studio');
    if (!clickedPolicy) throw new Error('Policy Studio nav button not found');
    await sleep(500);

    // Click 'New Policy' button (try english then fallback to any button containing 'New' or 'Нов')
    let newClicked = false;
    const searchTexts = ['New Policy', 'New', 'Нова', 'Нов'];
    for (const txt of searchTexts) {
      newClicked = await page.$$eval('button', (nodes, txt) => {
        const el = nodes.find(n => n.innerText && n.innerText.includes(txt));
        if (el) { el.click(); return true; }
        return false;
      }, txt);
      if (newClicked) break;
    }
    if (!newClicked) throw new Error('New Policy button not found');
    await sleep(300);

    // Click 'Upload Policy Pack' in the new menu
    const clickedUploadMenu = await page.$$eval('button', (nodes, txt) => {
      const el = nodes.find(n => n.innerText && n.innerText.includes(txt));
      if (el) { el.click(); return true; }
      return false;
    }, 'Upload Policy Pack');
    if (!clickedUploadMenu) throw new Error('Upload Policy Pack menu item not found');

    // Confirm open on modal (button with text 'Open')
    await page.waitForFunction((txt) => Array.from(document.querySelectorAll('button')).some(b => b.innerText && b.innerText.trim() === txt), { timeout: 5000 }, 'Open');
    await page.$$eval('button', (nodes, txt) => {
      const el = nodes.find(n => n.innerText && n.innerText.trim() === txt);
      if (el) el.click();
    }, 'Open');

    // Wait for add-pack panel and file input
    await page.waitForSelector('input[type=file]', { timeout: 5000 });
    const input = await page.$('input[type=file]');
    if (!input) throw new Error('File input not found');

    const filePath = path.resolve(process.cwd(), 'policy-packs', 'strict-security.yaml');
    await input.uploadFile(filePath);

    // Monitor network responses for debug
    page.on('response', (resp) => {
      try {
        const url = resp.url();
        if (url.includes('/api/policy/packs')) {
          console.log('NETWORK:', url, resp.status());
        }
      } catch (e) {}
    });

    // Click Upload button
    const uploadClicked = await page.$$eval('button', (nodes, t1, t2) => {
      const el = nodes.find(n => n.innerText && (n.innerText.trim() === t1 || n.innerText.trim() === t2));
      if (el) { el.click(); return true; }
      return false;
    }, 'Upload', 'Завантажити');
    if (!uploadClicked) throw new Error('Upload button not found');
    // wait for the upload network request
    const waitForUpload = page.waitForResponse((resp) => resp.url().includes('/api/policy/packs/upload-with-version'), { timeout: 10000 });
    const uploadResp = await waitForUpload.catch(() => null);
    if (!uploadResp) throw new Error('Upload request not observed');
    let uploadJson = null;
    try { uploadJson = await uploadResp.json(); } catch (e) { uploadJson = await uploadResp.text().catch(() => null); }
    console.log('Upload response:', uploadJson);

    // Wait for changelog modal to appear (look for 'Changelog' title) — portable XPath helper
    await page.waitForFunction((xp) => !!document.evaluate(xp, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue, { timeout: 10000 }, "//*[contains(., 'Changelog') or contains(., 'Журнал змін')]");
    console.log('SUCCESS: Changelog modal detected');
  } catch (e) {
    console.error('FAIL:', e.message);
    await browser.close();
    process.exit(1);
  }
  await browser.close();
  process.exit(0);
})();
