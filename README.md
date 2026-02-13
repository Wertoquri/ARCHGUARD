# ARCHGUARD — Architectural Policy & Risk Engine

[![Archguard CI](https://github.com/Wertoquri/ARCHGUARD/actions/workflows/archguard.yml/badge.svg)](https://github.com/Wertoquri/ARCHGUARD/actions/workflows/archguard.yml)

ARCHGUARD is an architectural firewall for software systems. It analyzes source code dependencies, validates them against explicit architectural policies, and produces deterministic, CI-ready findings. AI explainability is optional and only consumes structured findings, never raw source code.

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

See [.github/workflows/archguard.yml](.github/workflows/archguard.yml)

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
