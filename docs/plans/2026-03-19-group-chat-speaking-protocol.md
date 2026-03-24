# 2026-03-19 群聊发言协议（SpeakIntent / ReplyTask）

## 1. 目标

本协议定义 ChatTable 在 LangGraph 架构下的群聊发言机制。其目标是同时满足以下产品要求：

- 多个 Agent 可以像真实群聊一样接话。
- 第一个 Agent 必须尽快开口。
- 不允许所有 Agent 同时刷屏。
- Agent 自主判断是否发言，而不是由强中心统一决定内容。
- 中枢仅做轻量仲裁、限流、顺序控制和反循环保护。

## 2. 核心原则

- 每个 Agent 独立接收同一个群聊事件。
- 每个 Agent 独立运行轻量 `intent path`。
- 每个 Agent 独立返回 `SpeakIntent`。
- 轻量仲裁层从所有意图中选出本轮发言者。
- 只有入选 Agent 会收到 `ReplyTask` 并进入重回复链路。

## 3. 发言轮次模型

### 3.1 默认轮次

群聊中的一条用户消息，默认只触发一轮主要发言：

- 第 1 位 Agent：主回应者
- 第 2 位 Agent：补充回应者
- 第 3 位 Agent：可选延迟跟进者

推荐默认上限：

- 正常情况：`2-3` 位 Agent
- 高热场景：最多 `4` 位 Agent
- 极端情况下允许仅 `1` 位 Agent 发言，以保护体验和延迟

### 3.2 Follow-up 轮次

若前一位 Agent 的发言明确引发自然接话，可追加一轮简短 follow-up，但必须满足：

- follow-up 轮次总数受硬上限限制。
- 同一 Agent 不允许短时间内连续占用多个 follow-up 名额。
- 当用户插入新消息时，旧 follow-up 自动过期。

## 4. `SpeakIntent` 定义

`SpeakIntent` 是 Agent 针对一次群聊事件提交的轻量发言申请。

建议字段：

```json
{
  "agent_id": 12,
  "conversation_id": 88,
  "event_id": "evt_20260319_001",
  "want_to_speak": true,
  "priority_score": 0.86,
  "confidence": 0.79,
  "reason_tag": "high_relevance",
  "topic_tags": ["电影", "吐槽"],
  "suggested_delay_ms": 1200,
  "estimated_cost": "low",
  "cooldown_penalty": 0.15,
  "duplicate_risk": 0.20,
  "generated_at": "2026-03-19T16:00:00"
}
```

### 4.1 必需字段语义

- `agent_id`：提交意图的 Agent。
- `conversation_id`：所属会话。
- `event_id`：对应的群聊事件。
- `want_to_speak`：是否想发言。
- `priority_score`：综合得分，供仲裁层排序。
- `reason_tag`：为什么想说，便于调试和埋点。
- `suggested_delay_ms`：建议多久后发言，更符合角色气质。
- `duplicate_risk`：与其他候选发言重复的概率估计。

### 4.2 建议 `reason_tag`

- `mentioned`
- `high_relevance`
- `relationship_trigger`
- `proactive_followup`
- `cooldown_blocked`
- `low_confidence_skip`
- `duplicate_risk_high`

## 5. `ReplyTask` 定义

`ReplyTask` 是仲裁层批准后的正式执行任务，表示“你可以开始说话了”。

建议字段：

```json
{
  "task_id": "reply_001",
  "agent_id": 12,
  "conversation_id": 88,
  "event_id": "evt_20260319_001",
  "turn_index": 1,
  "reply_mode": "group_reply",
  "start_after_ms": 0,
  "reply_budget": "normal",
  "allow_rag": false,
  "allow_tools": false,
  "allow_skills": false,
  "max_steps": 4,
  "cancel_if_stale": true,
  "depends_on_agent_id": null
}
```

### 5.1 字段语义

- `turn_index`：本轮第几个说。
- `start_after_ms`：多久后启动，用于错峰。
- `reply_budget`：本轮允许的复杂度。
- `allow_rag` / `allow_tools` / `allow_skills`：能力许可开关。
- `cancel_if_stale`：如果话题过期是否自动取消。
- `depends_on_agent_id`：是否依赖某位 Agent 的先发内容。

## 6. 仲裁规则

### 6.1 选择规则

仲裁层的目标不是“找最聪明的 Agent”，而是“找最适合这轮说话的 Agent 组合”。

建议排序因子：

1. `want_to_speak` 必须为 `true`
2. `priority_score` 越高越优先
3. `cooldown_penalty` 越低越优先
4. `duplicate_risk` 越低越优先
5. 最近说太多的 Agent 需降权

### 6.2 去重规则

若两个 Agent 的意图高度相似，应优先保留：

- 关系更强的
- 角色更鲜明的
- 更符合当前对话氛围的

### 6.3 名额控制

本轮发言者数量取决于：

- 话题热度
- 群成员数量
- 当前群聊拥挤度
- 首响性能预算

默认：

- `max_speakers = 3`

## 7. 错峰策略

### 7.1 首响优先

用户体验第一优先级是第一个 Agent 尽快开始流式输出。

建议目标：

- Intent 收集：`200-500ms`
- 首个 Agent 首包：`< 1500ms`

### 7.2 错峰建议

- 第 1 位 Agent：`start_after_ms = 0`
- 第 2 位 Agent：`800-2000ms`
- 第 3 位 Agent：`2000-4000ms`

角色越偏沉稳、观察者、吐槽型，越适合稍后接话。

## 8. 超时与取消

### 8.1 Intent 超时

- 超时 Agent 视为本轮不发言。
- 不允许等待单个慢 Agent 拖累整个群聊首响。

### 8.2 Reply 取消

以下情况可取消：

- 新用户消息到来。
- 当前话题已被前序 Agent 完整收束。
- 群聊已进入过热状态。
- 任务尚未开始流式输出且已过期。

### 8.3 能力降级

若 Reply Path 中：

- RAG 超时
- MCP 超时
- skill 调用失败

则应降级为：

- 纯记忆回复
- 纯人格回复
- 简短兜底回复

## 9. 反循环机制

为了避免 Agent 之间无限互聊，系统必须有以下限制：

- 每轮 follow-up 数量上限。
- 同一 Agent 在短时间内的连续发言上限。
- 对“被其他 Agent 触发”的回复设置更高阈值。
- 用户长时间不插话时，Agent-Agent 对话必须被主动收束。

## 10. 观测指标

建议埋点：

- `intent_collection_latency_ms`
- `first_agent_start_latency_ms`
- `avg_selected_agents_per_round`
- `duplicate_filtered_count`
- `reply_cancelled_count`
- `follow_up_round_count`
- `group_chat_loop_prevented_count`

这些指标将直接帮助判断群聊是否足够像真人，同时是否失控。

## 11. 第一阶段裁剪范围

第一阶段只落地：

- `SpeakIntent`
- `ReplyTask`
- 轻量仲裁
- 错峰回复
- 基础超时与取消

暂不落地：

- 高级社交关系驱动 follow-up
- 情绪链式传播
- 多轮 Agent 自治辩论
- 复杂 skills / MCP 接话策略

这样可以先保证最小可用、低延迟、可观测，再逐步升级群聊智能度。
