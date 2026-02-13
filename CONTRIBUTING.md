**CONTRIBUTING**

Short guidelines for contributing to ARCHGUARD.

- **Code style:** We use ESLint + Prettier. Run `npm run lint` to check and `npm run lint:fix` to auto-fix. Use `npm run format` to apply Prettier formatting.
- **Pre-commit hooks:** Husky and lint-staged are configured. After installing deps run `npm run prepare` to enable Husky hooks.
- **Installing deps locally:** Use `npm ci` for reproducible installs. Note: running `npm ci` will update `package-lock.json` if the lockfile is out of sync; please commit the updated lockfile if you intentionally ran `npm install` or updated devDependencies.
- **When to run `npm ci` here:** If you want me to run `npm ci` now and then run `npm run lint`/`npm run format` to auto-fix issues, please confirm — this will change `package-lock.json`.
- **CI:** Pull requests run lint and tests automatically. Keep PRs focused and include changelog notes when appropriate.
- **Testing:** Run `npm test` (Vitest) locally before opening a PR.

If you need a hand running the local checks or updating the lockfile, tell me and I can run `npm ci` and fix issues automatically (with your confirmation).
