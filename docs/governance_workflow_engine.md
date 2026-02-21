# Governance Workflow Engine — Design

Цей документ описує модель даних і базові API для Governance Workflow Engine — сервісного шару, що дозволяє визначати, запускати та відстежувати автоматизовані робочі процеси (workflow) для політик і ремедіації.

## Основні сутності

- Workflow
  - id: string (uuid)
  - name: string
  - description: string
  - version: string (semver)
  - triggers: array of Trigger
  - steps: ordered array of Step
  - createdAt, updatedAt

- Trigger
  - type: enum ("onSchedule", "onScanResult", "manual", "onPR")
  - config: object (залежить від type — cron, severity threshold, repo/PR filter)

- Step
  - id: string
  - name: string
  - type: enum ("action","decision","approval","wait")
  - action: Action (for type==action)
  - next: array of step ids or conditional mapping

- Action
  - kind: enum ("createIssue","assignTask","runRemediation","notify","runScript")
  - parameters: object

- Execution / Run
  - id: string
  - workflowId: string
  - status: enum ("pending","running","succeeded","failed","cancelled")
  - startedAt, finishedAt
  - currentStepId
  - log: array of { ts, level, message, meta }

- RemediationTask (optional)
  - id, title, description, assignedTo, status, relatedFindings

## Example Workflow (JSON)

```json
{
  "id": "uuid-1",
  "name": "Auto-fix high severity findings",
  "version": "0.1.0",
  "triggers": [
    { "type": "onScanResult", "config": { "minSeverity": "high" } }
  ],
  "steps": [
    { "id": "s1", "name": "Create remediation task", "type": "action", "action": { "kind": "createIssue", "parameters": { "project": "ops" } }, "next": ["s2"] },
    { "id": "s2", "name": "Notify owners", "type": "action", "action": { "kind": "notify", "parameters": { "channel": "#sec-team" } }, "next": [] }
  ]
}
```

## API (proposal)

- GET /api/workflows — list workflows (supports filter by name/version)
- GET /api/workflows/:id — get workflow
- POST /api/workflows — create workflow (validates schema)
- PUT /api/workflows/:id — update workflow (creates new version)
- POST /api/workflows/:id/run — start execution (returns run id)
- GET /api/workflows/:id/runs — list runs
- GET /api/runs/:runId — get run details and logs

## Persistence

- Phase 1: file-backed storage under `data/workflows/` (JSON files) using existing `src/utils/fs.js` helper.
- Phase 2: migrate to lightweight DB (SQLite/Postgres) with migrations.

## Runner

- Simple in-process runner to execute steps sequentially and record logs.
- Steps of type `runScript` should be sandboxed (limit to allowed scripts) or executed via worker process.

## Security & Multi-tenant considerations

- RBAC checks on APIs (who can create/run workflows)
- Validate actions to prevent arbitrary command execution

## Next steps

1. Implement JSON schema validator and model API stubs.
2. Add file-backed persistence and CLI tooling for importing/exporting workflows.
3. Implement in-memory runner and a long-running worker for scheduled triggers.

---

Автор: команда ARCHGUARD — попередній дизайн для початку реалізації.
