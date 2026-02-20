Pre-submission checklist for ARCHGUARD

- [ ] Confirm all tests pass (`npm test`).
- [ ] Run linter/format (`npm run lint`, `npm run format`).
- [ ] Verify migrations are committed and up-to-date (`migrations/`).
- [ ] Ensure no sensitive credentials in repo.
- [ ] Clean temporary files and add relevant `.gitignore` entries.
- [ ] Create release bundle (zip) containing: `package.json`, `migrations/`, `src/`, `scripts/`, `README.md`, `docs/`.
- [ ] Update `README.md` with quickstart + env vars + migration + example run instructions.
- [ ] Verify CI workflow runs (GitHub Actions) pass on branch.
- [ ] Tag release and push bundle.
- [ ] Provide demo script and basic coverage report.

Notes:
- DB: set env vars `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` before running migrations.
- Example: `node scripts/run_workflow.js` uses `BASE_URL` or `BASE` env var.
