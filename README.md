# ARCHGUARD

[![CI](https://github.com/Wertoquri/ARCHGUARD/actions/workflows/ci.yml/badge.svg)](https://github.com/Wertoquri/ARCHGUARD/actions/workflows/ci.yml)

ARCHGUARD is an architectural policy and risk engine for JavaScript and TypeScript repositories. It converts imports into a deterministic dependency graph, evaluates explicit YAML policies and produces CI-ready findings without sending source code to an LLM.

## Why teams use it

- Prevent forbidden dependencies and layer violations.
- Detect cycles, unstable modules and risky fan-in/fan-out growth.
- Gate pull requests with deterministic, auditable findings.
- Correlate dependency usage with SBOM vulnerability data.
- Assign owners, expiration dates and remediation status to accepted risk.

## Client demo

```bash
docker compose up --build
```

Open http://localhost:5175. The compose stack includes MySQL and the built dashboard.

### Five-minute walkthrough

1. Open **Findings** and explain severity, ownership and affected modules.
2. Open a finding's policy rule to show that governance is explicit YAML.
3. Save a remediation owner and due date.
4. Compare the `strict`, `legacy-safe` and `frontend-heavy` policy packs.
5. Show the same engine running as a GitHub Actions quality gate.

## CLI quick start

Requires Node.js 22+.

```bash
npm ci
npm run doctor
npm run analyze
npm test
```

Analyze another repository:

```bash
npm run ag -- --project ../your-project --policy policy-packs/strict.yaml --out findings.json
```

## Architecture

```text
Source scanner -> AST parser -> dependency graph -> metrics
                                              \-> policy engine -> findings.json
                                                               \-> dashboard / CI / optional AI explanation
```

The optional AI layer consumes only `findings.json`; raw source remains local.

## Policy example

```yaml
rules:
  - id: no-ui-to-db
    type: forbidden_dependency
    from: "src/ui/**"
    to: "src/db/**"
    severity: high
```

Supported rules include `forbidden_dependency`, `max_fan_in`, `max_fan_out`, `no_cycles` and `layer_matrix`. Ready-made policies live in `policy-packs/`.

## Quality and delivery

```bash
npm run lint
npm test
npm run figma-ui:install
npm run figma-ui:build
docker build -f Dockerfile.prod -t archguard .
```

CI uses Node.js 22 consistently, validates the UI and production image, runs the policy engine, and uploads findings as build artifacts.

## Production configuration

Copy `.env.example` and replace all credentials. Saving policy files and GitHub-triggering actions are disabled unless explicitly enabled with `POLICY_UI_ENABLE_SAVE=1` and `POLICY_UI_ENABLE_GITHUB=1`.

Detailed material:

- [Contributing](CONTRIBUTING.md)
- [Governance workflow](docs/governance_workflow_engine.md)
- [Release instructions](RELEASE_INSTRUCTIONS.md)
- [Example policy](examples/policy.yaml)

MIT licensed.
