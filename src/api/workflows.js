import express from 'express';
import { workflows, runs } from '../models/index.js';
import { runWorkflowById } from '../workflow/runner.js';

export default function registerWorkflowsApi(app) {
  app.get('/api/workflows', async (req, res) => {
    try {
      const data = await workflows.listWorkflows();
      return res.json({ ok: true, workflows: data });
    } catch (e) {
      return res.status(500).json({ ok: false, error: 'failed to list workflows' });
    }
  });

  app.get('/api/workflows/:id', async (req, res) => {
    try {
      const w = await workflows.getWorkflow(req.params.id);
      if (!w) return res.status(404).json({ ok: false, error: 'workflow not found' });
      return res.json({ ok: true, workflow: w });
    } catch (e) {
      return res.status(500).json({ ok: false, error: 'failed to read workflow' });
    }
  });

  app.post('/api/workflows', express.json(), async (req, res) => {
    try {
      const wf = await workflows.createWorkflow(req.body || {});
      return res.status(201).json({ ok: true, workflow: wf });
    } catch (e) {
      return res.status(500).json({ ok: false, error: 'failed to create workflow' });
    }
  });

  app.put('/api/workflows/:id', express.json(), async (req, res) => {
    try {
      const wf = await workflows.updateWorkflow(req.params.id, req.body || {});
      return res.json({ ok: true, workflow: wf });
    } catch (e) {
      return res.status(500).json({ ok: false, error: 'failed to update workflow' });
    }
  });

  app.post('/api/workflows/:id/run', express.json(), async (req, res) => {
    try {
      const wf = await workflows.getWorkflow(req.params.id);
      if (!wf) return res.status(404).json({ ok: false, error: 'workflow not found' });
      const run = await runs.createRun(req.params.id, { status: 'pending', meta: req.body || {} });
      // start runner asynchronously if available
      try {
        if (typeof runWorkflowById === 'function') {
          runWorkflowById(req.params.id, run.id).catch(async () => {
            await runs.updateRun(run.id, { status: 'failed', finishedAt: Date.now() });
          });
        }
      } catch (err) {
        console.error('Failed to invoke runner', err && err.stack ? err.stack : err);
      }
      return res.status(201).json({ ok: true, run });
    } catch (e) {
      return res.status(500).json({ ok: false, error: 'failed to start run' });
    }
  });

  app.get('/api/workflows/:id/runs', async (req, res) => {
    try {
      const list = await runs.listRunsForWorkflow(req.params.id);
      return res.json({ ok: true, runs: list });
    } catch (e) {
      return res.status(500).json({ ok: false, error: 'failed to list runs' });
    }
  });

  app.get('/api/runs/:runId', async (req, res) => {
    try {
      const run = await runs.getRun(req.params.runId);
      if (!run) return res.status(404).json({ ok: false, error: 'run not found' });
      return res.json({ ok: true, run });
    } catch (e) {
      return res.status(500).json({ ok: false, error: 'failed to read run' });
    }
  });
}
