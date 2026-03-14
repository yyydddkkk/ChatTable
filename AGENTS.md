# AGENTS.md - Agent Coding Guidelines

This file provides guidance for AI agents working on the ChatTable codebase.

## Project Overview

ChatTable is an AI Agent social chat application where users create AI agents as "friends" for private or group chats.

- **Backend**: Python 3.10+ / FastAPI / SQLModel / SQLite / WebSocket
- **Frontend**: React 19 + TypeScript / Vite / Tailwind CSS v4 / Zustand

---

## Development Commands

### Backend

```bash
cd backend

# Install dependencies (using uv, NOT pip)
uv sync

# Run development server (hot reload)
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run without reload
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000

# Add new dependency
uv add <package-name>

# Run linting (ruff)
uv run ruff check .

# Run tests
pytest -v
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run development server (http://localhost:5173)
npm run dev

# Build for production (includes type checking)
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Type check only
npx tsc --noEmit

# Run tests
npm run test
```

**Running a Single Test**:
- Backend: `pytest -v path/to/test_file.py::test_name`
- Frontend: `npm run test -- path/to/test_file.ts`

---

## Code Style Guidelines

### Python (Backend)

**Imports**: Standard library → third-party → local. Use absolute imports. Sort within groups alphabetically.

```python
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.models.agent import Agent, AgentCreate
from app.core.database import get_db
```

**Formatting**: Follow PEP 8. Max line length: 88 characters (ruff default). Use Black formatting.

**Naming**: snake_case (functions/vars), PascalCase (classes), UPPER_SNAKE_CASE (constants), `_` prefix (private methods).

**Type Hints**: Always use them. Use `Optional[X]` and `List[X]` for compatibility. Prefer `list` and `dict` in function signatures.

**Error Handling**: Use `HTTPException` with appropriate status codes (400 for bad request, 401 unauthorized, 403 forbidden, 404 not found, 500 server error). Never expose secrets in error messages. Log errors with appropriate level.

**Database**: Use SQLModel, dependency injection for sessions, always commit writes. Use transactions for multi-step operations.

**Async**: Use `async def` for endpoint handlers, use `await` for async operations.

---

### TypeScript/React (Frontend)

**Imports**: React/core → third-party → local. Use path aliases (`@/`). Sort alphabetically within groups.

```typescript
import { useState, useEffect } from 'react';
import { create } from 'zustand';

import type { Agent } from '../types';
import { agentService } from '../services/agent';
```

**Formatting**: Use Prettier (run `npm run lint` to check). Max line length: 100 characters.

**Naming**: camelCase (vars/functions), PascalCase (components/types), camelCase.ts or kebab-case.ts (files).

**TypeScript**: Define interfaces for all data structures, avoid `any`, export types separately.

**React**: Functional components with hooks, destructure props, use generics where applicable. Use `FC` type from React when needed.

**State**: Use Zustand, keep stores focused per domain. Name stores with `use` prefix: `useAgentStore`.

**Error Handling**: Always try/catch async operations, cast errors properly: `(error as Error).message`. Handle API errors with user-friendly messages.

**HTTP**: Use fetch, set `Content-Type: application/json`, check `response.ok` before parsing. Handle 401/403 responses by redirecting to login.

---

## Architecture Patterns

- **API**: Base path `/api/v1/`, use FastAPI routers with prefixes/tags. Version endpoints explicitly.
- **WebSocket**: Endpoint `/ws/{conversation_id}`, handle `WebSocketDisconnect`, use connection manager.
- **Security**: Encrypt API keys before storage, never log secrets, validate all inputs. Use environment variables for sensitive config.
- **Error Responses**: Use consistent error response format across API.

---

## File Organization

```
backend/
├── app/
│   ├── main.py          # FastAPI entry
│   ├── api/             # Route handlers (routers)
│   │   └── v1/          # Versioned endpoints
│   ├── core/            # Utilities (db, security, config)
│   ├── models/          # SQLModel models
│   ├── services/        # Business logic
│   └── schemas/         # Pydantic models
└── chattable.db         # SQLite

frontend/
├── src/
│   ├── main.tsx         # React entry
│   ├── App.tsx          # Root component
│   ├── components/      # Reusable UI components
│   ├── pages/           # Page components
│   ├── stores/          # Zustand stores
│   ├── services/        # API/WebSocket clients
│   ├── types/           # TypeScript types
│   └── lib/             # Utilities and helpers
└── package.json
```

---

## Important Notes

- **Package Managers**: `uv` for Python (NOT pip), `npm` for Node.js
- **Tailwind v4**: Uses `@import` syntax, not `@tailwind` directives
- **Database**: SQLite at `backend/chattable.db` - back up before migrations
- **Hot Reload**: Backend uses uvicorn `--reload`, frontend uses Vite
- **Testing**: Write tests for new features. Backend uses pytest, frontend uses Vitest.
- **Environment**: Use `.env` files for local config, never commit secrets
