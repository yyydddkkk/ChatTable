# ChatTable

AI Agent Social Chat Platform — Create AI agents as "friends" for private or group conversations with intelligent reply generation, multi-tenant isolation, and real-time WebSocket communication.

## Tech Stack

### Backend
- **Runtime**: Python 3.10+ / FastAPI (async)
- **Database**: SQLModel / SQLite
- **Real-time**: WebSocket
- **Package Manager**: `uv`

### Frontend
- **Framework**: React 19 + TypeScript (strict mode)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand

---

## Architecture Overview

ChatTable implements a **multi-runtime architecture** with three operational modes, allowing flexible agent behavior from simple rule-based replies to complex LLM-powered orchestration.

### Runtime Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `legacy` | Local decision engine with rule-based logic | Simple, deterministic responses |
| `dispatcher` | LLM-based Planner selects agents and orchestrates execution | Dynamic agent routing with debugging |
| `langgraph` | Full LangGraph state machine with Intent → Speak → Reply pipeline | Complex multi-step reasoning |

### Agent Runtime Pipeline (LangGraph Mode)

```
User Message → IntentExecutor → SpeakArbiter → ReplyExecutor → Response
                    ↓                ↓              ↓
            [intent_graph]    [speak_arbiter]  [reply_graph]
```

- **IntentExecutor**: Recognizes user intent and determines if agents should respond
- **SpeakArbiter**: Decides which agents speak and in what order
- **ReplyExecutor**: Generates and dispatches agent replies

### Multi-Tenant Isolation

All data models include a `tenant_id` field. Request context is managed via `ContextVar[RequestContext]`, providing global access to tenant information without explicit parameter passing:

```python
tenant_id = get_current_tenant_id()  # ContextVar-based
```

### Memory Management

Each agent maintains an independent `ConversationMemory` per conversation, enabling personalized context retention across sessions.

### Provider Security

API keys for LLM providers are encrypted at rest using `security_manager.decrypt()` and never exposed in logs or error messages.

---

## Features

### Implemented

- [x] **Agent CRUD** — Create, read, update, delete AI agents
- [x] **Private Chat** — 1:1 conversations between users and agents
- [x] **Group Chat** — Multi-participant conversations
- [x] **Decision Engine** — Rule-based reply determination (legacy mode)
- [x] **Memory System** — Per-agent conversation context retention
- [x] **WebSocket Real-time** — Streaming responses with agent thinking states
- [x] **Multi-Tenant** — Complete data isolation per tenant
- [x] **Provider Management** — Secure encrypted API key storage
- [x] **LangGraph Runtime** — Intent-driven state machine for complex orchestration
- [x] **Dispatcher Mode** — LLM-based agent selection and execution planning
- [x] **AutoGen Compatibility** — Phase-1 adapter for ChatHandler-based engines

### In Progress

- [ ] Knowledge Base (RAG) integration
- [ ] Length control policies
- [ ] Topic detection

---

## Project Structure

```
backend/
├── app/
│   ├── main.py                      # FastAPI entry, WebSocket endpoint
│   ├── api/v1/endpoints.py          # REST API routes
│   ├── core/
│   │   ├── chat_handler.py          # Message processing core
│   │   ├── websocket.py             # ConnectionManager
│   │   ├── decision_engine.py        # Legacy reply decisions
│   │   ├── memory_manager.py         # ConversationMemory per agent
│   │   ├── tenant.py                 # get_current_tenant_id()
│   │   ├── request_context.py        # ContextVar[RequestContext]
│   │   └── config.py                # Runtime mode configuration
│   ├── modules/
│   │   ├── agents/                  # LangGraph Agent Runtime
│   │   │   ├── application/          # Services & orchestration
│   │   │   │   ├── default_agent_runtime_service.py
│   │   │   │   ├── conversation_orchestrator.py
│   │   │   │   ├── reply_executor.py
│   │   │   │   └── speak_arbiter.py
│   │   │   ├── domain/               # Domain models
│   │   │   │   ├── speak_intent.py
│   │   │   │   ├── reply_task.py
│   │   │   │   └── agent_event.py
│   │   │   └── infrastructure/        # LangGraph implementations
│   │   │       ├── langgraph_runtime.py   # IntentGraph + ReplyGraph
│   │   │       └── intent_executor.py
│   │   ├── dispatcher/               # LLM-based agent selection
│   │   │   ├── application/
│   │   │   │   └── dispatcher_service.py
│   │   │   ├── domain/
│   │   │   │   └── schemas.py        # DispatchPlan structures
│   │   │   └── infrastructure/
│   │   │       └── planner_client.py
│   │   ├── engine/                   # Chat engines
│   │   │   ├── application/ports.py  # ChatEnginePort protocol
│   │   │   └── infrastructure/
│   │   │       ├── factory.py        # create_chat_engine()
│   │   │       ├── legacy_chat_engine.py
│   │   │       └── autogen_chat_engine.py
│   │   └── im/application/
│   │       └── chat_application_service.py
│   └── models/                       # SQLModel tables
│       ├── agent.py
│       ├── conversation.py
│       ├── message.py
│       ├── user.py
│       ├── provider.py
│       ├── memory.py
│       └── app_settings.py
└── chattable.db                      # SQLite database

frontend/
├── src/
│   ├── main.tsx                      # React entry
│   ├── App.tsx                       # Root component with view routing
│   ├── stores/                       # Zustand stores
│   │   ├── agentStore.ts
│   │   ├── conversationStore.ts
│   │   ├── authStore.ts
│   │   ├── tenantStore.ts
│   │   └── providerStore.ts
│   ├── services/
│   │   ├── http.ts                   # apiFetch with tenant/auth headers
│   │   ├── websocket.ts             # WebSocketService class
│   │   └── dispatcher.ts            # Dispatcher status/plans API
│   ├── components/                   # React components
│   │   ├── ChatArea.tsx
│   │   ├── MessageInput.tsx
│   │   ├── SessionList.tsx
│   │   └── ...
│   ├── types/
│   │   └── index.ts                  # WebSocketMessage, Conversation, Message
│   └── config/
│       └── api.ts                   # API_ENDPOINTS, WS_ENDPOINTS
└── package.json
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- `uv` (Python package manager)

### Backend

```bash
cd backend

# Install dependencies
uv sync

# Create local env file
cp .env.example .env

# Ensure PostgreSQL database exists
createdb chattable

# Run development server (hot reload)
UV_CACHE_DIR=/tmp/uv-cache uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run production server
UV_CACHE_DIR=/tmp/uv-cache uv run uvicorn app.main:app --host 0.0.0.0 --port 8000

# Lint code
UV_CACHE_DIR=/tmp/uv-cache uv run ruff check .

# Format code
UV_CACHE_DIR=/tmp/uv-cache uv run ruff format .

# Run tests
UV_CACHE_DIR=/tmp/uv-cache uv run pytest -v
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production (includes type checking)
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Type check only
npx tsc --noEmit
```

Access the application at **http://localhost:5173** (frontend) with the backend API at **http://localhost:8000**.

---

## API Overview

### REST API

Base path: `/api/v1/`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/agents` | GET/POST | List/create agents |
| `/agents/{id}` | GET/PUT/DELETE | Agent CRUD |
| `/conversations` | GET/POST | List/create conversations |
| `/conversations/{id}/messages` | GET | Get messages |
| `/providers` | GET/POST | Manage LLM providers |
| `/settings` | GET/PUT | App settings |

### WebSocket

Endpoint: `/ws/{conversation_id}`

Supports streaming chunks, agent thinking states, and dispatcher summaries for debugging.

### Request Headers

| Header | Description |
|--------|-------------|
| `X-Tenant-ID` | Tenant identifier for multi-tenant isolation |
| `Authorization` | Bearer token for authentication |

---

## Configuration

### Runtime Modes

Set via environment variable or `app_settings` table:

```bash
RUNTIME_MODE=langgraph  # legacy | dispatcher | langgraph
```

### Environment Variables

```bash
# Backend
DATABASE_URL=sqlite:///./chattable.db
RUNTIME_MODE=langgraph

# Frontend
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000
```

---

## Security

- API keys encrypted at rest via `security_manager.encrypt()` / `decrypt()`
- Multi-tenant data isolation via `tenant_id` on all models
- ContextVar-based request context prevents tenant data leakage
- No secrets exposed in logs or error responses

---

## License

MIT
