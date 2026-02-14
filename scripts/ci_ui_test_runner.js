import { spawn } from 'child_process';
import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs';

function runCommand(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', shell: true, ...opts });
    p.on('error', reject);
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('exit ' + code))));
  });
}

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url, { method: 'GET' });
      if (r.ok) return true;
    } catch (e) {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('server did not become ready');
}

(async () => {
  try {
    console.log('1) Building Figma UI...');
    await runCommand('npm', ['--prefix', 'FigmaUI', 'run', 'build']);

    console.log('2) Starting local server...');
    const serverEnv = { ...process.env, PORT: '5174' };
    const server = spawn('node', ['scripts/serve_policy_ui.js'], { env: serverEnv, shell: true, stdio: 'inherit' });

    try {
      await waitForServer('http://localhost:5174/figma-ui/', 20000);
      console.log('Server ready');
    } catch (e) {
      server.kill('SIGTERM');
      throw e;
    }

    console.log('3) Running Puppeteer UI test...');
    await runCommand('node', ['scripts/ui_test_puppeteer.js']);

    console.log('Test completed successfully');
    server.kill('SIGTERM');
    process.exit(0);
  } catch (e) {
    console.error('CI UI test failed:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
