import puppeteer from 'puppeteer';
import path from 'path';

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);
  const base = 'http://localhost:5174/figma-ui/';
  try {
    await page.goto(base, { waitUntil: 'networkidle2' });

    // debug: list visible button texts
    const btns = await page.$$eval('button', (nodes) => nodes.map(n => n.innerText.trim()).filter(Boolean));
    console.log('Buttons on page:', btns.slice(0,40));
    // Navigate to Policy Studio
    const [policyNav] = await page.$x("//button[contains(., 'Policy Studio')]");
    if (!policyNav) throw new Error('Policy Studio nav button not found');
    await page.evaluate(el => el.click(), policyNav);
    await page.waitForTimeout(500);

    // Click 'New Policy' button (try english then fallback to any button containing 'New' or 'Нов')
    let newBtn = null;
    const searchX = ["//button[contains(., 'New Policy')]", "//button[contains(., 'New')]", "//button[contains(., 'Нова')]", "//button[contains(., 'Нов')]"];
    for (const xp of searchX) {
      const els = await page.$x(xp);
      if (els && els.length > 0) { newBtn = els[0]; break; }
    }
    if (!newBtn) throw new Error('New Policy button not found');
    await newBtn.click();
    await page.waitForTimeout(300);

    // Click 'Upload Policy Pack' in the new menu
    const [uploadMenu] = await page.$x("//button[contains(., 'Upload Policy Pack')]");
    if (!uploadMenu) throw new Error('Upload Policy Pack menu item not found');
    await uploadMenu.click();

    // Confirm open on modal (button with text 'Open')
    await page.waitForXPath("//button[normalize-space(.)='Open']", { timeout: 5000 });
    const [confirmOpen] = await page.$x("//button[normalize-space(.)='Open']");
    await confirmOpen.click();

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
    const [uploadBtn] = await page.$x("//button[normalize-space(.)='Upload'] | //button[normalize-space(.)='Завантажити']");
    if (!uploadBtn) throw new Error('Upload button not found');
    // wait for the upload network request
    const waitForUpload = page.waitForResponse((resp) => resp.url().includes('/api/policy/packs/upload-with-version'), { timeout: 10000 });
    await uploadBtn.click();
    const uploadResp = await waitForUpload.catch(() => null);
    if (!uploadResp) throw new Error('Upload request not observed');
    let uploadJson = null;
    try { uploadJson = await uploadResp.json(); } catch (e) { uploadJson = await uploadResp.text().catch(() => null); }
    console.log('Upload response:', uploadJson);

    // Wait for changelog modal to appear (look for 'Changelog' title)
    await page.waitForXPath("//*[contains(., 'Changelog') or contains(., 'Журнал змін')]", { timeout: 10000 });
    console.log('SUCCESS: Changelog modal detected');
  } catch (e) {
    console.error('FAIL:', e.message);
    await browser.close();
    process.exit(1);
  }
  await browser.close();
  process.exit(0);
})();
