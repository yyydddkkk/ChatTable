# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ChatTable is an AI Agent social chat application where users create AI agents as "friends" and chat with them privately or in groups. Each agent has unique personality, memory, and knowledge base. The project uses a WeChat-inspired warm social design style.

**Current Status**: Step 1 - Basic framework implementation (FastAPI backend + React frontend + WebSocket communication)

## Tech Stack

**Backend**:
- Python 3.10+ with FastAPI
- SQLModel (ORM + Pydantic models)
- SQLite database (chattable.db)
- WebSocket for real-time communication
- Package manager: `uv`

**Frontend**:
- React 19 + TypeScript
- Vite build tool
- Tailwind CSS v4
- Zustand for state management
- Lucide Icons

## Development Commands

### Backend

```bash
cd backend

# Install dependencies (using uv)
uv sync

# Run development server
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run without reload
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000

# Add new dependency
uv add <package-name>
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run development server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Architecture

### Backend Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app entry, WebSocket endpoint
│   ├── api/                 # API route handlers
│   │   └── agents.py        # Agent CRUD endpoints
│   ├── core/                # Core functionality
│   │   ├── config.py        # Settings (host, port, encryption_key)
│   │   ├── database.py      # SQLModel database initialization
│   │   ├── security.py      # API key encryption/decryption
│   │   └── websocket.py     # WebSocket connection manager
│   ├── models/              # SQLModel data models
│   │   └── agent.py         # Agent, AgentCreate, AgentUpdate, AgentResponse
│   └── services/            # Business logic (future modules)
├── pyproject.toml           # Python dependencies
└── chattable.db             # SQLite database file
```

### Frontend Structure

```
frontend/
├── src/
│   ├── main.tsx             # React entry point
│   ├── App.tsx              # Root component (currently shows ContactsPage)
│   ├── components/          # Reusable UI components
│   │   ├── CreateAgentModal.tsx
│   │   └── AgentDetailSidebar.tsx
│   ├── pages/               # Page components
│   │   └── ContactsPage.tsx # Agent cards grid with three-column layout
│   ├── stores/              # Zustand state management
│   │   └── agentStore.ts    # Agent state
│   ├── services/            # API and WebSocket services
│   │   └── websocket.ts
│   └── types/               # TypeScript type definitions
│       └── index.ts
├── package.json
└── vite.config.ts
```

### Key Design Patterns

**WebSocket Communication**:
- Backend: ConnectionManager manages multiple WebSocket connections per conversation
- Heartbeat: 30-second ping/pong to keep connections alive
- Frontend: Auto-reconnect with exponential backoff (1s → 2s → 4s → 8s)
- Event types: `agent_thinking`, `agent_message`, `agent_done`, `topic_switched`, `error`

**Agent Model**:
- API keys are encrypted before storage using `cryptography` library
- AgentResponse schema excludes API key from responses
- Supports custom model configuration (model name, api_base, system_prompt)
- Response behavior: speed multiplier, reply probability, default length (1-5)

**API Structure**:
- Base path: `/api/v1/`
- CORS enabled for `http://localhost:5173` (Vite dev server)
- RESTful endpoints for Agent CRUD
- WebSocket endpoint: `/ws/{conversation_id}`

## Implementation Roadmap

The project follows a 10-step implementation plan (see `docs/plans/2026-03-10-chattable-design.md`):

1. ✅ Basic framework (FastAPI + React + WebSocket)
2. ✅ Agent CRUD
3. 🔄 Private chat basics (in progress)
4. Group chat basics
5. Decision engine (agent willingness calculation)
6. Length control (5 levels + natural language triggers)
7. Topic detection
8. Memory system (working + short-term)
9. Long-term memory (ChromaDB + forgetting mechanism)
10. Knowledge base (document upload + RAG)

## Database

**Location**: `backend/chattable.db` (SQLite)

**Current Tables**:
- `agents`: AI agent configurations with encrypted API keys

**Planned Tables** (see design doc):
- `conversations`: Chat sessions (private/group)
- `messages`: Chat messages with sender info
- `memories`: Three-tier memory system
- `knowledge_bases`: Document metadata for RAG

## Important Notes

**Security**:
- API keys are encrypted using `app.core.security.encrypt_api_key()` before storage
- Never log or expose API keys in responses
- Encryption key is in `app.core.config.settings.encryption_key`

**WebSocket**:
- Each conversation has its own WebSocket connection
- Use `manager.broadcast()` to send messages to all clients in a conversation
- Handle `WebSocketDisconnect` to clean up connections

**Frontend State**:
- Zustand stores are in `src/stores/`
- Agent data fetched from `/api/v1/agents`
- WebSocket service handles real-time updates

**Styling**:
- Tailwind CSS v4 (uses `@import` syntax in CSS files)
- Color scheme: Primary #07C160 (WeChat green), warm beige backgrounds
- Soft UI style: rounded corners, subtle shadows, 200-300ms transitions

**Python Environment**:
- Use `uv` for all package management (not pip)
- Virtual environment is in `backend/.venv/`
- Python version specified in `backend/.python-version`

## Future Modules (Not Yet Implemented)

These are planned but not yet built:
- `app/services/decision_engine.py` - Agent reply decision logic
- `app/services/length_control.py` - Response length management
- `app/services/memory_manager.py` - Three-tier memory system
- `app/services/topic_detector.py` - Topic switch detection
- `app/services/knowledge_base.py` - RAG with ChromaDB
- LiteLLM integration for unified model API calls
- APScheduler for memory compression tasks

## Design Reference

Full design specifications are in `docs/plans/2026-03-10-chattable-design.md`, including:
- Detailed UI/UX specifications (colors, spacing, components)
- Five-layer decision engine algorithm
- Memory compression and forgetting mechanisms
- Knowledge base RAG implementation
- Complete API endpoint specifications
