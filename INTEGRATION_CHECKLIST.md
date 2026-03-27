# Integration Checklist

Use this checklist when merging thread branches into `dev`.

The integration owner is responsible for completing this checklist.

---

## 1. Pre-Merge Review

- Confirm the branch has one clear goal.
- Confirm the branch only changed allowed files.
- Confirm no unrelated refactor was included.
- Confirm shared-file edits were expected.
- Confirm the branch reports its verification commands and results.

## 2. Dependency Check

- Confirm required foundation branches are already merged.
- Confirm dependent branches are merged in the correct order.
- Confirm backend and frontend contracts are aligned.
- Confirm shared types, schemas, and configs are not drifting.

## 3. High-Conflict File Review

Review these areas with extra care if changed:

- `backend/app/core/config.py`
- `backend/app/core/database.py`
- `backend/app/main.py`
- `backend/app/models/`
- `backend/app/schemas/`
- `frontend/src/App.tsx`
- `frontend/src/types/`
- `frontend/src/config/`
- root project config files

For any branch touching these paths:

- inspect the diff manually
- compare against current `dev`
- confirm no other active branch is trying to land conflicting intent

## 4. Merge Procedure

Recommended order:

1. merge foundation branches
2. merge backend/shared contract branches
3. merge backend feature branches
4. merge frontend feature branches
5. merge cleanup or integration branches

Rules:

- Merge one branch at a time.
- Resolve one branch's conflicts before starting the next.
- Do not batch-merge multiple risky branches together.

## 5. Conflict Resolution Rules

If the same file was modified in multiple branches:

- identify which branch owns the intended final behavior
- compare both branch goals before resolving
- keep behavior, not just text
- re-run verification after conflict resolution

Do not trust an automatic merge if:

- shared types changed
- API payloads changed
- function signatures changed
- config values changed
- model fields changed

## 6. Required Verification

Run the smallest relevant verification after each merge.

Backend examples:

```bash
cd backend && UV_CACHE_DIR=/tmp/uv-cache uv run --python .venv/bin/python pytest -v
cd backend && UV_CACHE_DIR=/tmp/uv-cache uv run --python .venv/bin/python uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Frontend examples:

```bash
cd frontend && npm run build
cd frontend && npm run lint
```

Repo-level validation:

- backend starts successfully
- frontend builds successfully
- key user flows still work

## 7. Merge Log

Record each merge in this format:

```md
Branch merged:

Merge order position:

Files with conflicts:
- path/1

Conflict resolution summary:
- item 1

Verification run:
- command
- result

Residual risks:
- item 1
```

## 8. Stop Conditions

Stop integration and re-split work if:

- more than one branch edits the same high-conflict file
- the final behavior is unclear
- contracts changed without a foundation branch
- verification fails after merge
- conflict resolution requires guessing intent

When in doubt:

- stop merging
- clarify ownership
- create a new foundation or cleanup branch
