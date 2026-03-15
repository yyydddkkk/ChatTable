# ChatTable Frontend-Backend Sync Doc (UTF-8)

Updated: 2026-03-15
Owner: Backend + Frontend parallel development

## 1) Backend Current Status

- Runtime DB: PostgreSQL (SQLite no longer used in runtime)
- Redis connected for runtime indexing
- Chat engine switch:
  - `CHAT_ENGINE=legacy`
  - `CHAT_ENGINE=autogen` (current default)
- AutoGen integrated:
  - `AssistantAgent + RoundRobinGroupChat`
  - Streaming chunk output
  - Checkpoint persistence in `autogen_checkpoints`
- Multi-tenant phase 1 done:
  - Core tables have `tenant_id`
  - Key repository/service/websocket paths are tenant-scoped
  - Fallback tenant is `local` when header is missing
- Multi-tenant phase 2 done:
  - Composite indexes created
  - `audit_logs` table added
  - Audit events added for key writes

## 2) Contract Alignment (Frontend must follow)

### 2.1 Tenant propagation

- Add `X-Tenant-Id: <tenant-id>` to all HTTP requests.
- For WebSocket, pass tenant using query param (browser WS cannot always set custom headers reliably).

### 2.2 Existing HTTP paths (unchanged)

- `/api/v1/agents`
- `/api/v1/providers`
- `/api/v1/conversations`
- `/api/v1/conversations/{id}/messages`
- `/api/v1/settings`

### 2.3 Existing WebSocket event contract (unchanged)

Inbound:
- `user_message`
- `set_length`
- `clear`
- `pong`

Outbound:
- `user_message`
- `agent_thinking`
- `agent_message_chunk`
- `agent_done`
- `length_set`
- `topic_switched`
- `cleared`
- `ping`

## 3) Parallel Responsibilities

### Backend (this thread)

- Continue tenant hardening
- Improve AutoGen stability and checkpoint recovery
- Provide backend test scripts and compatibility notes

### Frontend (separate thread)

- Centralize API layer and inject tenant/token automatically
- Add tenant switch UX (simple version first)
- Keep current UI architecture stable for fast integration

## 4) Login Integration Plan

### 4.1 Frontend required work

- Build login/register pages with fields: `tenant_id`, `username`, `password`
- Save `access_token` after login
- Inject headers on every HTTP request:
  - `Authorization: Bearer <access_token>`
  - `X-Tenant-Id: <tenant_id>`
- Send auth info in WebSocket connection (query/header per backend support)
- Route guard: unauthenticated users cannot enter chat routes
- Handle `401`: clear token and redirect to login

### 4.2 Backend contract

- Auth routes under `/api/v1/auth/*`
- Token payload will include `tenant_id` and `user_id`
- During transition, `X-Tenant-Id` fallback remains supported

### 4.3 Minimum auth API contract

- `POST /api/v1/auth/register`
  - request: `{ "tenant_id": "team-a", "username": "alice", "password": "xxx" }`
  - response: `{ "id": 1, "tenant_id": "team-a", "username": "alice" }`

- `POST /api/v1/auth/login`
  - request: `{ "tenant_id": "team-a", "username": "alice", "password": "xxx" }`
  - response: `{ "access_token": "<jwt>", "token_type": "bearer", "tenant_id": "team-a" }`

- `GET /api/v1/auth/me`
  - header: `Authorization: Bearer <jwt>`
  - response: `{ "id": 1, "tenant_id": "team-a", "username": "alice" }`

## 5) Integration Checklist

1. Data isolation works between different tenants.
2. `CHAT_ENGINE=autogen` emits streaming chunks.
3. Checkpoint resumes after backend restart.
4. `/api/v1/settings` is tenant-scoped.
5. Write operations create records in `audit_logs`.

## 6) Start Commands

Backend:
```bash
cd backend
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Frontend:
```bash
cd frontend
npm run dev
```

## 7) Risk Notes

- `ENCRYPTION_KEY` must match existing encrypted provider keys.
- Current tenant isolation is request-level; full token-driven auth is the next milestone.

## 8) Frontend Auth Progress (2026-03-15)

- Added login/register frontend flow with fields: `tenant_id`, `username`, `password`.
- Added auth state store with token persistence and session hydration via `/api/v1/auth/me`.
- Added route guard in App: unauthenticated users are redirected to login page.
- Added centralized HTTP auth injection:
  - `Authorization: Bearer <access_token>` when token exists
  - `X-Tenant-Id` always included
- Added automatic `401` handling: clear token and return to login.
- Added WebSocket auth propagation via query params:
  - `tenant_id`
  - `access_token`

## 9) Backend Auth Status (2026-03-15)

- Implemented auth APIs:
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/login`
  - `GET /api/v1/auth/me`
- Implemented `users` table in PostgreSQL with tenant-scoped unique key:
  - `UNIQUE (tenant_id, username)`
- Implemented JWT auth payload:
  - `sub` (user id), `tenant_id`, `username`, `iat`, `exp`
- Implemented middleware behavior:
  - Valid bearer token overrides context `tenant_id/user_id`
  - Tenant mismatch (`X-Tenant-Id` vs token tenant) returns `403`
  - Invalid bearer token returns `401` for protected APIs
  - For open endpoints (`/`, `/health`, `/api/v1/auth/*`), invalid bearer token is ignored to avoid blocking login/register
- Implemented WebSocket token support:
  - `ws://.../ws/{conversation_id}?tenant_id=<id>&access_token=<jwt>`
  - Token tenant mismatch vs query tenant is rejected
  - Invalid token is rejected before connection is accepted

## 10) Frontend Login Page Requirements (Final Contract)

- Login and register forms must send:
  - `tenant_id`
  - `username`
  - `password`
- After login:
  - Persist `access_token` and `tenant_id`
  - Add `Authorization: Bearer <access_token>` to HTTP requests
  - Add `X-Tenant-Id: <tenant_id>` to HTTP requests
  - Connect WebSocket with query:
    - `tenant_id`
    - `access_token`
- On `401`:
  - Clear local auth state
  - Redirect to login page

## 11) Security Note

- Current `ENCRYPTION_KEY=chattable-secret` is intentionally kept for compatibility with existing encrypted provider keys.
- JWT HS256 recommends a 32+ byte key; rotate to a stronger key only after re-encrypt migration strategy is ready.
