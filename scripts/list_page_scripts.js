import puppeteer from 'puppeteer';

(async ()=>{
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.goto(process.env.FIGMA_UI_URL || 'http://localhost:5173/figma-ui/');
  const scripts = await page.evaluate(()=> Array.from(document.scripts).map(s=>({src: s.src, type: s.type, text: s.innerText && s.innerText.slice(0,200)})) );
  console.log('PAGE SCRIPTS:', JSON.stringify(scripts, null, 2));
  await browser.close();
})();
