# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ChatTable is an AI Agent social chat application where users create AI agents as "friends" and chat with them privately or in groups. Each agent has unique personality, memory, and knowledge base. WeChat-inspired warm social design style.

**Current Status**: Steps 1-7 implemented (framework, agent CRUD, private/group chat, decision engine, length control, topic detection, memory system in progress).

## Tech Stack

- **Backend**: Python 3.10+ / FastAPI / SQLModel / SQLite (`backend/chattable.db`) / WebSocket
- **Frontend**: React 19 + TypeScript / Vite / Tailwind CSS v4 / Zustand / Lucide Icons
- **Package managers**: `uv` for Python (NOT pip), `npm` for frontend

## Development Commands

```bash
# Backend
cd backend
uv sync                                                          # install deps
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 # dev server
uv run ruff check .                                              # lint
uv run ruff format .                                             # format
pytest -v                                                        # tests
pytest -v path/to/test_file.py::test_name                        # single test

# Frontend
cd frontend
npm install          # install deps
npm run dev          # dev server (http://localhost:5173)
npm run build        # production build (includes tsc -b)
npm run lint         # ESLint
npx tsc --noEmit     # type check only
```

## Architecture

### Backend Layers

The backend follows a layered architecture: **Routes → Services → Repositories → Models**.

- `app/main.py` — FastAPI app entry + WebSocket endpoint (`/ws/{conversation_id}`). All WebSocket message handling (user messages, commands, agent reply orchestration) lives here.
- `app/api/v1/endpoints.py` — REST endpoints. Single flat file, all routes under `/api/v1/`.
- `app/api/v1/router.py` — Mounts endpoints with `/api/v1` prefix.
- `app/api/dependencies.py` — FastAPI dependency injection (`get_db` session provider).
- `app/services/` — Business logic layer. `agent_service` and `conversation_service` are singleton instances (not classes you instantiate).
- `app/repositories/` — Data access layer with base repository pattern (`base.py` provides generic CRUD).
- `app/models/` — SQLModel ORM models (database tables): `Agent`, `Conversation`, `Message`, `Memory`.
- `app/schemas/` — Pydantic schemas for API request/response (separate from ORM models).
- `app/core/` — Cross-cutting concerns:
  - `config.py` — Settings (host, port, encryption_key), logging setup
  - `database.py` — SQLModel engine + `init_db()`
  - `security.py` — API key encryption/decryption
  - `websocket.py` — ConnectionManager for WebSocket connections
  - `decision_engine.py` — Agent reply decision logic (5-layer willingness calculation)
  - `length_control.py` — Response length management (5 levels + trigger word detection)
  - `topic_detector.py` — Topic switch detection
  - `memory_manager.py` — Memory context building and management
- `app/services/llm_service.py` — LLM streaming integration (used in WebSocket handler).
- `app/services/message_parser.py` — @mention parsing and conversation agent lookup.

### Frontend Structure

- `App.tsx` — Root component managing view state (contacts vs chat), agent/conversation selection.
- `pages/` — `ContactsPage` (agent grid), `ChatPage` (chat interface).
- `stores/` — Zustand stores: `agentStore.ts` (agents CRUD), `conversationStore.ts` (conversations + messages).
- `components/` — UI components: `MainLayout`, `SessionList`, `ChatArea`, `ChatHeader`, `MessageInput`, `CreateAgentModal`, `CreateGroupModal`, `AgentDetailSidebar`, `MentionSelector`, `LengthAdjuster`, `Dropdown`, `GroupAvatar`.
- `services/websocket.ts` — WebSocket client with auto-reconnect (exponential backoff).
- `config/api.ts` — API endpoint URLs. `config/commands.ts` — Chat slash commands. `config/models.ts` — Model definitions.
- `types/index.ts` — Shared TypeScript interfaces.
- `lib/` — Utilities: `agentPalette.ts`, `RadarChart.tsx`, `Icon.tsx`.

### Key Patterns

**WebSocket flow** (in `main.py`): User message → save to DB → broadcast → get conversation agents → decision engine filters who replies → length control injects prompt → agents stream replies in parallel via `asyncio.gather` → chunks broadcast as `agent_message_chunk` → final `agent_done` with saved message.

**WebSocket event types**: `user_message`, `agent_thinking`, `agent_message_chunk`, `agent_done`, `topic_switched`, `length_set`, `cleared`, `error`.

**WebSocket commands**: `user_message`, `set_length`, `clear`, `pong`.

**API key security**: Encrypted before storage via `app.core.security.encrypt_api_key()`. `AgentResponse` schema excludes API key. Never log or expose keys.

## Styling

- Tailwind CSS v4: uses `@import "tailwindcss"` syntax (not `@tailwind` directives), CSS variables for theming.
- Color scheme: Primary `#07C160` (WeChat green), warm beige backgrounds.
- Soft UI: rounded corners, subtle shadows, 200-300ms transitions.

## TypeScript Config

Strict mode enabled: `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax` (requires `import type`), `erasableSyntaxOnly`.

## Design Reference

Full design specs in `docs/plans/2026-03-10-chattable-design.md` (UI/UX, decision engine algorithm, memory mechanisms, knowledge base RAG, API specs).
