#!/usr/bin/env node
import express from 'express';
import path from 'path';
import puppeteer from 'puppeteer';
import fs from 'fs';

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4321;
const root = process.cwd();
const docsDir = path.join(root, 'docs');
const htmlPath = path.join(docsDir, 'dep_graph.html');
const outPng = path.join(docsDir, 'dep_graph.png');

if (!fs.existsSync(htmlPath)) {
  console.error('Missing docs/dep_graph.html – run depgraph first');
  process.exit(2);
}

const app = express();
app.use(express.static(docsDir));

const server = app.listen(port, async () => {
  const url = `http://127.0.0.1:${port}/dep_graph.html`;
  console.log('Serving', url);
  let browser;
  try {
    browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 2 });
    await page.goto(url, { waitUntil: 'networkidle2' });
    // wait short time for network rendering (polyfill for older Puppeteer)
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    if (typeof page.waitForTimeout === 'function') {
      await page.waitForTimeout(800);
    } else {
      await sleep(800);
    }
    await page.screenshot({ path: outPng, fullPage: true });
    console.log('Wrote', outPng);
    await browser.close();
    server.close();
    process.exit(0);
  } catch (e) {
    console.error(e);
    if (browser) await browser.close();
    server.close();
    process.exit(1);
  }
});
