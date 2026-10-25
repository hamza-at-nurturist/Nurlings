# Tasks

## 1. Approval

- [x] 1.1 Maintainer asks for one guidance line hiding paths, folders and internal IDs, kept out of
  `executor.ts`. Verify: explicit request in the session.

## 2. Guidance

- [x] 2.1 Add `user-facing-guidance.ts` with the line and append it to the system prompt in
  `pi-runtime.ts`. Verify: `pi-system-prompts` test covers the computer and sandbox-only prompts.
- [x] 2.2 `openspec validate hide-workspace-paths --strict`, typecheck, lint and the adapters unit
  tests pass.

## 3. After merge

- [x] 3.1 Archive the change.
