import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.coverage.startJSCoverage();
  await page.setContent('<!doctype html><html><body><script>function foo(){console.log("hello");return 42;} foo();</script></body></html>');
  const coverage = await page.coverage.stopJSCoverage();
  console.log('SMOKE COVERAGE OUTPUT:');
  console.log(JSON.stringify(coverage, null, 2));
  await browser.close();
})();
