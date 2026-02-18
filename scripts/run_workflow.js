#!/usr/bin/env node
// Simple runner: create a workflow run and poll until completion
const WORKFLOW_ID = process.argv[2] || 'example-auto-fix';
const BASE = process.env.BASE_URL || 'http://localhost:5174';

async function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

async function main(){
  console.log('Creating run for', WORKFLOW_ID);
  const createRes = await fetch(`${BASE}/api/workflows/${WORKFLOW_ID}/run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  const createJson = await createRes.json().catch(()=>null);
  console.log('Create response:', JSON.stringify(createJson, null, 2));
  const runId = createJson?.run?.id || createJson?.id || createJson?.runId;
  if (!runId) {
    console.error('Could not determine run id from response');
    process.exit(1);
  }
  console.log('Run id:', runId);

  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch(`${BASE}/api/runs/${runId}`);
      const j = await r.json();
      const status = j?.run?.status;
      console.log(`[poll ${i}] status=${status}`);
      console.log(JSON.stringify(j, null, 2));
      if (status && !['pending', 'running'].includes(status)) break;
    } catch (e) {
      console.error('Failed to fetch run status', e && e.message);
      break;
    }
    await sleep(1000);
  }
}

main().catch(err => { console.error(err && err.stack || err); process.exit(1); });
