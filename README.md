# ARCHGUARD — Architectural Policy & Risk Engine

[![Archguard CI](https://github.com/Wertoquri/ARCHGUARD/actions/workflows/archguard.yml/badge.svg)](https://github.com/Wertoquri/ARCHGUARD/actions/workflows/archguard.yml)
[![CI (lint & migration tests)](https://github.com/Wertoquri/ARCHGUARD/actions/workflows/ci.yml/badge.svg)](https://github.com/Wertoquri/ARCHGUARD/actions/workflows/ci.yml)

Repository note: The repository default branch is `main`. Update local clones with `git fetch origin && git checkout main`.

Verification: pushed a small commit on 2026-02-18 to confirm `main` is active and writable.

ARCHGUARD is an architectural firewall for software systems. It analyzes source code dependencies, validates them against explicit architectural policies, and produces deterministic, CI-ready findings. AI explainability is optional and only consumes structured findings, never raw source code.

## Why this project exists

ARCHGUARD helps engineering teams prevent architecture drift before it reaches production.

- Detects forbidden dependencies, layering violations, cycles, and risky fan-in/fan-out growth.
- Provides deterministic findings that can gate CI/CD and support code review decisions.
- Connects findings to actionable remediation plans (owner, due date, status, history).
- Prioritizes dependency risk using SBOM + real usage correlation.

In short: it turns architecture governance from a document into an enforceable, auditable workflow.

## Competition demo quick start

### 1) Preflight


```bash
node -v
npm -v
```

### 2) Install and build

```bash
npm install
npm run figma-ui:install
npm run figma-ui:build
```

### 3) Start UI server

```bash
node scripts/serve_policy_ui.js
```

Default URL:


### 4) Smoke check

```bash
# from a second terminal
curl http://localhost:5174/api/ui/capabilities
curl http://localhost:5174/api/ui/bootstrap
```

Expected: JSON with `ok: true`.

### 5) Demo script (3-5 minutes)

1. Open `Findings` and select a violation.
2. Fill remediation plan (`assignee`, `due date`, `status`) and save.
3. Click `Create Jira/GitHub Issue` (prefilled summary).
4. Click `Open Policy` from Findings and verify focused rule in `Rule Editor`.
5. Switch language with `EN / UKR` button in top bar.

### 6) Troubleshooting


```bash
# PowerShell
$env:PORT=5175; node scripts/serve_policy_ui.js
```


```bash
npm run figma-ui:build
```

## Quickstart (Development)

1. Install dependencies:

```bash
npm install
```

2. Set MySQL env vars and create database (example):

```powershell
$env:MYSQL_HOST='127.0.0.1'
$env:MYSQL_PORT='3306'
$env:MYSQL_USER='root'
$env:MYSQL_PASSWORD='root'
$env:MYSQL_DATABASE='ARCHGUARD'
```

3. Run migrations:

```bash
node scripts/db_migrate.js
```

4. Seed example workflows:

```bash
node scripts/seed_workflows.js
```

5. Start policy UI / API server (development):

```bash
node scripts/serve_policy_ui.js
# or
npm run policy-ui
```

6. Run example workflow (uses `BASE_URL` env var):

```powershell
$env:BASE_URL='http://localhost:5175'
node scripts/run_workflow.js
```

## Packaging / Release

See `PRE_SUBMISSION_CHECKLIST.md` for steps to create a release bundle.

## UI language localization

- Default language is English.
- Use the `EN / UKR` button in the top navigation bar to switch interface language.
- Selected language is persisted in localStorage key `archguard.language`.

## High-level architecture

```
+----------------+     +-------------------+     +--------------------+
| Source Parser  | --> | Dependency Graph  | --> | Metrics Engine     |
+----------------+     +-------------------+     +--------------------+
        |                        |                         |
        v                        v                         v
+----------------+     +-------------------+     +--------------------+
| Policy Engine  | <-- | Rule Evaluations  | --> | Reporting Layer    |
+----------------+     +-------------------+     +--------------------+
        |
        v
+----------------+
| AI Explainability (optional, findings-only) |
+----------------+
```

## Module breakdown

- Parser: builds AST and extracts module imports/exports.
- Graph engine: represents dependencies, computes fan-in/fan-out, SCCs.
- Metrics engine: instability, change risk, and core module detection.
- Policy engine: parses YAML rules and evaluates violations.
- Reporting layer: writes deterministic findings.json.
- AI layer: reads findings.json only and generates summaries.

## Project structure

```
.github/
  workflows/archguard.yml
examples/
  findings.json
  policy.yaml
src/
  ai/explain.js
  cli.js
  graph/analysis.js
  graph/graph.js
  index.js
  metrics/metrics.js
  parser/astParser.js
  policy/policyEngine.js
  report/report.js
  utils/fs.js
package.json
```

## Core engine pseudocode

```text
files = scan(projectRoot)
parsed = parseAst(files)
graph = buildGraph(parsed)
cycles = findScc(graph)
metrics = computeMetrics(graph, cycles)
policy = loadPolicy(policyPath)
violations = evaluate(policy, graph, metrics, cycles)
report = renderFindings(metrics, violations)
write(report)
exit(violations >= threshold)
```

## Policy engine logic (implementation outline)

```text
for each rule in policy.rules
  if rule.type == forbidden_dependency
    for each edge in graph
      if edge.from matches rule.from AND edge.to matches rule.to
        emit violation

  if rule.type == max_fan_in
    for each module in metrics
      if module.fanIn > rule.threshold
        emit violation

  if rule.type == max_fan_out
    for each module in metrics
      if module.fanOut > rule.threshold
        emit violation

  if rule.type == no_cycles
    for each module in cycleSet
      emit violation

  if rule.type == layer_matrix
    for each edge in graph
      fromLayer = resolve(edge.from)
      toLayer = resolve(edge.to)
      if not allowed(fromLayer, toLayer)
        emit violation
```

## Supported rule types

- forbidden_dependency
- max_fan_in
- max_fan_out
- no_cycles
- layer_matrix (layered dependency allowlist)

## Example policy file

See [examples/policy.yaml](examples/policy.yaml)

The example policy now includes additional sample rules (R-006..R-009) demonstrating:
- extra forbidden_dependencies
- per-layer `max_fan_in` and `max_fan_out` thresholds
- a stricter `layer_matrix` example with `allowSameLayer: false`

## Example findings.json

See [examples/findings.json](examples/findings.json)

## CLI usage

You can use convenient npm scripts instead of typing the full CLI command:

```bash
# run the default analysis (uses examples/policy.yaml -> findings.json)
npm run analyze

# run analysis and produce AI summary
npm run analyze:ai

# short alias that lets you pass CLI arguments
npm run analyze:cli -- --project "D:\\WEB\\taskflow" --out findings_taskflow.json

# super short alias
npm run ag -- --policy examples/policy.yaml --out findings_debug.json
```

## GitHub Actions example

See the workflow definitions in `.github/workflows/`.

- `archguard.yml` — full analysis runs for releases and scheduled jobs.
- `ci.yml` — runs on pushes and pull requests; it includes a `lint` job and a `migration-tests` job that runs the dry-run/rollback Vitest test added to `test/dryrun_rollback.test.js`.

You can view CI run details here: [.github/workflows/ci.yml](.github/workflows/ci.yml)

### CI fail gate + baseline allowlist

- CI now enforces failure on `high` and `critical` violations **after** applying baseline allowlist entries.
- Baseline file location: `config/archguard-baseline.json`
- Baseline entries may include:
  - `reason` (why the exemption exists)
  - `owner` (team responsible)
  - `expiresAt` (ISO datetime for automatic expiry enforcement)
- Baseline format:

```json
{
  "ignoredViolations": [
    {
      "ruleId": "R-001",
      "type": "forbidden_dependency",
      "from": "src/legacy/a.js",
      "to": "src/legacy/b.js",
      "messageContains": "temporary exemption"
    }
  ]
}
```

- Filtering utility:

```bash
node scripts/apply_baseline.js \
  --in findings_raw.json \
  --out findings.json \
  --baseline config/archguard-baseline.json \
  --summary findings_summary.json \
  --fail-on high
```

- Expiry behavior:
  - Expired exemptions are ignored for filtering.
  - Invalid `expiresAt` format fails the run.
  - By default, expired exemptions fail the run (`--fail-on-expired true`).

### Auto-baseline assistant

Generate suggested baseline entries from current findings:

```bash
npm run baseline:suggest -- \
  --in findings.json \
  --out tmp/baseline_suggestions.json \
  --min-severity high \
  --max 20 \
  --expiry-days 30
```

Merge suggestions directly into existing baseline:

```bash
npm run baseline:suggest -- \
  --in findings.json \
  --merge config/archguard-baseline.json \
  --out tmp/merged_baseline_preview.json
```

### Nightly ARCHGUARD scans

- `.github/workflows/ci.yml` includes a nightly scheduled scan job (`nightly-archguard`) and `workflow_dispatch` trigger.
- The job uploads `nightly-archguard-findings` artifact with filtered findings and severity summary.

### Optional Slack/Teams webhook alert

- If repo secret `ARCHGUARD_WEBHOOK_URL` is set, CI sends a webhook message when high/critical findings remain after baseline filtering.

## PR inline annotations

`evaluate-pr` now emits GitHub workflow inline annotations for violations that map to changed PR files.

Manual usage:

```bash
npm run pr:annotate -- \
  --findings tmp/findings_pr.json \
  --changed tmp/changed_files.json \
  --max 40
```

## SBOM risk correlation

ARCHGUARD now correlates dependency vulnerability data with real import usage to prioritize actionable package risk.

Build dependency usage map:

```bash
npm run dependency:usage -- --out tmp/dependency_usage.json
```

Correlate vulnerabilities with usage (supports npm audit JSON and CycloneDX-style SBOM input):

```bash
npm run sbom:correlate -- \
  --sbom tmp/npm_audit.json \
  --usage tmp/dependency_usage.json \
  --out tmp/sbom_risk.json
```

CI artifacts now include correlated risk outputs:
- `pr-findings` includes `tmp/sbom_risk_pr.json`
- `archguard-findings-summary` includes `tmp/sbom_risk.json`
- `nightly-archguard-findings` includes `tmp/sbom_risk_nightly.json`

### Real PR-run verification checklist

1. Open a test PR with at least one changed source file.
2. Wait for `CI / Evaluate PR` to finish in GitHub Actions.
3. Confirm `pr-findings` artifact contains:
  - `tmp/findings_pr.json`
  - `tmp/findings_pr_summary.json`
  - `tmp/findings_pr_ownership_summary.json`
  - `tmp/sbom_risk_pr.json`
4. Open the PR conversation and verify ARCHGUARD comment includes:
  - top architecture violations
  - top SBOM-correlated dependency risk items
5. Open the workflow run log and verify `Emit inline annotations for changed files` reports emitted count.
6. In the PR Files view, confirm annotations appear on changed files when matched violations exist.

## Findings Dashboard UI

- Dashboard path: `http://localhost:5174/findings-ui/`

## Coverage reports

- CI now uploads a coverage artifact named `coverage-report` for jobs that run tests. You can download the artifact from the workflow run page (Actions → select run → Artifacts → `coverage-report`) or with the `gh` CLI:

```
gh run download <run-number> --repo Wertoquri/ARCHGUARD --name coverage-report --dir tmp/coverage-artifact
```

- To generate coverage locally, run:

```
npm run coverage
```

The local `coverage/` directory contains `lcov.info` and an `lcov-report/` HTML view.
- Start server:

```bash
npm run findings-ui
```

- Supported API endpoints:
  - `GET /api/findings?file=<path>`
  - `GET /api/findings/summary?file=<path>`

Examples:
- `findings.json`
- `tmp_artifacts/findings.filtered.json`

The dashboard shows:
- Global metrics
- Risk summary
- Violations by severity
- Top risk modules
- Full violations table

## Integrated Figma UI

Premium Figma-based UI is integrated under `FigmaUI` and served from:

- `http://localhost:5174/figma-ui/` (when built and served via `scripts/serve_policy_ui.js`)

Setup and build:

```bash
npm run figma-ui:install
npm run figma-ui:build
```

Run backend/static host (policy/findings/figma UI):

```bash
npm run policy-ui
```

Optional frontend-only dev mode:

```bash
npm run figma-ui:dev
```

Notes:
- Figma UI consumes live ARCHGUARD endpoints (`/api/ui/bootstrap`, `/api/findings`, `/api/pr/summary`, `/api/sbom/risk`, `/api/policy`, `/api/policy/packs`, `/api/trends`).
- In dev mode, Vite proxies `/api/*` to `http://localhost:5174`.
- Interactive UI actions are wired via backend endpoint `POST /api/actions/run-analysis` and frontend action dispatcher (run analysis, export findings, open CI, open policy/dependency views, settings interactions, sharing helpers).

### Figma UI troubleshooting (MIME / 404 assets)

If you see errors like:
- `Refused to apply style ... MIME type ('text/html') ...`
- `assets/*.js 404 Not Found`
- `favicon.ico 404 Not Found`

Cause:
- Figma UI was built with root asset paths (`/assets/...`) while being served under `/figma-ui/`.

Fix:
1. Ensure `FigmaUI/vite.config.ts` has `base: '/figma-ui/'`
2. Rebuild: `npm run figma-ui:build`
3. Restart server: `npm run policy-ui`

Notes:
- `lockdown-install.js ... SES Removing unpermitted intrinsics` is typically from browser extension/runtime hardening and not an ARCHGUARD app failure.
- `content.js [ScreenshotHelper] undefined received` is extension noise, not backend/frontend API error.
- Root `favicon.ico` requests are handled by server (`204` when icon is absent), so this warning should disappear after restart.

### Backend actions (production flows)

Available UI action endpoints:
- `POST /api/actions/run-analysis`
- `POST /api/actions/assign-finding`
- `POST /api/actions/ignore-finding`
- `POST /api/actions/save-rule`
- `POST /api/actions/mark-removal`

Environment guards:
- `POLICY_UI_ENABLE_SAVE=1` required for `save-rule`.
- `POLICY_UI_ENABLE_GITHUB=1` enables `mark-removal` to dispatch `auto-migration-pr.yml` via `gh workflow run`.

`save-rule` behavior:
- In non-production server mode, save is enabled by default.
- In production mode, set `POLICY_UI_ENABLE_SAVE=1` to avoid `403 Forbidden`.

### GitHub profile in UI header

Figma UI header can show a real GitHub profile avatar/name via:

- `GET /api/profile/github`

Configuration options:
- `GITHUB_PROFILE_USERNAME` — GitHub login to display in the profile widget.
- `GITHUB_TOKEN` (optional) — token for authenticated GitHub API requests.

Examples (PowerShell):

```powershell
$env:GITHUB_PROFILE_USERNAME="Wertoquri"
$env:GITHUB_TOKEN="<token_optional>"
npm run policy-ui
```

Notes:
- If username is not configured, UI falls back to the default local profile avatar/name.
- You can also test directly: `/api/profile/github?username=<github-login>`.

## Auto-create Migration PRs

- Workflow: `.github/workflows/auto-migration-pr.yml`
- Triggers:
  - nightly schedule
  - manual `workflow_dispatch`
- Flow:
  1. Runs ARCHGUARD analysis
  2. Applies baseline filter
  3. Generates migration bundle via `--dry-run --patch-out migration_bundle_auto`
  4. If violations remain and bundle has files, opens auto-generated PR using `peter-evans/create-pull-request`

## Policy packs

Ready-to-use policy packs are available in `policy-packs/`:

- `strict.yaml`
- `legacy-safe.yaml`
- `frontend-heavy.yaml`

Run directly:

```bash
npm run policy:pack:strict
npm run policy:pack:legacy-safe
npm run policy:pack:frontend-heavy
```

## Policy simulation mode

Compare multiple policy scenarios against the base policy and get a delta report.

```bash
npm run policy:simulate -- \
  --project . \
  --base examples/policy.yaml \
  --scenarios strict,legacy-safe,frontend-heavy \
  --out tmp/policy_simulation.json \
  --fail-on high
```

Notes:
- Scenario names can be pack names (`strict`) or explicit YAML paths.
- Output contains base metrics, per-scenario violation deltas, and a recommendation with the lowest violation count.

## Trend analytics snapshots

Capture trend snapshot from current findings and append to history:

```bash
npm run trend:snapshot -- \
  --in findings.json \
  --out tmp/trend_snapshot.json \
  --history analytics/trends_history.json \
  --max 200
```

Snapshot fields include:
- branch / commit / runId
- global metrics and risk summary
- violation count by severity
- ownership summary
- top-risk modules

## Policy rule test framework

Fixture-driven policy tests are located in `test/policy-cases/*.json` and executed by:

```bash
npm run test:policy
```

To add a new rule test case:
1. Add a JSON fixture under `test/policy-cases/`
2. Define `policy`, `edges`, `moduleMetrics`, `inCycle`, and `expected`
3. Run `npm run test:policy`

## Ownership mapping support

- Ownership config: `config/ownership-map.json`
- Apply ownership tags to findings:

```bash
npm run ownership:apply -- \
  --in findings.json \
  --out findings.json \
  --owners config/ownership-map.json \
  --summary tmp/ownership_summary.json
```

- Enriched fields:
  - `moduleMetrics[].owner`
  - `violations[].owner`
  - `ownership.violationOwnerSummary`

## CLI DX commands

Initialize repo defaults:

```bash
npm run init -- --init strict
```

Environment diagnostics:

```bash
npm run doctor
```

Explain a policy rule:

```bash
npm run explain -- R-001
```

### Dependency and Action security updates

- Dependabot config added in `.github/dependabot.yml` for:
  - npm dependencies
  - GitHub Actions dependencies

## Local development & debugging

Follow these steps to run ARCHGUARD locally, run tests, and reproduce CI results.

- Install dependencies:

```bash
npm ci
```

- Run the default analysis (uses `examples/policy.yaml` and writes `findings.json`):

```bash
npm run analyze
```

- Run analysis and produce an AI summary:

```bash
npm run analyze:ai
```

- Run the CLI with custom arguments (example for the `taskflow` project):

```bash
npm run analyze:cli -- --project "D:\\WEB\\taskflow" --out findings_taskflow.json
```

- Run unit tests (uses `vitest`):

```bash
npm test
```

- View CI results locally by running `npm run analyze` and inspecting the generated `findings.json`.
  The GitHub Action uploads `findings.json` as an artifact named `archguard-findings`.

## Contributing quick tips

- To add a new rule type, implement evaluation in `src/policy/policyEngine.js` and add unit tests covering edge cases.
- Keep `findings.json` deterministic: sort arrays and normalize paths in any new code that affects output.
- For migration patches, add `.patch` files under `docs/pr_diffs/` and reference them in PR descriptions.

## Releasing dep-graph artifacts

The CI generates `docs/dep_graph.json` and `docs/dep_graph.png` for analysis runs. To publish these as a draft release (so the artifacts are attached to a release), create and push a git tag — the CI will create a draft release named after the tag and upload the ZIP asset.

Example (create a tag and push):

```bash
# create an annotated tag for the current HEAD
git tag -a dep-graph-$(date +%Y%m%d-%H%M) -m "Dep graph artifacts"
git push origin --tags
```

Windows PowerShell example:

```powershell
# create an annotated tag for the current HEAD (PowerShell)
$tag = "dep-graph-$(Get-Date -Format 'yyyyMMdd-HHmm')"
git tag -a $tag -m "Dep graph artifacts"
git push origin --tags
```

After the push, check the repository Releases page; the workflow creates a draft release containing `dep_graph_artifacts_<tag>.zip`. Inspect the release, then publish it manually when ready.

Notes:
- CI will not create releases for PRs or branch runs — only on pushed tags.
- Releases are created as drafts so you can verify contents before publishing.

## Project status

This project is currently in active development and is not yet competition-ready. Key gaps include:

- Documentation and contributor guides need expansion (README and CONTRIBUTING).
- Additional end-to-end and rollback tests are required for migration safety.
- Linting, formatting, and pre-commit hooks are not yet enforced across the repo.
- Performance and large-repo scaling of the parser/renderer need validation.

If you plan to present this project in a competition or public evaluation, consider the following short-term tasks:

- Finish `README.md` and add `CONTRIBUTING.md` with run/test instructions.
- Add dry-run and rollback unit/integration tests for migration patches.
- Add ESLint/Prettier and Husky pre-commit hooks to enforce style and catch regressions.
- Run analysis on a larger sample repository to validate performance and tweak Puppeteer settings for headless rendering.

These improvements will make the project stronger for review and demonstration.

## Architectural decisions

- TypeScript compiler API ensures deterministic AST parsing for TS/JS.
- Graph metrics are computed from normalized module IDs for reproducible output.
- Policy rules are explicit YAML to keep compliance checks auditable.
- AI explainability is isolated and only reads findings.json data.

## Risk metrics

- Instability index: $instability = \frac{fan\_out}{fan\_in + fan\_out}$
- Change risk score: weighted by fan-in, LOC, and cycle participation.
- Core modules: high fan-in and low instability.

## Determinism guarantees

- Files are read via fixed globs and normalized paths.
- Metrics and violations are sorted before output.
- Output is stable across runs given identical sources and policy.

## Extending rules

Add new rule types in [src/policy/policyEngine.js](src/policy/policyEngine.js) and implement evaluation in the same module.

## AI explainability (optional)

Generate a findings-only summary:

```bash
node src/cli.js --policy examples/policy.yaml --out findings.json --ai-summary ai-summary.txt
```

The AI layer must never read raw source files and should consume only structured data from findings.json.

## Штучний інтелект у проєкті

- Де: основна логіка для генерації текстових пояснень знаходиться в `src/ai/explain.js`.
- Як працює: після запуску аналізу `ARCHGUARD` генерує детерміністичний `findings.json` з усіма метриками та порушеннями. Модуль AI читає тільки цей файл (структуровані дані) і створює людський текстовий звіт — **ні в якому разі** ШІ не читає або не відправляє сирі файли коду.
- Як запустити: команда `npm run analyze:ai` або `node src/cli.js --policy examples/policy.yaml --out findings.json --ai-summary ai_summary.txt` створить `ai_summary.txt`.
- Політика конфіденційності: AI‑підсумок споживає лише `findings.json` (модуль `src/ai/explain.js`), тому початковий код і секрети не передаються зовнішнім сервісам за замовчуванням. Якщо ви підключаєте зовнішній LLM, переконайтеся, що це зроблено в ізольованому і документованому конфігураційному шарі і що доступ є опціональним.
