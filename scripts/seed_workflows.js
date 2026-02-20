#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as workflowModel from '../src/models/workflowModel.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const workflowsDir = path.join(process.cwd(), 'data', 'workflows');
  if (!fs.existsSync(workflowsDir)) {
    console.error('No workflows directory found at', workflowsDir);
    process.exit(1);
  }
  const files = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.json')).sort();
  for (const f of files) {
    const p = path.join(workflowsDir, f);
    const raw = fs.readFileSync(p, 'utf8');
    let data;
    try { data = JSON.parse(raw); } catch (e) { console.error('Invalid JSON', p, e.message); continue }
    const id = data.id || data.name;
    if (!id) { console.error('Workflow missing id/name in', p); continue }
    const existing = await workflowModel.getWorkflow(id);
    if (existing) {
      console.log('Updating workflow', id);
      await workflowModel.updateWorkflow(id, {
        name: data.name,
        version: data.version,
        description: data.description,
        triggers: data.triggers,
        steps: data.steps,
      });
    } else {
      console.log('Creating workflow', id);
      await workflowModel.createWorkflow({
        id,
        name: data.name,
        version: data.version,
        description: data.description,
        triggers: data.triggers,
        steps: data.steps,
      });
    }
  }
  console.log('Seeding complete');
  process.exit(0);
}

main().catch(err => { console.error(err && err.stack || err); process.exit(1); });
