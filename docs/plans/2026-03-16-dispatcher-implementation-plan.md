# Dispatcher 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在现有 ChatTable 后端中落地第一版 Dispatcher，使所有用户消息先进入 Dispatcher，再由其使用 qwen-plus 生成调度计划并驱动 AutoGen 执行，失败时自动降级并输出结构化日志。

**Architecture:** 新增 `modules/dispatcher` 子模块，拆分为 schema、planner、service 三层；通过 `ChatApplicationService` 接入 Dispatcher 作为统一入口；对 `AutogenChatEngine` 暴露“按指定 Agent 执行”能力，移除分散决策入口依赖。

**Tech Stack:** FastAPI, SQLModel, LiteLLM, pytest, existing WebSocket manager.

---

### Task 1: Dispatcher 协议与配置基础

**Files:**
- Create: `backend/app/modules/dispatcher/domain/schemas.py`
- Modify: `backend/app/core/config.py`
- Modify: `backend/app/modules/dispatcher/domain/__init__.py`
- Test: `backend/tests/test_dispatcher_schemas.py`

**Step 1: Write failing tests**
- 测试 DispatchPlan 解析、裁剪、fallback plan 构建。

**Step 2: Run tests and verify failures**
- Run: `cd backend; pytest -v tests/test_dispatcher_schemas.py`
- Expected: 失败（模块/类型不存在）。

**Step 3: Implement minimal code**
- 定义 `DispatchPlan`、`SelectedAgent`、`ExecutionStage`、`RoundControl` 数据结构。
- 定义 `compute_effective_cap()` 与 `build_fallback_plan()`。
- 在 `Settings` 增加 Dispatcher 配置项（model/hard_cap/timeout/retry/debug_feedback）。

**Step 4: Re-run tests**
- Run: `cd backend; pytest -v tests/test_dispatcher_schemas.py`
- Expected: PASS。

### Task 2: Planner 客户端（全 LLM + 重试 + 结构化日志）

**Files:**
- Create: `backend/app/modules/dispatcher/infrastructure/planner_client.py`
- Create: `backend/app/modules/dispatcher/infrastructure/__init__.py`
- Modify: `backend/app/services/llm_service.py`（仅在必要时增加可复用调用接口）
- Test: `backend/tests/test_dispatcher_planner.py`

**Step 1: Write failing tests**
- 测试 Planner 成功解析 JSON。
- 测试 primary 失败后 retry。
- 测试 retry 失败返回 fallback 信号。

**Step 2: Run tests and verify failures**
- Run: `cd backend; pytest -v tests/test_dispatcher_planner.py`
- Expected: FAIL。

**Step 3: Implement minimal code**
- 使用 `llm_service.generate()` 调用 `qwen-plus`。
- 将输出做 JSON 解析与 schema 校验。
- 在失败分支输出 `planner_primary_failed` / `planner_retry_failed` 日志。

**Step 4: Re-run tests**
- Run: `cd backend; pytest -v tests/test_dispatcher_planner.py`
- Expected: PASS。

### Task 3: Dispatcher Service 与入口接线

**Files:**
- Create: `backend/app/modules/dispatcher/application/dispatcher_service.py`
- Create: `backend/app/modules/dispatcher/application/__init__.py`
- Modify: `backend/app/modules/im/application/chat_application_service.py`
- Modify: `backend/app/main.py`
- Modify: `backend/app/modules/engine/infrastructure/autogen_chat_engine.py`
- Modify: `backend/app/modules/engine/application/ports.py`
- Test: `backend/tests/test_dispatcher_service.py`

**Step 1: Write failing tests**
- 测试消息统一走 Dispatcher。
- 测试 fallback 触发时执行兜底计划并记录日志/事件。
- 测试开发环境发 `dispatcher_degraded` 事件。

**Step 2: Run tests and verify failures**
- Run: `cd backend; pytest -v tests/test_dispatcher_service.py`
- Expected: FAIL。

**Step 3: Implement minimal code**
- Dispatcher 读取会话、Agent、@ 信息，生成计划并执行。
- Autogen engine 增加“按 agent 列表执行”接口，Dispatcher 透传执行。
- `ChatApplicationService` 改为优先调用 Dispatcher。

**Step 4: Re-run tests**
- Run: `cd backend; pytest -v tests/test_dispatcher_service.py`
- Expected: PASS。

### Task 4: 回归验证与文档同步

**Files:**
- Modify: `docs/plans/2026-03-16-dispatcher-design.md`（补充实现状态）
- Test: `backend/tests/test_autonomous_coordination.py`

**Step 1: Run targeted regression**
- Run: `cd backend; pytest -v tests/test_dispatcher_schemas.py tests/test_dispatcher_planner.py tests/test_dispatcher_service.py tests/test_autonomous_coordination.py`

**Step 2: Optional lint**
- Run: `cd backend; uv run ruff check .`

**Step 3: Commit**
- `git add ...`
- `git commit -m "feat(dispatcher): add llm-based dispatcher with fallback and logging"`

