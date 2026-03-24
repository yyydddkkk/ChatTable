# 2026-03-19 LangGraph 全量迁移路线图

## 1. 迁移目标

本路线图用于指导 ChatTable 从当前 `dispatcher + engine + chat_handler` 架构迁移到以 LangGraph 为核心的 Agent Runtime Platform。迁移目标不是简单替换一个 Agent 框架，而是完成以下结构性变化：

- 从“消息驱动的聊天处理”迁移到“事件驱动的 Agent 运行时”。
- 从“中心决定谁说话”迁移到“Agent 自主判断 + 轻量仲裁”。
- 从“静态角色配置”迁移到“静态定义 + 动态状态 + 主动行为”。
- 从“工具能力外挂”迁移到“RAG / MCP / skills 作为 Agent Runtime 能力节点”。

## 2. 迁移原则

### 2.1 不动前端协议

第一阶段不修改前端核心协议，保留现有：

- `user_message`
- `agent_thinking`
- `agent_message_chunk`
- `agent_done`

这样可以确保 LangGraph 重构主要发生在后端内部，不引入前后端双线迁移风险。

### 2.2 并行新旧链路

迁移期间必须允许：

- 旧链路继续稳定处理现有会话。
- 新链路通过配置开关灰度接入。
- 任意时刻可快速回退。

建议开关：

- `AGENT_RUNTIME_MODE=legacy`
- `AGENT_RUNTIME_MODE=hybrid`
- `AGENT_RUNTIME_MODE=langgraph`

### 2.3 先通最小闭环，再接复杂能力

迁移必须遵循：

1. 先跑通最小群聊链路。
2. 再做状态持久化。
3. 再做主动互动。
4. 最后接入 RAG、MCP、skills。

禁止第一期把所有能力一次性塞进 Graph。

## 3. 分阶段迁移

### Phase 0：准备期

目标：

- 明确新模块边界。
- 确认新 domain 模型。
- 评估 LangGraph 版本、依赖和持久化策略。

产出：

- 新设计文档。
- 实施计划文档。
- 初版数据模型。

退出条件：

- 团队对“一人一 graph + 轻量中枢 + 首响优先”的模型达成一致。

### Phase 1：最小链路打通

目标：

- 一条群聊消息能够进入新 orchestrator。
- 所有候选 Agent 并发返回 `SpeakIntent`。
- 仲裁层选出 `2-3` 个 Agent。
- 第一位 Agent 快速开口，后续 Agent 错峰回复。

本阶段不做：

- 主动唤醒。
- RAG。
- MCP。
- skills。

退出条件：

- 新链路在测试环境下稳定处理群聊。
- 第一个 Agent 首响满足体验要求。

### Phase 2：状态化与恢复

目标：

- 引入 `AgentState`、`RelationshipState` 和 checkpoint。
- 支持 Agent 冷却、活跃度、关系权重、最近关注话题。
- 支持中断恢复和事件回放。

退出条件：

- Agent 回复选择受动态状态影响。
- 单 Agent runtime 可恢复。

### Phase 3：主动互动

目标：

- 引入 `AgentSchedulerService`。
- 支持 `wake_up` 事件。
- 支持“长时间未互动后主动发消息”。
- 支持按时间窗口和冷却期控制主动性。

退出条件：

- 单 Agent 可主动给用户发起聊天。
- 群聊中的主动插话受全局节奏控制。

### Phase 4：能力接入

目标：

- 在 `reply path` 中接入 RAG。
- 接入 MCP / tool registry。
- 接入 skill registry。
- 按 `AgentDefinition` 控制能力开关和权限。

退出条件：

- Agent 可按定义调用允许的知识、工具和 skills。
- 能力调用失败时存在稳定降级路径。

### Phase 5：旧链路退役

目标：

- 旧 `dispatcher` 不再负责主调度。
- `autogen_chat_engine` 不再承担主执行职责。
- `chat_handler` 只保留兼容桥接或完全退役。

退出条件：

- `AGENT_RUNTIME_MODE=langgraph` 成为默认配置。
- 旧链路只作为应急回滚路径或正式删除。

## 4. 关键风险与缓解

### 4.1 性能风险

风险：

- 群聊中多 Agent 并发导致首响变慢。

缓解：

- 拆分 `intent path` 与 `reply path`。
- 仅让入选 Agent 跑重链路。
- 以首响时间作为第一性能指标。

### 4.2 行为失控风险

风险：

- Agent 互相触发，导致群聊循环。

缓解：

- 限制每轮发言人数。
- 加入 follow-up 上限。
- 加入冷却与反循环规则。

### 4.3 状态设计过重风险

风险：

- 试图在第一期定义过多人格和关系状态，拖慢推进。

缓解：

- 第一版只保留最少必要状态：
  - 活跃度
  - 冷却
  - 关系强度
  - 最近关注点

### 4.4 迁移耦合风险

风险：

- 新 runtime 与 WebSocket / FastAPI 层耦死，后面难以测试和调度。

缓解：

- 将 HTTP / WebSocket 层限制为输入输出适配器。
- 所有运行逻辑落入 `ConversationOrchestrator` 和 Agent Runtime 层。

## 5. 推荐灰度策略

### 5.1 灰度顺序

1. 开发环境固定启用新链路。
2. 测试环境部分会话启用。
3. 小比例真实会话灰度。
4. 群聊优先迁移，私聊随后跟进。
5. 主动互动最后上线。

### 5.2 灰度控制维度

- 按租户。
- 按会话类型。
- 按 Agent 数量。
- 按是否启用主动消息。

### 5.3 回滚策略

任何阶段均应允许：

- 将 `AGENT_RUNTIME_MODE` 切回 `legacy`。
- 禁用 `AgentSchedulerService`。
- 禁用 RAG / MCP / skills 节点。

## 6. 里程碑建议

### 里程碑 1

- 新 domain 模型落地。
- 新 orchestrator 落地。
- 一条最小群聊链路通过测试。

### 里程碑 2

- `SpeakIntent` 仲裁稳定。
- 错峰回复稳定。
- 基础状态持久化完成。

### 里程碑 3

- 主动唤醒跑通。
- 单 Agent 主动消息可用。
- 回放与恢复可用。

### 里程碑 4

- RAG、MCP、skills 接入新 runtime。
- 旧链路仅保留回滚用途。

### 里程碑 5

- 全量切换 LangGraph。
- 清理旧调度与旧引擎代码。

## 7. 文档联动

本路线图配套文档：

- `docs/plans/2026-03-19-langgraph-agent-runtime-design.md`
- `docs/plans/2026-03-19-langgraph-agent-runtime-implementation-plan.md`
- `docs/plans/2026-03-19-group-chat-speaking-protocol.md`

这三份文档分别回答：

- 为什么这样设计。
- 具体怎么实施。
- 群聊中多 Agent 发言规则如何落地。
