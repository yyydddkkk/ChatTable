# ChatTable Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a complete AI Agent social chat application with warm, WeChat-like design, featuring intelligent conversation, memory management, and knowledge base integration.

**Architecture:**
- Frontend: React + TypeScript + Tailwind CSS + shadcn/ui, three-column layout with WebSocket for real-time communication
- Backend: Python + FastAPI + SQLModel (managed by uv), async processing with LiteLLM for unified model access
- Database: SQLite (dev) with ChromaDB for vector storage, using BGE embeddings

**Tech Stack:**
- Frontend: React 18+, TypeScript, Tailwind CSS, shadcn/ui, Zustand, Lucide Icons
- Backend: Python 3.10+, FastAPI, SQLModel, LiteLLM, ChromaDB, APScheduler
- Tools: uv (Python), npm/pnpm (Frontend), WebSocket

---

## Step 1: Basic Framework Setup

### Task 1.1: Initialize Backend Project

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/README.md`

**Step 1: Initialize uv project**

```bash
cd backend
uv init --name chattable-backend --python 3.10
```

Expected: Creates `pyproject.toml` with basic configuration

**Step 2: Add core dependencies**

```bash
uv add fastapi uvicorn sqlmodel python-multipart websockets
```

Expected: Dependencies added to `pyproject.toml`

**Step 3: Create project structure**

```bash
mkdir -p app/api app/models app/core app/services
touch app/__init__.py app/api/__init__.py app/models/__init__.py app/core/__init__.py app/services/__init__.py
touch app/main.py
```

**Step 4: Verify structure**

```bash
tree app
```

Expected output:
```
app/
├── __init__.py
├── main.py
├── api/
│   └── __init__.py
├── models/
│   └── __init__.py
├── core/
│   └── __init__.py
└── services/
    └── __init__.py
```

---

### Task 1.2: Create Basic FastAPI Application

**Files:**
- Create: `backend/app/main.py`
- Create: `backend/app/core/config.py`

**Step 1: Create configuration**

File: `backend/app/core/config.py`

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "ChatTable"
    debug: bool = True
    host: str = "0.0.0.0"
    port: int = 8000

    class Config:
        env_file = ".env"

settings = Settings()
```

**Step 2: Create main application**

File: `backend/app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

app = FastAPI(title=settings.app_name, debug=settings.debug)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "ChatTable API"}

@app.get("/health")
async def health():
    return {"status": "ok"}
```

**Step 3: Test the application**

```bash
cd backend
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Expected: Server starts on http://localhost:8000
Visit http://localhost:8000/docs to see API documentation

**Step 4: Test health endpoint**

```bash
curl http://localhost:8000/health
```

Expected: `{"status":"ok"}`

---

### Task 1.3: Implement WebSocket Connection Manager

**Files:**
- Create: `backend/app/core/websocket.py`

**Step 1: Create WebSocket manager**

File: `backend/app/core/websocket.py`

```python
from typing import Dict, List
from fastapi import WebSocket
import asyncio
import json
from datetime import datetime

class ConnectionManager:
    def __init__(self):
        # conversation_id -> list of websockets
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.heartbeat_tasks: Dict[WebSocket, asyncio.Task] = {}

    async def connect(self, websocket: WebSocket, conversation_id: str):
        await websocket.accept()
        if conversation_id not in self.active_connections:
            self.active_connections[conversation_id] = []
        self.active_connections[conversation_id].append(websocket)

        # Start heartbeat task
        task = asyncio.create_task(self._heartbeat(websocket))
        self.heartbeat_tasks[websocket] = task

        print(f"Client connected to conversation {conversation_id}")

    def disconnect(self, websocket: WebSocket, conversation_id: str):
        if conversation_id in self.active_connections:
            self.active_connections[conversation_id].remove(websocket)
            if not self.active_connections[conversation_id]:
                del self.active_connections[conversation_id]

        # Cancel heartbeat task
        if websocket in self.heartbeat_tasks:
            self.heartbeat_tasks[websocket].cancel()
            del self.heartbeat_tasks[websocket]

        print(f"Client disconnected from conversation {conversation_id}")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)

    async def broadcast(self, message: dict, conversation_id: str):
        if conversation_id in self.active_connections:
            for connection in self.active_connections[conversation_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"Error broadcasting to client: {e}")

    async def _heartbeat(self, websocket: WebSocket):
        """Send ping every 30 seconds"""
        try:
            while True:
                await asyncio.sleep(30)
                await websocket.send_json({"type": "ping", "timestamp": datetime.now().isoformat()})
        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"Heartbeat error: {e}")

manager = ConnectionManager()
```

**Step 2: Add WebSocket endpoint to main.py**

File: `backend/app/main.py` (add after existing code)

```python
from fastapi import WebSocket, WebSocketDisconnect
from app.core.websocket import manager

@app.websocket("/ws/{conversation_id}")
async def websocket_endpoint(websocket: WebSocket, conversation_id: str):
    await manager.connect(websocket, conversation_id)
    try:
        while True:
            data = await websocket.receive_json()

            # Handle pong response
            if data.get("type") == "pong":
                continue

            # Echo message for testing
            await manager.broadcast({
                "type": "message",
                "content": data.get("content", ""),
                "timestamp": datetime.now().isoformat()
            }, conversation_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, conversation_id)
```

Add import at top:
```python
from datetime import datetime
```

**Step 3: Test WebSocket connection**

Start server:
```bash
cd backend
uv run uvicorn app.main:app --reload
```

Test with wscat (install if needed: `npm install -g wscat`):
```bash
wscat -c ws://localhost:8000/ws/test-conversation
```

Send message:
```json
{"type": "user_message", "content": "Hello"}
```

Expected: Receive echo message back

---

### Task 1.4: Initialize Frontend Project

**Files:**
- Create: `frontend/` directory with Vite + React + TypeScript

**Step 1: Create Vite project**

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
```

**Step 2: Install dependencies**

```bash
npm install
npm install -D tailwindcss postcss autoprefixer
npm install zustand lucide-react
```

**Step 3: Initialize Tailwind CSS**

```bash
npx tailwindcss init -p
```

**Step 4: Configure Tailwind**

File: `frontend/tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#07C160',
        secondary: '#10AEFF',
        background: '#F7F5F2',
        surface: '#FFFFFF',
        text: '#1A1A1A',
        'text-muted': '#8E8E93',
        border: '#E5E5EA',
      },
    },
  },
  plugins: [],
}
```

**Step 5: Add Tailwind directives**

File: `frontend/src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: 'PingFang SC', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

**Step 6: Test frontend**

```bash
npm run dev
```

Expected: Frontend starts on http://localhost:5173

---

### Task 1.5: Create Frontend WebSocket Service

**Files:**
- Create: `frontend/src/services/websocket.ts`
- Create: `frontend/src/types/index.ts`

**Step 1: Create types**

File: `frontend/src/types/index.ts`

```typescript
export interface WebSocketMessage {
  type: string;
  content?: string;
  timestamp?: string;
  agent_id?: string;
  agent_name?: string;
  [key: string]: any;
}

export type MessageHandler = (message: WebSocketMessage) => void;
```

**Step 2: Create WebSocket service**

File: `frontend/src/services/websocket.ts`

```typescript
import { WebSocketMessage, MessageHandler } from '../types';

class WebSocketService {
  private ws: WebSocket | null = null;
  private conversationId: string | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private heartbeatInterval: number | null = null;

  connect(conversationId: string) {
    this.conversationId = conversationId;
    this.createConnection();
  }

  private createConnection() {
    if (!this.conversationId) return;

    const wsUrl = `ws://localhost:8000/ws/${this.conversationId}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        // Handle ping
        if (message.type === 'ping') {
          this.sendPong();
          return;
        }

        // Notify all handlers
        this.messageHandlers.forEach(handler => handler(message));
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.stopHeartbeat();
      this.attemptReconnect();
    };
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);

    setTimeout(() => {
      this.createConnection();
    }, this.reconnectDelay);

    // Exponential backoff: 1s -> 2s -> 4s -> 8s
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 8000);
  }

  private startHeartbeat() {
    // Respond to server pings (server sends ping every 30s)
    // No need to send our own pings
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private sendPong() {
    this.send({ type: 'pong', timestamp: new Date().toISOString() });
  }

  send(message: WebSocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.conversationId = null;
    this.messageHandlers.clear();
  }
}

export const websocketService = new WebSocketService();
```

**Step 3: Create test component**

File: `frontend/src/App.tsx`

```typescript
import { useEffect, useState } from 'react';
import { websocketService } from './services/websocket';
import { WebSocketMessage } from './types';

function App() {
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to test conversation
    websocketService.connect('test-conversation');
    setIsConnected(true);

    // Listen for messages
    const unsubscribe = websocketService.onMessage((message) => {
      setMessages(prev => [...prev, message]);
    });

    return () => {
      unsubscribe();
      websocketService.disconnect();
    };
  }, []);

  const sendMessage = () => {
    if (inputValue.trim()) {
      websocketService.send({
        type: 'user_message',
        content: inputValue,
      });
      setInputValue('');
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-text mb-4">
          ChatTable WebSocket Test
        </h1>

        <div className="mb-4">
          <span className={`inline-block px-3 py-1 rounded-full text-sm ${
            isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        <div className="bg-surface rounded-lg shadow-md p-4 mb-4 h-96 overflow-y-auto">
          {messages.map((msg, index) => (
            <div key={index} className="mb-2 p-2 bg-background rounded">
              <div className="text-xs text-text-muted">{msg.type}</div>
              <div className="text-text">{msg.content || JSON.stringify(msg)}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-primary"
          />
          <button
            onClick={sendMessage}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
```

**Step 4: Test WebSocket communication**

Terminal 1 (Backend):
```bash
cd backend
uv run uvicorn app.main:app --reload
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

Open http://localhost:5173 in browser
- Should see "Connected" status
- Type message and click Send
- Should see message echoed back

**Step 5: Commit Step 1**

```bash
git add .
git commit -m "feat: basic framework setup with WebSocket communication

- Initialize backend with FastAPI and uv
- Implement WebSocket connection manager with heartbeat
- Initialize frontend with Vite, React, TypeScript, Tailwind
- Implement WebSocket service with auto-reconnect
- Test bidirectional communication"
```

---

## Step 2: Agent CRUD (High-Level Plan)

**Goal:** Implement create, read, update, delete operations for AI Agents

**Key Tasks:**
1. Define Agent data model (SQLModel)
2. Initialize SQLite database
3. Implement Agent API endpoints (/api/v1/agents)
4. Create frontend Agent management UI (contact page, create flow, detail sidebar)
5. Implement API Key encryption

**Files to Create:**
- `backend/app/models/agent.py`
- `backend/app/api/agents.py`
- `backend/app/core/database.py`
- `backend/app/core/security.py`
- `frontend/src/pages/ContactsPage.tsx`
- `frontend/src/components/CreateAgentModal.tsx`
- `frontend/src/components/AgentDetailSidebar.tsx`
- `frontend/src/stores/agentStore.ts`

---

## Step 3: Private Chat Basic Features (High-Level Plan)

**Goal:** Implement basic private chat with Agent reply and streaming output

**Key Tasks:**
1. Define Conversation and Message models
2. Implement conversation and message APIs
3. Integrate LiteLLM for Agent replies
4. Implement streaming output via WebSocket
5. Create three-column chat layout
6. Implement message bubbles and input area
7. Display Agent thinking state

**Files to Create:**
- `backend/app/models/conversation.py`
- `backend/app/models/message.py`
- `backend/app/api/conversations.py`
- `backend/app/api/messages.py`
- `backend/app/services/llm_service.py`
- `frontend/src/pages/ChatPage.tsx`
- `frontend/src/components/MessageBubble.tsx`
- `frontend/src/components/InputArea.tsx`
- `frontend/src/stores/chatStore.ts`

---

## Step 4: Group Chat Basic Features (High-Level Plan)

**Goal:** Implement group chat with multiple Agents and @ mention mechanism

**Key Tasks:**
1. Implement group conversation creation
2. Implement @ parsing (convert @AgentName to plain text)
3. Implement forced reply check (mentioned Agents must reply)
4. Implement parallel Agent replies (asyncio.gather)
5. Create @ selector component
6. Display multiple Agent messages with unique colors

**Files to Create/Modify:**
- `backend/app/core/decision_engine.py` (initial version)
- `backend/app/services/agent_service.py`
- `frontend/src/components/MentionSelector.tsx`
- `frontend/src/components/GroupAvatar.tsx`

---

## Step 5: Intent Calculation Layer (High-Level Plan)

**Goal:** Agents autonomously decide whether to reply based on topic relevance

**Key Tasks:**
1. Implement intent calculation algorithm
2. Implement topic relevance judgment (lightweight LLM)
3. Implement reply timing offset (based on response_speed)
4. Implement dynamic adjustment for later speakers
5. Implement Agent mutual triggering (max depth 3)

**Files to Create/Modify:**
- `backend/app/core/decision_engine.py` (complete version)
- `backend/app/services/relevance_service.py`

---

## Step 6: Length Control Layer (High-Level Plan)

**Goal:** Five-level length control with natural language triggers

**Key Tasks:**
1. Implement length control module
2. Define five length levels and System Prompt injection
3. Implement natural language trigger detection (keyword matching)
4. Implement length level priority handling
5. Create length level adjuster component

**Files to Create:**
- `backend/app/core/length_control.py`
- `frontend/src/components/LengthAdjuster.tsx`

---

## Step 7: Topic Detection (High-Level Plan)

**Goal:** Detect hard topic switches using keywords

**Key Tasks:**
1. Implement topic detection module
2. Implement hard switch keyword matching
3. Handle topic switch (compress memory, clear working memory, reset intent)
4. Push topic switch event via WebSocket

**Files to Create:**
- `backend/app/core/topic_detector.py`

---

## Step 8: Memory System (High-Level Plan)

**Goal:** Working memory + short-term memory compression

**Key Tasks:**
1. Implement memory management module
2. Define Memory data model
3. Implement working memory (recent 20 messages)
4. Implement short-term memory (compressed summaries)
5. Implement compression triggers (idle, topic switch, window pressure)
6. Implement compression algorithm (LiteLLM summary)
7. Implement memory injection (as System Prompt supplement)

**Files to Create:**
- `backend/app/models/memory.py`
- `backend/app/core/memory_manager.py`
- `backend/app/services/compression_service.py`

---

## Step 9: Long-Term Memory (High-Level Plan)

**Goal:** Cross-session persistence + forgetting mechanism

**Key Tasks:**
1. Implement long-term memory storage
2. Integrate ChromaDB for semantic retrieval
3. Implement forgetting mechanism (time decay, importance protection)
4. Implement scheduled tasks (APScheduler, daily)
5. Implement long-term memory injection (on-demand retrieval)
6. Display memory in Agent detail sidebar

**Files to Create/Modify:**
- `backend/app/core/memory_manager.py` (add long-term memory)
- `backend/app/services/vector_service.py`
- `backend/app/core/scheduler.py`

---

## Step 10: Knowledge Base (High-Level Plan)

**Goal:** Document upload + retrieval injection

**Key Tasks:**
1. Implement knowledge base module
2. Define KnowledgeBase data model
3. Implement document upload and text extraction (PDF, TXT, MD, URL)
4. Implement document chunking (LangChain TextSplitter)
5. Implement vectorization (BGE or sentence-transformers)
6. Store in ChromaDB
7. Implement retrieval (top_k=3)
8. Implement retrieval result injection (as context)
9. Create knowledge base upload UI

**Files to Create:**
- `backend/app/models/knowledge_base.py`
- `backend/app/core/knowledge_base.py`
- `backend/app/services/embedding_service.py`
- `backend/app/api/knowledge.py`
- `frontend/src/components/KnowledgeBaseUpload.tsx`

---

## Execution Notes

**Development Principles:**
- DRY (Don't Repeat Yourself)
- YAGNI (You Aren't Gonna Need It)
- TDD (Test-Driven Development) where applicable
- Frequent commits with clear messages

**Testing Strategy:**
- Manual testing for each step
- Verify WebSocket communication
- Test Agent replies and streaming
- Test memory compression and retrieval
- Test knowledge base upload and retrieval

**Commit Message Format:**
```
feat: brief description

- Detailed change 1
- Detailed change 2
- Detailed change 3
```

---

**Plan Status:** Ready for execution
**Next Step:** Begin with Task 1.1 (Initialize Backend Project)
