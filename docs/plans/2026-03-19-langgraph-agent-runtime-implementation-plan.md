# LangGraph Agent Runtime Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current dispatcher/engine-centric orchestration path with a LangGraph-based per-agent runtime that supports independent speaking intent, asynchronous group chat replies, and a migration path for proactive agents.

**Architecture:** The implementation keeps FastAPI, WebSocket, `Conversation`, and `Message` as outer shells while introducing a new `modules/agents` runtime core. Each agent gets an independent LangGraph runtime with a lightweight `intent path` and a gated `reply path`; a thin orchestrator coordinates event fan-out, intent collection, arbitration, and staggered reply execution.

**Tech Stack:** Python 3.10+, FastAPI, SQLModel, asyncio, LangGraph, pytest, existing WebSocket event protocol

---

### Task 1: Add the new agent runtime domain models

**Files:**
- Create: `backend/app/modules/agents/__init__.py`
- Create: `backend/app/modules/agents/domain/__init__.py`
- Create: `backend/app/modules/agents/domain/agent_definition.py`
- Create: `backend/app/modules/agents/domain/agent_state.py`
- Create: `backend/app/modules/agents/domain/agent_event.py`
- Create: `backend/app/modules/agents/domain/speak_intent.py`
- Create: `backend/app/modules/agents/domain/reply_task.py`
- Test: `backend/tests/test_agent_runtime_domain.py`

**Step 1: Write the failing test**

```python
from app.modules.agents.domain.speak_intent import SpeakIntent


def test_speak_intent_defaults_are_stable() -> None:
    intent = SpeakIntent(
        agent_id=1,
        conversation_id=9,
        event_id="evt-1",
        want_to_speak=True,
        priority_score=0.8,
    )

    assert intent.suggested_delay_ms == 0
    assert intent.topic_tags == []
```

**Step 2: Run test to verify it fails**

Run: `cd backend; uv run pytest -v tests/test_agent_runtime_domain.py::test_speak_intent_defaults_are_stable`
Expected: FAIL with import or attribute errors because the new domain objects do not exist yet.

**Step 3: Write minimal implementation**

Implement dataclasses or Pydantic/SQLModel-compatible domain models for:

- `AgentDefinition`
- `AgentState`
- `AgentEvent`
- `SpeakIntent`
- `ReplyTask`

Keep them framework-light and free of FastAPI or WebSocket concerns.

**Step 4: Run test to verify it passes**

Run: `cd backend; uv run pytest -v tests/test_agent_runtime_domain.py`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/modules/agents backend/tests/test_agent_runtime_domain.py
git commit -m "feat: add agent runtime domain models"
```

### Task 2: Add conversation event orchestration

**Files:**
- Create: `backend/app/modules/agents/application/__init__.py`
- Create: `backend/app/modules/agents/application/conversation_orchestrator.py`
- Create: `backend/app/modules/agents/application/agent_runtime_service.py`
- Modify: `backend/app/modules/im/application/chat_application_service.py`
- Test: `backend/tests/test_conversation_orchestrator.py`

**Step 1: Write the failing test**

```python
import pytest

from app.modules.agents.application.conversation_orchestrator import ConversationOrchestrator


@pytest.mark.anyio
async def test_orchestrator_broadcasts_group_event_to_all_active_agents() -> None:
    orchestrator = ConversationOrchestrator(...)

    await orchestrator.handle_user_message(
        conversation_id="10",
        content="hello everyone",
        ...
    )

    assert ...
```

**Step 2: Run test to verify it fails**

Run: `cd backend; uv run pytest -v tests/test_conversation_orchestrator.py::test_orchestrator_broadcasts_group_event_to_all_active_agents`
Expected: FAIL because the orchestrator does not exist.

**Step 3: Write minimal implementation**

Implement:

- `ConversationOrchestrator.handle_user_message()`
- conversion from user message to `AgentEvent`
- fan-out to all active conversation agents
- persistence and `user_message` broadcast reuse from current behavior

Do not add arbitration yet; only ensure the event fan-out is in place.

**Step 4: Run test to verify it passes**

Run: `cd backend; uv run pytest -v tests/test_conversation_orchestrator.py`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/modules/agents/application backend/app/modules/im/application/chat_application_service.py backend/tests/test_conversation_orchestrator.py
git commit -m "feat: add conversation orchestrator entrypoint"
```

### Task 3: Add LangGraph runtime with an intent path

**Files:**
- Create: `backend/app/modules/agents/infrastructure/__init__.py`
- Create: `backend/app/modules/agents/infrastructure/langgraph_runtime.py`
- Create: `backend/app/modules/agents/infrastructure/intent_executor.py`
- Test: `backend/tests/test_langgraph_agent_runtime.py`

**Step 1: Write the failing test**

```python
import pytest

from app.modules.agents.infrastructure.langgraph_runtime import LangGraphAgentRuntime


@pytest.mark.anyio
async def test_runtime_returns_speak_intent_for_group_event() -> None:
    runtime = LangGraphAgentRuntime(...)

    intent = await runtime.run_intent_path(...)

    assert intent.want_to_speak is True
```

**Step 2: Run test to verify it fails**

Run: `cd backend; uv run pytest -v tests/test_langgraph_agent_runtime.py::test_runtime_returns_speak_intent_for_group_event`
Expected: FAIL because the runtime does not exist.

**Step 3: Write minimal implementation**

Implement a first-pass runtime wrapper that:

- loads lightweight state
- scores message relevance
- builds a `SpeakIntent`
- does not yet call RAG, MCP, or skills

The LangGraph graph can remain small and deterministic in the first pass.

**Step 4: Run test to verify it passes**

Run: `cd backend; uv run pytest -v tests/test_langgraph_agent_runtime.py`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/modules/agents/infrastructure backend/tests/test_langgraph_agent_runtime.py
git commit -m "feat: add langgraph agent intent runtime"
```

### Task 4: Add `SpeakIntent` arbitration

**Files:**
- Create: `backend/app/modules/agents/application/speak_arbiter.py`
- Test: `backend/tests/test_speak_arbiter.py`

**Step 1: Write the failing test**

```python
from app.modules.agents.application.speak_arbiter import SpeakArbiter
from app.modules.agents.domain.speak_intent import SpeakIntent


def test_arbiter_selects_top_three_non_duplicate_intents() -> None:
    arbiter = SpeakArbiter()
    intents = [...]

    selected = arbiter.select(intents, max_speakers=3)

    assert len(selected) == 3
```

**Step 2: Run test to verify it fails**

Run: `cd backend; uv run pytest -v tests/test_speak_arbiter.py::test_arbiter_selects_top_three_non_duplicate_intents`
Expected: FAIL because the arbiter does not exist.

**Step 3: Write minimal implementation**

Implement selection rules for:

- `want_to_speak`
- `priority_score`
- cooldown penalty
- duplicate risk filtering
- maximum speaker count

Keep the logic deterministic and testable.

**Step 4: Run test to verify it passes**

Run: `cd backend; uv run pytest -v tests/test_speak_arbiter.py`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/modules/agents/application/speak_arbiter.py backend/tests/test_speak_arbiter.py
git commit -m "feat: add speak intent arbitration"
```

### Task 5: Add staggered reply execution

**Files:**
- Create: `backend/app/modules/agents/application/reply_executor.py`
- Modify: `backend/app/modules/agents/application/conversation_orchestrator.py`
- Test: `backend/tests/test_reply_executor.py`

**Step 1: Write the failing test**

```python
import pytest

from app.modules.agents.application.reply_executor import ReplyExecutor


@pytest.mark.anyio
async def test_reply_executor_staggers_selected_agents() -> None:
    executor = ReplyExecutor(...)

    await executor.execute(...)

    assert ...
```

**Step 2: Run test to verify it fails**

Run: `cd backend; uv run pytest -v tests/test_reply_executor.py::test_reply_executor_staggers_selected_agents`
Expected: FAIL because staggered execution is not implemented.

**Step 3: Write minimal implementation**

Implement:

- immediate first-speaker execution
- delayed follow-up speaker scheduling
- cancellation for stale tasks
- reuse of `agent_thinking`, `agent_message_chunk`, and `agent_done`

Do not add proactive scheduling yet.

**Step 4: Run test to verify it passes**

Run: `cd backend; uv run pytest -v tests/test_reply_executor.py`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/modules/agents/application/reply_executor.py backend/app/modules/agents/application/conversation_orchestrator.py backend/tests/test_reply_executor.py
git commit -m "feat: add staggered agent reply execution"
```

### Task 6: Add the reply path runtime

**Files:**
- Modify: `backend/app/modules/agents/infrastructure/langgraph_runtime.py`
- Test: `backend/tests/test_langgraph_agent_reply_path.py`

**Step 1: Write the failing test**

```python
import pytest

from app.modules.agents.infrastructure.langgraph_runtime import LangGraphAgentRuntime


@pytest.mark.anyio
async def test_runtime_streams_reply_for_selected_task() -> None:
    runtime = LangGraphAgentRuntime(...)

    await runtime.run_reply_path(...)

    assert ...
```

**Step 2: Run test to verify it fails**

Run: `cd backend; uv run pytest -v tests/test_langgraph_agent_reply_path.py::test_runtime_streams_reply_for_selected_task`
Expected: FAIL because reply execution is not yet supported.

**Step 3: Write minimal implementation**

Implement:

- recent message context loading
- agent persona prompt assembly reuse or migration
- streaming reply generation
- message persistence
- state writeback hooks

Keep RAG, MCP, and skills behind disabled switches until later tasks.

**Step 4: Run test to verify it passes**

Run: `cd backend; uv run pytest -v tests/test_langgraph_agent_reply_path.py`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/modules/agents/infrastructure/langgraph_runtime.py backend/tests/test_langgraph_agent_reply_path.py
git commit -m "feat: add langgraph reply path runtime"
```

### Task 7: Introduce runtime persistence

**Files:**
- Create: `backend/app/models/agent_runtime_state.py`
- Create: `backend/app/models/agent_relationship_state.py`
- Create: `backend/app/models/agent_event_log.py`
- Create: `backend/app/models/agent_checkpoint.py`
- Create: `backend/app/models/agent_memory_entry.py`
- Create: `backend/app/modules/agents/infrastructure/state_repository.py`
- Create: `backend/alembic/versions/<timestamp>_add_agent_runtime_tables.py`
- Test: `backend/tests/test_agent_runtime_state_repository.py`

**Step 1: Write the failing test**

```python
def test_state_repository_persists_runtime_state(...) -> None:
    ...
```

**Step 2: Run test to verify it fails**

Run: `cd backend; uv run pytest -v tests/test_agent_runtime_state_repository.py`
Expected: FAIL because the new persistence model is missing.

**Step 3: Write minimal implementation**

Create persistence models and repositories for:

- runtime state
- relationship state
- event log
- checkpoint
- memory entry

Keep schema minimal; avoid premature normalization.

**Step 4: Run test to verify it passes**

Run: `cd backend; uv run pytest -v tests/test_agent_runtime_state_repository.py`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/models backend/app/modules/agents/infrastructure/state_repository.py backend/alembic backend/tests/test_agent_runtime_state_repository.py
git commit -m "feat: add agent runtime persistence"
```

### Task 8: Add active scheduling for proactive agents

**Files:**
- Create: `backend/app/modules/agents/application/agent_scheduler_service.py`
- Test: `backend/tests/test_agent_scheduler_service.py`

**Step 1: Write the failing test**

```python
import pytest

from app.modules.agents.application.agent_scheduler_service import AgentSchedulerService


@pytest.mark.anyio
async def test_scheduler_emits_wake_up_event_for_eligible_agent() -> None:
    scheduler = AgentSchedulerService(...)

    await scheduler.tick(...)

    assert ...
```

**Step 2: Run test to verify it fails**

Run: `cd backend; uv run pytest -v tests/test_agent_scheduler_service.py::test_scheduler_emits_wake_up_event_for_eligible_agent`
Expected: FAIL because proactive scheduling does not exist.

**Step 3: Write minimal implementation**

Implement:

- periodic wake-up checks
- active-window rules
- cooldown gating
- `wake_up` event emission to agent runtimes

Do not yet add human-like calendar logic or advanced moods.

**Step 4: Run test to verify it passes**

Run: `cd backend; uv run pytest -v tests/test_agent_scheduler_service.py`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/modules/agents/application/agent_scheduler_service.py backend/tests/test_agent_scheduler_service.py
git commit -m "feat: add proactive agent scheduler"
```

### Task 9: Migrate the IM entrypoint behind a feature flag

**Files:**
- Modify: `backend/app/modules/im/application/chat_application_service.py`
- Modify: `backend/app/core/config.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_chat_application_langgraph_switch.py`

**Step 1: Write the failing test**

```python
import pytest


@pytest.mark.anyio
async def test_chat_application_uses_langgraph_runtime_when_enabled() -> None:
    ...
```

**Step 2: Run test to verify it fails**

Run: `cd backend; uv run pytest -v tests/test_chat_application_langgraph_switch.py`
Expected: FAIL because the new switch is not wired.

**Step 3: Write minimal implementation**

Add a feature flag such as:

- `AGENT_RUNTIME_MODE=legacy|hybrid|langgraph`

Use it to route the IM entrypoint to the new orchestrator while keeping the old path available for rollback.

**Step 4: Run test to verify it passes**

Run: `cd backend; uv run pytest -v tests/test_chat_application_langgraph_switch.py`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/modules/im/application/chat_application_service.py backend/app/core/config.py backend/app/main.py backend/tests/test_chat_application_langgraph_switch.py
git commit -m "feat: add langgraph runtime feature switch"
```

### Task 10: Add RAG, tools, and skills integration points

**Files:**
- Create: `backend/app/modules/knowledge/__init__.py`
- Create: `backend/app/modules/knowledge/rag_gateway.py`
- Create: `backend/app/modules/tools/__init__.py`
- Create: `backend/app/modules/tools/mcp_gateway.py`
- Create: `backend/app/modules/skills/__init__.py`
- Create: `backend/app/modules/skills/skill_registry.py`
- Modify: `backend/app/modules/agents/infrastructure/langgraph_runtime.py`
- Test: `backend/tests/test_langgraph_capability_gating.py`

**Step 1: Write the failing test**

```python
import pytest


@pytest.mark.anyio
async def test_runtime_only_invokes_allowed_capabilities() -> None:
    ...
```

**Step 2: Run test to verify it fails**

Run: `cd backend; uv run pytest -v tests/test_langgraph_capability_gating.py`
Expected: FAIL because capability gateways do not exist.

**Step 3: Write minimal implementation**

Add runtime integration points so reply-path nodes can conditionally call:

- RAG retrieval
- MCP tools
- skill workflows

Gate each call by `AgentDefinition` and conversation policy.

**Step 4: Run test to verify it passes**

Run: `cd backend; uv run pytest -v tests/test_langgraph_capability_gating.py`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/modules/knowledge backend/app/modules/tools backend/app/modules/skills backend/app/modules/agents/infrastructure/langgraph_runtime.py backend/tests/test_langgraph_capability_gating.py
git commit -m "feat: add agent capability gateways"
```

### Task 11: Remove or demote the old orchestration path

**Files:**
- Modify: `backend/app/modules/dispatcher/application/dispatcher_service.py`
- Modify: `backend/app/modules/engine/infrastructure/autogen_chat_engine.py`
- Modify: `backend/app/core/chat_handler.py`
- Docs: `docs/plans/2026-03-19-langgraph-migration-roadmap.md`
- Test: `backend/tests/test_legacy_path_compatibility.py`

**Step 1: Write the failing test**

```python
def test_legacy_path_is_disabled_in_langgraph_mode() -> None:
    ...
```

**Step 2: Run test to verify it fails**

Run: `cd backend; uv run pytest -v tests/test_legacy_path_compatibility.py`
Expected: FAIL because the old path still owns the primary flow.

**Step 3: Write minimal implementation**

Reduce the old modules to:

- compatibility fallback
- migration bridge
- rollback path

Do not delete immediately; keep them until the new path proves stable in production.

**Step 4: Run test to verify it passes**

Run: `cd backend; uv run pytest -v tests/test_legacy_path_compatibility.py`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/modules/dispatcher/application/dispatcher_service.py backend/app/modules/engine/infrastructure/autogen_chat_engine.py backend/app/core/chat_handler.py backend/tests/test_legacy_path_compatibility.py docs/plans/2026-03-19-langgraph-migration-roadmap.md
git commit -m "refactor: demote legacy orchestration path"
```

### Task 12: Run focused verification and broaden gradually

**Files:**
- Test: `backend/tests/test_agent_runtime_domain.py`
- Test: `backend/tests/test_conversation_orchestrator.py`
- Test: `backend/tests/test_langgraph_agent_runtime.py`
- Test: `backend/tests/test_speak_arbiter.py`
- Test: `backend/tests/test_reply_executor.py`
- Test: `backend/tests/test_langgraph_agent_reply_path.py`
- Test: `backend/tests/test_agent_scheduler_service.py`

**Step 1: Run focused tests**

Run:

```bash
cd backend
uv run pytest -v tests/test_agent_runtime_domain.py tests/test_conversation_orchestrator.py tests/test_langgraph_agent_runtime.py tests/test_speak_arbiter.py tests/test_reply_executor.py
```

Expected: PASS

**Step 2: Run reply and scheduling tests**

Run:

```bash
cd backend
uv run pytest -v tests/test_langgraph_agent_reply_path.py tests/test_agent_scheduler_service.py
```

Expected: PASS

**Step 3: Run a wider smoke suite**

Run:

```bash
cd backend
uv run pytest -v tests/test_dispatcher_service.py tests/test_autonomous_coordination.py tests/test_chat_application_langgraph_switch.py
```

Expected: PASS or only known legacy-bridge assertions requiring plan updates.

**Step 4: Compile touched files**

Run:

```bash
cd backend
uv run python -m py_compile app/main.py app/core/config.py app/modules/im/application/chat_application_service.py
```

Expected: no output

**Step 5: Commit**

```bash
git add .
git commit -m "test: verify langgraph agent runtime rollout"
```

Plan complete and saved to `docs/plans/2026-03-19-langgraph-agent-runtime-implementation-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
