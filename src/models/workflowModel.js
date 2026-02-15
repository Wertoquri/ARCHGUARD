import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const DATA_DIR = path.resolve(process.cwd(), 'data', 'workflows');

async function ensureDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (e) {
    console.debug('ensureDir failed for workflows:', e && e.message);
  }
}

function fileFor(id) {
  return path.join(DATA_DIR, `${id}.json`);
}

export async function listWorkflows() {
  await ensureDir();
  const files = await fs.readdir(DATA_DIR).catch(() => []);
  const data = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    try {
      const j = JSON.parse(await fs.readFile(path.join(DATA_DIR, f), 'utf8'));
      data.push(j);
    } catch (e) {
      console.debug('skipping invalid workflow file', f, e && e.message);
    }
  }
  return data;
}

export async function createWorkflow(payload) {
  await ensureDir();
  const id = payload.id || randomUUID();
  const now = Date.now();
  const wf = Object.assign(
    {
      id,
      version: payload.version || '0.1.0',
      name: payload.name || `workflow-${id.slice(0, 6)}`,
      description: payload.description || '',
      triggers: payload.triggers || [],
      steps: payload.steps || [],
      createdAt: now,
      updatedAt: now,
    },
    payload
  );
  await fs.writeFile(fileFor(id), JSON.stringify(wf, null, 2), 'utf8');
  return wf;
}

export async function getWorkflow(id) {
  try {
    const txt = await fs.readFile(fileFor(id), 'utf8');
    return JSON.parse(txt);
  } catch (e) {
    return null;
  }
}

export async function updateWorkflow(id, updates) {
  const wf = (await getWorkflow(id)) || {};
  const now = Date.now();
  const merged = Object.assign({}, wf, updates, { updatedAt: now });
  await ensureDir();
  await fs.writeFile(fileFor(id), JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

export default {
  listWorkflows,
  createWorkflow,
  getWorkflow,
  updateWorkflow,
};
