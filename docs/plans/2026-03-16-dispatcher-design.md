# 2026-03-16 Dispatcher 设计（多 Agent 群聊调度中枢）

## 1. 目标与范围

本文档定义 ChatTable 多 Agent 群聊系统中的 `Dispatcher` 模块。`Dispatcher` 位于 IM 业务层与 AutoGen 引擎层之间，作为唯一调度入口，统一负责消息上下文加载、响应决策、执行编排、轮次推进与失败降级。

已确认的核心约束如下：

- 调度判定采用全 LLM 模式，不再使用分散的规则判定入口。
- Planner 使用独立模型 `qwen3.5-plus`，与 Agent 回复模型解耦。
- 群聊单条用户消息最大触发数量 `hard_cap=5`。
- Planner 失败时必须降级兜底，并输出结构化日志。
- 开发阶段允许前端看到降级提示；生产阶段默认前端无感。

## 2. 非目标

以下内容不在本阶段范围内：

- 不重构前端主交互模型，仅增加可选调度状态事件。
- 不在本阶段切换数据库类型。
- 不在本阶段替换 AutoGen 执行器，只调整其调用入口。
- 不在本阶段引入复杂多任务优先级系统（仅保留必要队列能力）。

## 3. 架构总览（混合模式）

Dispatcher 采用混合执行模式：默认同步执行，复杂场景按策略切换异步队列执行。

```text
WebSocket user_message
  -> ChatApplicationService
    -> Dispatcher.handle_message()
      -> ContextLoader (Redis + DB fallback)
      -> PlannerClient(qwen3.5-plus) [single call]
      -> DispatchPlan schema validation
      -> PlanExecutor
         -> sync path OR async queue path
         -> AutoGenChatEngine.execute_plan_step(...)
      -> RoundEvaluator (@ trigger / stop condition)
      -> done / fallback_done / failed
```

核心原则：

- `Dispatcher` 是唯一可推进调度状态的组件。
- `AutoGenChatEngine` 不再决定“谁该回复”，只执行已校验计划。
- 同步与异步路径复用同一份 `DispatchPlan` 协议与事件协议。

## 4. 组件职责

### 4.1 ContextLoader

职责：

- 从 Redis 读取会话活跃上下文（最近 N 条消息、最近 @ 关系、运行态标记）。
- Redis miss 时回源 DB，并将热数据回填 Redis。
- 输出 Planner 输入上下文，确保字段完整性。

建议缓存键：

- `dispatch:conv:{conversation_id}:recent_messages`
- `dispatch:conv:{conversation_id}:runtime_state`
- `dispatch:conv:{conversation_id}:mention_graph`

### 4.2 PlannerClient

职责：

- 调用 `qwen3.5-plus` 产出结构化 `DispatchPlan`。
- 单消息最多一次主调用 + 一次重试。
- 强制 JSON schema 校验，不合法视为失败。

要求：

- 仅返回结构化 JSON，不允许自然语言计划。
- 不直接执行任何 Agent 逻辑。

### 4.3 PlanExecutor

职责：

- 按 `execution_graph` 执行串行/并行阶段。
- 统一管理 WebSocket 事件发射。
- 处理 `effective_cap` 裁剪与 deferred 候选保存。

### 4.4 FallbackController

职责：

- 处理 Planner 失败链路（超时、网络、JSON 非法）。
- 生成最小可用兜底计划。
- 强制打结构化日志并上报指标。

## 5. 调度协议：DispatchPlan v1

建议结构如下：

```json
{
  "plan_id": "uuid",
  "conversation_id": 123,
  "trigger_message_id": 456,
  "selected_agents": [
    {"agent_id": 1, "priority": 100, "reason_tag": "direct_mention"},
    {"agent_id": 2, "priority": 80, "reason_tag": "coordination_needed"}
  ],
  "execution_graph": [
    {"stage": 1, "mode": "serial", "agents": [1]},
    {"stage": 2, "mode": "parallel", "agents": [2, 3]}
  ],
  "round_control": {
    "max_rounds": 2,
    "trigger_next_round": true,
    "next_round_candidates": [3, 4]
  },
  "safety_guardrails": {
    "stop_conditions": ["timeout", "token_budget", "empty_reply"],
    "defer_policy": "carry_to_next_round"
  },
  "deferred_candidates": [4, 5]
}
```

后端硬约束：

- `effective_cap = min(5, active_agents_count)`。
- `selected_agents` 超出 `effective_cap` 时按 priority 裁剪。
- `max_rounds` 默认 2，硬上限 3。

## 6. 状态机与数据流

统一状态机：

- `RECEIVED`
- `PLANNING`
- `PLANNED`
- `EXECUTING`
- `ROUND_EVAL`
- `DONE | FALLBACK_DONE | FAILED`

### 6.1 同步路径

- 适用于简单会话或低风险请求。
- 在当前 WebSocket 请求链路内完成 planning + execute。
- 优点：低延迟；缺点：峰值抗压弱。

### 6.2 异步路径

- 适用于复杂群聊、预估高耗时或系统负载高时。
- Dispatcher 持久化任务并入队，Worker 拉取执行。
- 前端接收 `queued` 和 `running` 状态事件。

路由策略由配置与实时指标共同决定，避免硬编码。

## 7. Planner 失败与降级策略

固定失败链路：

1. `planner_primary_failed`
2. `planner_retry_failed`
3. `fallback_plan_executed`

降级计划定义：

- 群聊有 @：仅被 @ 对象回复，按 @ 顺序串行。
- 群聊无 @：选择 1 名主持 Agent 回复。
- 私聊：目标 Agent 直接回复。

说明：

- 兜底计划仍走 `PlanExecutor`，保持事件协议一致。
- 开发环境下可推送 `dispatcher_degraded` 给前端。
- 生产环境默认关闭降级提示，用户侧无感。

## 8. 可观测性与日志

### 8.1 结构化日志字段（强制）

- `event`
- `tenant_id`
- `conversation_id`
- `message_id`
- `request_id`
- `planner_model` (`qwen3.5-plus`)
- `failure_type` (`timeout/json_invalid/network`)
- `retry_count`
- `fallback_strategy`
- `selected_agents`
- `latency_ms`
- `raw_output_preview`（截断 + 脱敏）

### 8.2 核心指标

- `planner_latency_p50/p95`
- `planner_failure_rate`
- `fallback_rate`
- `avg_selected_agents`
- `avg_round_count`
- `dispatch_end_to_end_latency`

## 9. 配置项建议

- `DISPATCHER_ENABLED=true`
- `DISPATCHER_MODE=mixed`
- `DISPATCHER_HARD_CAP=5`
- `DISPATCHER_MAX_ROUNDS=2`
- `DISPATCHER_PLANNER_MODEL=qwen3.5-plus`
- `DISPATCHER_PLANNER_TIMEOUT_MS=2500`
- `DISPATCHER_PLANNER_RETRY=1`
- `DISPATCHER_DEBUG_FEEDBACK=true`（开发）

## 10. 测试策略

### 10.1 单元测试（P0）

- `DispatchPlan` schema 校验。
- `effective_cap` 裁剪逻辑。
- fallback 触发条件与策略。
- round 终止与上限。

### 10.2 集成测试（P0）

- 同步路径闭环。
- 异步路径闭环。
- Planner 连续失败后兜底闭环。
- 多租户隔离验证。

### 10.3 压测与灰度（P1）

- 按 10% -> 50% -> 100% 灰度启用。
- 回滚开关：`DISPATCHER_ENABLED` 与 `DISPATCHER_MODE=sync`。

## 11. 落地步骤（建议）

1. 新建 `app/modules/dispatcher/`（domain + application + infrastructure）。
2. 在 `ChatApplicationService` 中接入 Dispatcher 作为唯一入口。
3. 将 `AutogenChatEngine` 改造为计划执行器接口实现。
4. 接入 Redis 上下文缓存与任务队列。
5. 接入结构化日志与指标。
6. 完成灰度发布并逐步移除旧 `DecisionEngine` 入口。

## 12. 验收标准

- 全部用户消息均经过 Dispatcher。
- 单消息 Planner 调用次数不超过 2（含重试）。
- 群聊触发上限严格受 `hard_cap=5` 约束。
- Planner 故障时可降级且有可检索日志。
- 开发环境有降级提示，生产环境默认无感。
