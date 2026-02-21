import puppeteer from 'puppeteer';

(async ()=>{
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.goto(process.env.FIGMA_UI_URL || 'http://localhost:5173/figma-ui/');
  const targets = browser.targets().map(t=>({type: t.type(), url: t.url(), _id: t._targetId}));
  console.log('BROWSER TARGETS:', JSON.stringify(targets, null, 2));
  await browser.close();
})();
