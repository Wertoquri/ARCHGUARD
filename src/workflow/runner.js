import { workflows, runs } from '../models/index.js';

function now() {
  return Date.now();
}

async function appendLog(runId, entry) {
  const run = await runs.getRun(runId);
  if (!run) return;
  const log = run.log || [];
  log.push(Object.assign({ ts: now() }, entry));
  await runs.updateRun(runId, { log });
}

export async function runWorkflowById(workflowId, runId) {
  const wf = await workflows.getWorkflow(workflowId);
  if (!wf) {
    await runs.updateRun(runId, { status: 'failed', finishedAt: now() });
    return;
  }

  await runs.updateRun(runId, { status: 'running', startedAt: now(), currentStepId: null });

  const steps = Array.isArray(wf.steps) ? wf.steps : [];

  for (const step of steps) {
    try {
      await runs.updateRun(runId, { currentStepId: step.id });
      await appendLog(runId, {
        level: 'info',
        message: `Starting step ${step.id}: ${step.name || ''}`,
      });

      if (step.type === 'action' && step.action && step.action.kind) {
        const kind = step.action.kind;
        const params = step.action.parameters || {};
        switch (kind) {
          case 'createIssue': {
            const issueId = `issue-${Math.random().toString(36).slice(2, 8)}`;
            await appendLog(runId, {
              level: 'info',
              message: `Created issue ${issueId}`,
              meta: { params },
            });
            const run = await runs.getRun(runId);
            const meta = Object.assign({}, run.meta || {});
            meta.createdIssues = meta.createdIssues || [];
            meta.createdIssues.push({ id: issueId, params });
            await runs.updateRun(runId, { meta });
            break;
          }
          case 'notify': {
            await appendLog(runId, { level: 'info', message: `Notify: ${JSON.stringify(params)}` });
            break;
          }
          case 'assignTask': {
            await appendLog(runId, {
              level: 'info',
              message: `Assign task: ${JSON.stringify(params)}`,
            });
            break;
          }
          case 'runRemediation': {
            await appendLog(runId, {
              level: 'info',
              message: `Run remediation: ${JSON.stringify(params)}`,
            });
            break;
          }
          case 'runScript': {
            await appendLog(runId, {
              level: 'error',
              message: 'runScript is not allowed in this environment',
            });
            await runs.updateRun(runId, { status: 'failed', finishedAt: now() });
            return;
          }
          default: {
            await appendLog(runId, { level: 'warn', message: `Unknown action kind: ${kind}` });
          }
        }
      } else if (step.type === 'wait') {
        const secs = step.durationSeconds || 1;
        await appendLog(runId, { level: 'info', message: `Waiting ${secs}s` });
        await new Promise((r) => setTimeout(r, Math.min(secs, 5) * 1000));
      } else {
        await appendLog(runId, { level: 'info', message: `Skipping step ${step.id}` });
      }

      await appendLog(runId, { level: 'info', message: `Completed step ${step.id}` });
    } catch (e) {
      await appendLog(runId, { level: 'error', message: `Step ${step.id} failed: ${e.message}` });
      await runs.updateRun(runId, { status: 'failed', finishedAt: now() });
      return;
    }
  }

  await runs.updateRun(runId, { status: 'succeeded', finishedAt: now(), currentStepId: null });
  await appendLog(runId, { level: 'info', message: 'Workflow run completed' });
}

export default { runWorkflowById };
