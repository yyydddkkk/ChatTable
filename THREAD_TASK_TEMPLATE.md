# Thread Task Template

Use this template whenever a new AI execution thread is created.

The thread owner must only work inside its assigned branch and assigned file scope.

---

## Basic Info

- Thread name:
- Tool:
- Branch:
- Base branch:
- Goal:
- Priority:

## Scope

Allowed files:

- `path/a`
- `path/b`

Forbidden files:

- `path/x`
- `path/y`

Files requiring explicit approval before edit:

- `path/shared-1`
- `path/shared-2`

## Dependencies

Foundation branch required:

- `feat/foundation-...`

Dependent branches:

- `feat/backend-...`
- `feat/frontend-...`

Blocked until:

- shared schema merged
- API contract confirmed

## Requirements

Functional requirements:

- requirement 1
- requirement 2

Non-functional requirements:

- keep backward compatibility
- no unrelated refactor
- preserve existing API behavior unless specified

## Verification

Required commands:

```bash
# backend example
cd backend && UV_CACHE_DIR=/tmp/uv-cache uv run --python .venv/bin/python pytest -v path/to/test.py

# frontend example
cd frontend && npm run build
```

Manual verification:

- check scenario 1
- check scenario 2

## Delivery Format

The thread must report back using this format:

```md
Branch:

Changed files:
- path/1
- path/2

What changed:
- item 1
- item 2

Verification run:
- command
- result

Assumptions:
- item 1

Blocked / risks:
- item 1

Files intentionally not touched:
- path/x
```

## Thread Rules

- Do not edit files outside the allowed scope.
- Do not modify shared files unless explicitly authorized.
- Do not refactor unrelated code.
- Do not merge into `dev` or `main`.
- Do not resolve cross-thread conflicts locally unless asked.
- If the task requires a shared-file change, stop and escalate back to the integration owner.
