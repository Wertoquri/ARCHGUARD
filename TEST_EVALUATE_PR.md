# Evaluate PR Validation Template (Expected vs Actual)

Use this template after each test PR run of `CI / Evaluate PR`.

## Run metadata

- PR: (fill from test PR)
- Branch: `test/evaluate-pr-trigger` (update if different)
- Workflow run URL: https://github.com/Wertoquri/ARCHGUARD/actions/runs/22015374974
- Artifact URL (`pr-findings`): https://github.com/Wertoquri/ARCHGUARD/actions/runs/22015374974/artifacts/5510343926

## 1) Job status

- Expected: `Evaluate PR` job is successful.
- Actual: (check run status in GitHub Actions)
- Result: ⬜

## 2) Artifact contents

- Expected files in `pr-findings`:
	- `tmp/findings_pr.json`
	- `tmp/findings_pr_summary.json`
	- `tmp/findings_pr_ownership_summary.json`
	- `tmp/sbom_risk_pr.json`
- Actual: (download artifact and confirm file list)
- Result: ⬜

## 3) PR comment content

- Expected:
	- ARCHGUARD summary line with total violations
	- Top architecture violations section
	- Top SBOM-correlated dependency risk section
	- Artifact download hint
- Actual: (check latest bot comment on PR)
- Result: ⬜

## 4) Inline annotations

- Expected:
	- Step `Emit inline annotations for changed files` executes
	- Log contains emitted count (`Emitted N PR inline annotations.`)
	- If matched violations exist, annotations appear in PR Files view
- Actual: (check workflow logs + PR Files view)
- Result: ⬜

## 5) SBOM correlation sanity

- Expected:
	- `tmp/sbom_risk_pr.json` exists and is valid JSON
	- Contains `entries` array (can be empty)
	- If non-empty, sorted by descending `riskScore`
- Actual: (open artifact file and verify schema/order)
- Result: ⬜

## 6) Notes / regressions

- Unexpected behavior:
- Suspected root cause:
- Follow-up action:

## 7) Final verdict

- Overall: ⬜ PASS / ⬜ FAIL
- Blocking issues count: 0
- Non-blocking issues count: 0
- Decision summary (1-3 lines):
	- 
	- 

### Quick sign-off

- Verified by:
- Verified at (UTC):
- Re-run needed: ⬜ Yes / ⬜ No
