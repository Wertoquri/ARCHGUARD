import knex from '../db/knex.js';
import { randomUUID } from 'crypto';

function safeParseJson(value, fallback = []) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (e) {
      return fallback;
    }
  }
  // already a parsed object/array
  return value;
}

export async function listWorkflows() {
  const rows = await knex('workflows').select('*');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    version: r.version,
    description: r.description,
    triggers: safeParseJson(r.triggers, []),
    steps: safeParseJson(r.steps, []),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

export async function createWorkflow(payload) {
  const id = payload.id || randomUUID();
  const now = Date.now();
  const wf = {
    id,
    version: payload.version || '0.1.0',
    name: payload.name || `workflow-${id.slice(0, 6)}`,
    description: payload.description || '',
    triggers: JSON.stringify(payload.triggers || []),
    steps: JSON.stringify(payload.steps || []),
    createdAt: now,
    updatedAt: now,
  };
  await knex('workflows').insert(wf);
  return {
    ...wf,
    triggers: safeParseJson(wf.triggers, []),
    steps: safeParseJson(wf.steps, []),
  };
}

export async function getWorkflow(id) {
  const row = await knex('workflows').where({ id }).first();
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    version: row.version,
    description: row.description,
    triggers: safeParseJson(row.triggers, []),
    steps: safeParseJson(row.steps, []),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function updateWorkflow(id, updates) {
  const now = Date.now();
  const toUpdate = { ...updates, updatedAt: now };
  if (toUpdate.triggers) toUpdate.triggers = JSON.stringify(toUpdate.triggers);
  if (toUpdate.steps) toUpdate.steps = JSON.stringify(toUpdate.steps);
  await knex('workflows').where({ id }).update(toUpdate);
  return getWorkflow(id);
}

export default {
  listWorkflows,
  createWorkflow,
  getWorkflow,
  updateWorkflow,
};
