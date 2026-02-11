Migration: `InviteUserPanel.jsx` -> use `useAuthApi`

This patch updates a single consumer component to use the new `useAuthApi` adapter instead of `useContext(AuthContext)`.

How to apply

1. From repo root run:

   git apply docs/pr_diffs/0001-extract-auth-adapter.patch
   git apply docs/pr_diffs/0001-migrate-InviteUserPanel.patch

2. Run tests and manual smoke test for invite flow.

Notes
- The migration is intentionally minimal and keeps behavior unchanged.
- If the original component uses additional context fields, expand the adapter accordingly.
