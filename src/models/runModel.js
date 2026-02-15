import knex from '../db/knex.js';
import { randomUUID } from 'crypto';

export async function createRun(workflowId, opts = {}) {
  const id = opts.id || randomUUID();
  const now = Date.now();
  const run = {
    id,
    workflow_id: workflowId,
    status: opts.status || 'pending',
    startedAt: opts.startedAt || null,
    finishedAt: opts.finishedAt || null,
    currentStepId: opts.currentStepId || null,
    log: JSON.stringify(opts.log || []),
    meta: JSON.stringify(opts.meta || {}),
    createdAt: now,
    updatedAt: now,
  };
  await knex('workflow_runs').insert(run);
  return {
    id: run.id,
    workflowId: workflowId,
    status: run.status,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    currentStepId: run.currentStepId,
    log: JSON.parse(run.log),
    meta: JSON.parse(run.meta),
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
  };
}

export async function getRun(id) {
  const row = await knex('workflow_runs').where({ id }).first();
  if (!row) return null;
  return {
    id: row.id,
    workflowId: row.workflow_id,
    status: row.status,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    currentStepId: row.currentStepId,
    log: row.log ? JSON.parse(row.log) : [],
    meta: row.meta ? JSON.parse(row.meta) : {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function updateRun(id, updates) {
  const now = Date.now();
  const toUpdate = { ...updates, updatedAt: now };
  if (toUpdate.log) toUpdate.log = JSON.stringify(toUpdate.log);
  if (toUpdate.meta) toUpdate.meta = JSON.stringify(toUpdate.meta);
  await knex('workflow_runs').where({ id }).update(toUpdate);
  return getRun(id);
}

export async function listRunsForWorkflow(workflowId) {
  const rows = await knex('workflow_runs').where({ workflow_id: workflowId }).select('*');
  return rows.map((r) => ({
    id: r.id,
    workflowId: r.workflow_id,
    status: r.status,
    startedAt: r.startedAt,
    finishedAt: r.finishedAt,
    currentStepId: r.currentStepId,
    log: r.log ? JSON.parse(r.log) : [],
    meta: r.meta ? JSON.parse(r.meta) : {},
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

export default {
  createRun,
  getRun,
  updateRun,
  listRunsForWorkflow,
};
