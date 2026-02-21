import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  const client = await page.target().createCDPSession();
  await client.send('Profiler.enable');
  await client.send('Profiler.startPreciseCoverage', { callCount: false, detailed: true });

  await page.setContent('<!doctype html><html><body><script>function foo(){console.log("hello");return 42;} foo();</script></body></html>');

  const res = await client.send('Profiler.takePreciseCoverage');
  await client.send('Profiler.stopPreciseCoverage');
  await client.send('Profiler.disable');

  console.log('CDP Precise Coverage:');
  console.log(JSON.stringify(res, null, 2));
  await browser.close();
})();
