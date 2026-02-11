PR: Extract `authApi` adapter from `AuthContext` (step 1/ N)

Goal
- Reduce direct imports of `AuthContext` across the codebase by introducing a small adapter `useAuthApi()` that provides a stable, minimal API surface.

Why
- Lowers coupling to the React `AuthContext` implementation
- Makes incremental refactors safe: change internals behind `authApi` without updating all consumers

Files (patch)
- Adds: `src/context/authApi.js`
- Changes (example consumer): `src/components/InviteUserPanel.jsx` (update imports + usage)

Checklist (one PR, single consumer)
- [ ] Add `src/context/authApi.js` (this PR)
- [ ] Update one consumer to use `useAuthApi()` instead of `useContext(AuthContext)` (this PR)
- [ ] Run unit tests and smoke test UI flows
- [ ] Open follow-up PRs migrating other consumers (5–10 files per PR)

Migration notes
- Keep `AuthContext` fully backward-compatible; adapter reads from it.
- Prefer small PRs to reduce review burden.

Patch usage
- Apply the `.patch` file in this folder against the target repo root.
  Example: `git apply docs/pr_diffs/0001-extract-auth-adapter.patch`

Commit message (suggested)
- chore(auth): extract `useAuthApi` adapter and migrate `InviteUserPanel` to adapter

Follow-ups
- Create adapters for other contexts (I18n, Theme)
- Add linter rule recommending `useAuthApi` for new code

Notes
- This PR is intentionally minimal: it only introduces the adapter and migrates a single consumer so reviewers can validate the pattern.
