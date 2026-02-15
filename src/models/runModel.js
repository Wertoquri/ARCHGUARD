import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const DATA_DIR = path.resolve(process.cwd(), 'data', 'workflow-runs');

async function ensureDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (e) {
    console.debug('ensureDir failed for workflow-runs:', e && e.message);
  }
}

function fileFor(id) {
  return path.join(DATA_DIR, `${id}.json`);
}

export async function createRun(workflowId, opts = {}) {
  await ensureDir();
  const id = opts.id || randomUUID();
  const now = Date.now();
  const run = {
    id,
    workflowId,
    status: opts.status || 'pending',
    startedAt: opts.startedAt || null,
    finishedAt: opts.finishedAt || null,
    currentStepId: opts.currentStepId || null,
    log: opts.log || [],
    meta: opts.meta || {},
    createdAt: now,
    updatedAt: now,
  };
  await fs.writeFile(fileFor(id), JSON.stringify(run, null, 2), 'utf8');
  return run;
}

export async function getRun(id) {
  try {
    const txt = await fs.readFile(fileFor(id), 'utf8');
    return JSON.parse(txt);
  } catch (e) {
    // file missing or invalid
    return null;
  }
}

export async function updateRun(id, updates) {
  const r = (await getRun(id)) || {};
  const now = Date.now();
  const merged = Object.assign({}, r, updates, { updatedAt: now });
  await ensureDir();
  await fs.writeFile(fileFor(id), JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

export async function listRunsForWorkflow(workflowId) {
  await ensureDir();
  const files = await fs.readdir(DATA_DIR).catch(() => []);
  const out = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    try {
      const j = JSON.parse(await fs.readFile(path.join(DATA_DIR, f), 'utf8'));
      if (!workflowId || j.workflowId === workflowId) out.push(j);
    } catch (e) {
      console.debug('skipping invalid run file', f, e && e.message);
    }
  }
  return out;
}

export default {
  createRun,
  getRun,
  updateRun,
  listRunsForWorkflow,
};
