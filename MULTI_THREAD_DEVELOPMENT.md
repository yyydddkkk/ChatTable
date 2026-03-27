# ChatTable Multi-Thread Development Rules

This document defines the default collaboration rules for multi-thread AI development in this repository.

The current repository policy is:

- Use `feature branch` as the primary collaboration unit.
- Do not require `git worktree`.
- Treat file ownership as the core conflict-prevention mechanism.
- Use a single integration owner to merge and validate changes.

## 1. Goals

The goals of this workflow are:

- Allow multiple AI tools to work in parallel.
- Prevent multiple threads from editing the same file at the same time.
- Keep `main` stable.
- Reduce merge conflict noise and hidden behavioral regressions.
- Make integration predictable.

## 2. Core Rules

These rules are mandatory:

- One thread, one goal, one branch.
- One file can only have one active writer at a time.
- Shared interface changes must happen before dependent feature work.
- `main` is integration-only. Do not develop directly on `main`.
- Every merge must pass the thread's minimum verification commands before integration.

## 3. Branch Model

Use feature branches for all parallel work.

Recommended branch naming:

- `feat/foundation-<topic>`
- `feat/backend-<topic>`
- `feat/frontend-<topic>`
- `feat/integration-<topic>`
- `fix/<topic>`

Rules:

- Never let two AI threads push unrelated work to the same branch.
- Never use one branch for multiple unrelated tasks.
- If a task expands, split it into another branch instead of stretching scope.

## 4. Thread Ownership

Before a thread starts, define:

- Goal
- Allowed files
- Forbidden files
- Required upstream branch
- Verification commands

Minimum ownership template:

```md
Thread:
Goal:
Base branch:
Allowed files:
- path/a
- path/b

Forbidden files:
- path/x
- path/y

Verification:
- command 1
- command 2
```

If a file is not explicitly allowed, the thread should assume it cannot edit it.

## 5. Foundation-First Rule

If multiple threads depend on shared changes, create a foundation branch first.

Typical foundation work:

- shared types
- shared schemas
- API contracts
- config changes
- database model changes
- shared store shape changes

Recommended sequence:

1. Create `feat/foundation-<topic>`
2. Merge foundation branch
3. Branch feature work from the updated base
4. Merge feature branches in dependency order

Do not let multiple threads independently invent the same shared interface.

## 6. High-Conflict Files

The following areas are high-conflict and should default to single-thread ownership:

- `backend/app/core/config.py`
- `backend/app/core/database.py`
- `backend/app/main.py`
- `backend/app/models/`
- `backend/app/schemas/`
- `frontend/src/App.tsx`
- `frontend/src/types/`
- `frontend/src/config/`
- root-level project config files

Examples of root-level high-conflict files:

- `package.json`
- `frontend/package.json`
- `backend/pyproject.toml`
- `README.md`
- `AGENTS.md`

Rules for high-conflict files:

- Only one active branch may modify them at a time.
- If they must change, create a foundation branch or explicitly assign a single owner.

## 7. Parallel-Safe Areas

These areas are usually safer for parallel work when ownership is defined clearly:

- `backend/app/api/`
- `backend/app/services/`
- `backend/app/modules/dispatcher/`
- `backend/app/modules/agents/`
- `frontend/src/components/`
- `frontend/src/pages/`
- `frontend/src/stores/`
- `docs/`

These are still not free-for-all zones.

Parallel work is safe only when:

- threads do not modify the same files
- shared interfaces are already fixed
- merge order is known in advance

## 8. Merge Order

Default merge order:

1. Foundation branch
2. Backend contract or schema branch
3. Backend feature branches
4. Frontend feature branches
5. Integration or cleanup branch

Do not merge in "whoever finished first" order when dependencies exist.

## 9. Integration Owner

Every multi-thread effort must have one integration owner.

The integration owner is responsible for:

- splitting tasks
- assigning file ownership
- tracking branch dependencies
- reviewing merge order
- resolving conflicts
- running final verification

Other threads should not self-merge into `main`.

## 10. Communication Rules

Every thread handoff should include:

- what changed
- which files changed
- which files were intentionally not touched
- what assumptions were made
- what verification was run
- what is still blocked

Do not use vague handoffs like:

- "backend done"
- "frontend basically works"
- "I changed some shared types"

Use concrete handoffs instead.

## 11. Forbidden Behaviors

These patterns are not allowed:

- multiple active threads editing the same file
- unplanned edits to shared types or models
- "while I'm here" refactors in feature branches
- direct development on `main`
- merging without running the branch verification commands
- rebasing or merging away another thread's intent without review

## 12. Practical Workflow

Recommended workflow for each multi-thread effort:

1. Define the milestone.
2. Identify all shared files and shared contracts.
3. Create a foundation branch if needed.
4. Split the rest into independent feature branches.
5. Write ownership notes for each branch.
6. Implement and verify each branch separately.
7. Merge in dependency order.
8. Run final repo-level verification after each merge.

## 13. ChatTable-Specific Guidance

For this repository, prefer this split:

- foundation:
  - shared schema
  - config
  - database
  - backend/frontend contract
- backend branches:
  - API or service features
  - agent runtime changes
  - dispatcher changes
- frontend branches:
  - page changes
  - component changes
  - store changes
- integration branch:
  - contract alignment
  - cleanup
  - final verification fixes

If a task needs both backend and frontend but no shared-file collision:

- use two branches, not one giant full-stack branch

If a task needs shared files first:

- stop and create a foundation branch

## 14. Default Decision Rule

If there is uncertainty about whether two threads can safely proceed in parallel:

- assume they cannot
- assign one owner to the shared file
- split the work again

Conservative coordination is cheaper than conflict-heavy integration.
