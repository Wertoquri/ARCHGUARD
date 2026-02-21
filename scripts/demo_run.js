#!/usr/bin/env node
import { spawnSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

async function buildFigmaUI() {
  const figmaDir = path.resolve('FigmaUI');
  if (!fs.existsSync(figmaDir)) return false;
  console.log('Found FigmaUI — installing and building (may take a minute)...');
  spawnSync('npm', ['--prefix', 'FigmaUI', 'ci'], { stdio: 'inherit' });
  spawnSync('npm', ['--prefix', 'FigmaUI', 'run', 'build'], { stdio: 'inherit' });
  return true;
}

async function startServer() {
  console.log('Starting policy UI server (scripts/serve_policy_ui.js)...');
  const ps = spawn(process.execPath, ['scripts/serve_policy_ui.js'], { stdio: 'inherit' });
  ps.on('exit', (code) => process.exit(code));
}

async function main() {
  try {
    await buildFigmaUI();
  } catch (e) {
    console.warn('FigmaUI build failed (continuing):', e && e.message ? e.message : e);
  }
  console.log('\nDemo server will be available at http://localhost:5175');
  console.log('Press Ctrl+C to stop.');
  await startServer();
}

main().catch((e) => {
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
});

/* Demo runner: seed DB, start server, run example workflow, capture logs, shut down. */
import { spawn } from 'child_process';
import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';

const BASE = process.env.BASE_URL || process.env.BASE || 'http://localhost:5175';
const serverCmd = 'node';
const serverArgs = ['scripts/serve_policy_ui.js'];
const outDir = path.resolve('tmp');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const demoLog = fs.createWriteStream(path.join(outDir, 'demo_output.log'), { flags: 'a' });

function log(...args){ demoLog.write(args.join(' ') + '\n'); console.log(...args); }

async function waitForServer(url, timeoutMs = 15000){
  const start = Date.now();
  while (Date.now() - start < timeoutMs){
    try{
      const r = await fetch(url, { method: 'GET' });
      if (r.status === 200) return true;
    } catch(e){}
    await new Promise(r=>setTimeout(r, 500));
  }
  return false;
}

async function run(){
  log('Seeding workflows...');
  try{
    const seed = spawn('node', ['scripts/seed_workflows.js'], { stdio: 'inherit' });
    await new Promise((res, rej)=> seed.on('close', (c)=> c===0?res():rej(new Error('seed failed'))));
  }catch(e){ log('Seed failed', e); }

  log('Starting server...');
  const server = spawn(serverCmd, serverArgs, { env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', d=> log('[server]', d.toString().trim()));
  server.stderr.on('data', d=> log('[server:err]', d.toString().trim()));

  const ready = await waitForServer(`${BASE}/api/workflows`, 20000);
  if (!ready){
    log('Server did not become ready in time; aborting.');
    server.kill('SIGINT');
    process.exit(1);
  }

  log('Server ready — running example workflow');
  try{
    // Run the existing script which posts to the API and polls
    const run = spawn('node', ['scripts/run_workflow.js'], { env: { ...process.env, BASE_URL: BASE }, stdio: ['ignore', 'pipe', 'pipe'] });
    const out = [];
    run.stdout.on('data', d=> { out.push(d.toString()); log('[run]', d.toString().trim()); });
    run.stderr.on('data', d=> { out.push(d.toString()); log('[run:err]', d.toString().trim()); });
    await new Promise((res)=> run.on('close', ()=> res()));
    fs.writeFileSync(path.join(outDir, 'demo_run_output.txt'), out.join('\n'));
  }catch(e){ log('Run failed', e); }

  log('Shutting down server...');
  server.kill('SIGINT');
  await new Promise(r=> setTimeout(r, 500));
  log('Demo complete — logs in', outDir);
}

run().catch(e=>{ console.error(e && e.stack || e); process.exit(1); });
