# 2026-03-19 LangGraph Agent Runtime 设计

## 1. 背景

ChatTable 的产品方向已经明确：用户是系统中唯一真人，其他好友均为长期存在的 AI Agent。产品目标不是“在聊天软件中嵌入 AI 功能”，而是“构建一个由多个独立 Agent 组成的社交聊天系统”。每个 Agent 都应具备独立人格、独立状态、独立记忆、独立行为节奏，以及在私聊和群聊中的主动互动能力。

当前后端架构以 `dispatcher + engine + chat_handler` 为中心，适合“用户发消息 -> 系统挑选 Agent -> Agent 回复”的链路，但不适合支撑如下能力：

- 每个 Agent 独立判断是否发言。
- Agent 根据关系、记忆、时间和事件主动互动。
- RAG、MCP、skills 作为 Agent 运行时能力被动态启用。
- 群聊中多个 Agent 以接近真人社交的方式错峰接话。
- 每个 Agent 具备可恢复、可回放、可持续演化的运行状态。

因此，后端核心需要从“聊天处理器”升级为“Agent Runtime Platform”，并以 LangGraph 作为中长期核心运行框架。

## 2. 设计目标

本次重构的目标如下：

- 将每个 Agent 升级为独立运行的状态行为体。
- 采用“一人一 Graph / 一人一 Runtime”的模型，保证 Agent 间独立性。
- 保留现有 FastAPI、WebSocket、Conversation、Message 等外层基础设施。
- 将后端主链路改造为事件驱动，而不是仅依赖用户消息驱动。
- 支持群聊中的多 Agent 异步并发意图判断与错峰回复。
- 为后续接入 RAG、MCP、skills、主动消息和长期记忆预留稳定的扩展边界。

## 3. 核心架构结论

### 3.1 总体原则

- 每个 Agent 必须有独立 Graph，不共享运行状态。
- 中枢必须保留，但只能做轻量协调，不能代替 Agent 思考。
- 用户体验优先遵循“首响优先”，第一个 Agent 应尽快开口。
- 群聊默认允许多个 Agent 接话，但必须受限流、错峰与防循环机制保护。
- 重能力链路只在入选发言的 Agent 上执行，避免所有 Agent 同时跑重流程。

### 3.2 新主链路

```text
WebSocket / API Event
  -> ConversationOrchestrator
    -> Event Bus
      -> AgentRuntimeService.broadcast(event)
        -> N x LangGraphAgentRuntime.run_intent_path()
      -> SpeakArbiter.select_top_k()
      -> ReplyExecutor.schedule_reply_tasks()
        -> selected LangGraphAgentRuntime.run_reply_path()
      -> Message persistence + WebSocket streaming
      -> State / Memory / Relationship writeback
```

## 4. 模块划分

### 4.1 `modules/agents/domain`

领域层只定义核心对象，不关心 HTTP、WebSocket、数据库驱动和 LangGraph 细节。

建议新增：

- `agent_definition.py`
- `agent_state.py`
- `agent_event.py`
- `speak_intent.py`
- `reply_task.py`
- `relationship_state.py`
- `memory_snapshot.py`

关键对象职责：

- `AgentDefinition`：Agent 的静态定义，包括 persona、model、tools、rag、skills、behavior policy。
- `AgentState`：Agent 当前动态状态，包括活跃度、冷却时间、情绪、当前关注点、最近主动行为。
- `AgentEvent`：统一事件输入模型，涵盖用户消息、群聊消息、时间事件、系统事件、关系事件。
- `SpeakIntent`：Agent 对一次发言机会的轻量申请。
- `ReplyTask`：仲裁层批准后的正式发言任务。

### 4.2 `modules/agents/application`

应用层负责编排流程，不做具体模型调用和底层存储。

建议新增：

- `agent_runtime_service.py`
- `agent_scheduler_service.py`
- `conversation_orchestrator.py`
- `speak_arbiter.py`
- `reply_executor.py`

职责拆分：

- `ConversationOrchestrator`：将用户消息转换为事件，并负责一轮群聊发言流程的起点。
- `AgentRuntimeService`：管理 Agent runtime 的获取、调用和生命周期。
- `SpeakArbiter`：在多个 `SpeakIntent` 中选出本轮发言 Agent。
- `ReplyExecutor`：负责错峰执行 `ReplyTask`，并处理取消与过期。
- `AgentSchedulerService`：负责主动消息、定时唤醒、空闲时段触发等异步事件。

### 4.3 `modules/agents/infrastructure`

基础设施层连接 LangGraph、数据库、缓存和异步执行。

建议新增：

- `langgraph_runtime.py`
- `checkpoint_store.py`
- `state_repository.py`
- `intent_executor.py`
- `reply_executor_backend.py`
- `event_log_repository.py`

职责：

- `LangGraphAgentRuntime`：每个 Agent 的独立运行时适配器。
- `CheckpointStore`：保存 Graph checkpoint，用于中断恢复。
- `StateRepository`：读取和持久化 `AgentState`、`RelationshipState`。
- `IntentExecutor`：并发运行多个 Agent 的轻量意图链路。
- `ReplyExecutorBackend`：执行真实回复链路，支持流式输出和取消。

### 4.4 `modules/knowledge` / `modules/tools` / `modules/skills`

这些模块不是中枢，而是 Agent Runtime 的能力挂载层。

- `modules/knowledge`：负责 RAG 检索、知识源配置和结果整形。
- `modules/tools`：负责 MCP 和其他工具调用的安全封装。
- `modules/skills`：负责 skills 注册、授权和运行入口。

## 5. 每个 Agent 的最小 Graph

### 5.1 Intent Path

Intent Path 的目标只有一个：快速决定“我要不要说”。

建议节点：

1. `ingest_event`
2. `load_light_state`
3. `score_relevance`
4. `evaluate_cooldown`
5. `build_speak_intent`

约束：

- 不做重 RAG。
- 不做 MCP / skills 调用。
- 尽量只读取轻状态和最近上下文。
- 超时应控制在 `200-500ms`。

### 5.2 Reply Path

Reply Path 只给仲裁后入选的 Agent 执行。

建议节点：

1. `load_reply_context`
2. `load_recent_memory`
3. `maybe_retrieve_knowledge`
4. `maybe_run_skill_or_tool`
5. `generate_reply`
6. `stream_output`
7. `persist_runtime_updates`

第一期中：

- `maybe_retrieve_knowledge`
- `maybe_run_skill_or_tool`

可以先保留为空节点或简单兜底实现，以便后续平滑扩展。

## 6. 轻量调度中枢

系统仍然需要一个调度中枢，但职责必须降级为“交通警察”，而不是“导演”。

中枢保留职责：

- 事件广播与路由。
- 群聊一轮发言名额控制。
- 回复顺序与错峰启动。
- 防刷屏、防重复、防循环。
- 全局限流、权限与审计。

中枢不再负责：

- 判断 Agent 是否应该表达自我。
- 生成 Agent 内容。
- 维护 Agent 内部人格与关系逻辑。

## 7. 群聊发言模型

### 7.1 群聊目标

群聊要有“多个好友接话”的感觉，但不能变成同时刷屏。

建议默认策略：

- 每轮允许 `2-3` 个 Agent 回复。
- 热门话题允许扩展到 `4` 个，但必须是低频例外。
- 第一个 Agent 尽快开口。
- 后续 Agent 错峰接话。
- 如出现自然引申，可追加一轮简短 follow-up，但必须有轮次上限。

### 7.2 首响优先

系统应优先优化：

- 首个 Agent 的首包时间。

而不是：

- 等所有 Agent 都准备好后统一开口。

推荐体验目标：

- `SpeakIntent` 收集完成：`200-500ms`
- 第一个 Agent 开始流式输出：`< 1500ms`
- 第二个 Agent：相对延迟 `0.8-2s`
- 第三个 Agent：相对延迟 `2-4s`

## 8. 异步并发策略

### 8.1 并发原则

- 所有候选 Agent 并发跑 `intent path`。
- 只有入选 Agent 才跑 `reply path`。
- 后台状态更新可异步执行，但不能阻塞首响。

### 8.2 取消与降级

- Intent 超时：视为本轮放弃发言。
- Reply 尚未开始输出时，如果话题已过期，可直接取消。
- Reply 内部 RAG / MCP 超时：降级为纯记忆 / 纯人格回复。
- 新用户消息到来时，旧轮未开始输出的低优先级 reply 任务应被取消。

## 9. 数据模型建议

第一期建议保留现有 `Agent`、`Conversation`、`Message` 表，用于维持前端兼容和聊天基础能力。

新增持久化实体：

- `agent_runtime_state`
- `agent_relationship_state`
- `agent_event_log`
- `agent_checkpoint`
- `agent_memory_entry`

这样可以在不打断现有产品链路的前提下，引入 Agent Runtime 所需的状态化能力。

## 10. 旧模块迁移策略

### 10.1 先保留

- `app/core/websocket.py`
- `app/models/message.py`
- `app/models/conversation.py`
- 现有 API 路由

### 10.2 逐步降级

- `app/modules/dispatcher/application/dispatcher_service.py`
- `app/modules/engine/infrastructure/autogen_chat_engine.py`
- `app/core/chat_handler.py`

### 10.3 最终替代

- `ConversationOrchestrator` 替代旧 dispatcher 的主入口职责。
- `LangGraphAgentRuntime` 替代 AutoGen 执行层。
- `AgentSchedulerService` 承担主动消息与定时唤醒职责。

## 11. 分阶段落地建议

### Phase 1：最小可运行链路

- 建立新 domain 模型。
- 建立 `ConversationOrchestrator` 和 `LangGraphAgentRuntime`。
- 打通“群聊中 2-3 个 Agent 异步意图判断 + 首响优先回复”。
- 复用现有 `Message` 和 `WebSocket` 协议。

### Phase 2：状态化增强

- 引入 `AgentState`、`RelationshipState` 和 checkpoint。
- 加入主动唤醒和冷却机制。
- 群聊增加 follow-up 回合与反循环控制。

### Phase 3：能力接入

- 接入 RAG。
- 接入 MCP / tool registry。
- 接入 skill registry。
- 将这些能力挂到 `reply path` 中作为可选节点。

### Phase 4：全面替代旧引擎

- 将旧 `dispatcher` 降级为兼容层或完全移除。
- 下线 `autogen_chat_engine`。
- 收敛所有消息执行入口到新 Agent Runtime。

## 12. 风险与对策

### 12.1 风险

- 多 Agent 并发导致首响变慢。
- 群聊中重复发言和互相触发形成循环。
- 状态模型设计过重，导致第一期推进缓慢。
- LangGraph 运行逻辑与现有消息协议耦合过深。

### 12.2 对策

- 严格拆分 `intent path` 与 `reply path`。
- 以“首响优先”作为性能基线。
- 保持 `Message` / `WebSocket` 层不变，避免前端一起重构。
- 将复杂能力分期接入，不在第一期全部实现。

## 13. 验收标准

- 每个 Agent 拥有独立 runtime 和独立状态。
- 用户消息进入群聊后，多个 Agent 可自主申请发言。
- 第一位 Agent 能在可接受时间内开始流式输出。
- 群聊默认存在 `2-3` 个 Agent 接话，而不是全员刷屏。
- 主动唤醒逻辑可在单 Agent 层工作，不依赖强中心编排。
- 后续接入 RAG、MCP、skills 时，无需再次改写核心运行模型。
