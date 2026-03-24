# 2026-03-19 线程沟通共享文档

## 1. 目的

本文档用于作为 **B / C / D 线程与 A 线程（主线程 / 后端核心）之间的共享沟通面板**。

用途只有 3 个：

- 让 B / C / D 知道该怎么把需求发给 A
- 让 A 明确当前接收到了哪些需求
- 让所有线程看到哪些问题已经确认、哪些问题还在等待

本文件是**沟通入口**，不是详细设计文档。  
详细设计、实现计划、协议文档可以在其他 md 中展开，但入口统一收敛到这里。

## 2. 当前线程角色

### 线程 A

- 角色：主线程 / 后端核心
- 负责人：Codex 主线程
- 范围：
  - LangGraph runtime
  - scheduler
  - persistence
  - RAG / MCP / skills 接点
  - WebSocket / 接口协议收口
  - 最终验证与集成判断

### 线程 B

- 角色：前端 UI
- 关注：
  - 页面布局
  - 聊天体验
  - 多 Agent 接话呈现
  - 主动消息表现

### 线程 C

- 角色：前端新功能 / 需求整理
- 关注：
  - 新功能定义
  - 页面交互变化
  - 需要后端支持的新能力

### 线程 D

- 角色：协议 / 联调 / 验证
- 关注：
  - 接口字段
  - WebSocket 事件
  - 联调验证
  - 回归问题收敛

## 3. 沟通原则

- B / C / D 不直接改 A 负责的核心后端文件。
- B / C / D 如需后端支持，先把需求记录到本文档。
- A 看到后会：
  - 判断是否需要实现
  - 判断优先级
  - 判断属于接口、事件、状态、调度还是能力接点
- 复杂需求可以在本文档登记后，再单独展开到专门设计文档。

## 4. 推荐沟通方式

最推荐的方式是：

1. 先在本文档里新增一条需求记录
2. 再把这条需求直接贴给 A 线程
3. 如果需要补充，再附上截图、交互描述或详细 md 路径

这样做的好处：

- 所有线程都能看到当前排队中的后端需求
- 不会只停留在聊天窗口里
- 后续容易追踪和收口

## 5. B / C / D 给 A 提需求模板

请尽量按下面模板填写：

```md
### [REQ-编号] 需求标题

- 来源线程：B / C / D
- 优先级：P0 / P1 / P2
- 状态：open
- 页面/功能：
- 用户动作：
- 前端期望：
- 需要后端提供：
  - 接口：
  - WebSocket 事件：
  - 字段：
- 是否阻塞前端：是 / 否
- 备注：
```

## 6. A 线程状态字段说明

当 A 线程处理需求时，统一使用这些状态：

- `open`：刚提出，尚未分析
- `triaged`：已分析，待实现或待补充信息
- `in_progress`：A 正在实现
- `blocked`：缺少信息或依赖
- `done`：已完成
- `wont_do_now`：当前阶段暂不做

## 7. 当前需求看板

> 说明：后续 B / C / D 线程可以直接在这里追加。

### [REQ-001] 示例：群聊里展示“主动消息”标记

- 来源线程：C
- 优先级：P1
- 状态：open
- 页面/功能：群聊消息列表
- 用户动作：用户进入会话后查看最近消息
- 前端期望：主动发起的 Agent 消息要和被动回复消息区分展示
- 需要后端提供：
  - 接口：无
  - WebSocket 事件：现有消息事件即可，或新增消息元字段
  - 字段：例如 `message_origin=proactive|reply`
- 是否阻塞前端：否
- 备注：这是一个模板示例，真实需求请按同格式追加



### 线程 C 当前梳理结论（2026-03-19）
- 建议当前排期顺序：`REQ-004` → `REQ-002` → `REQ-003` → `REQ-005`
- 阻塞前端继续推进：`REQ-004`
- 不阻塞前端继续推进：`REQ-002`、`REQ-003`、`REQ-005`

### [REQ-004] Dispatcher 调试信息查询接口
- 来源线程：C
- 优先级：P1
- 状态：open
- 页面/功能：调试页 / `ChatPage` 调度调试面板
- 用户动作：查看最近一次或最近若干次 dispatcher / planner 决策
- 前端期望：不仅在开发态 WebSocket 会话中看到实时摘要，还能在独立调试页拉取最近记录并查看失败原因
- 需要后端提供：
  - 接口：新增 recent dispatcher summaries / debug history 查询接口
  - WebSocket 事件：现有 `dispatcher_summary` 可继续保留
  - 字段：`plan_id`、`selected_agents`、`reason_tag`、`execution_graph`、`planner_output_preview`、`failure_type`、`latency_ms`、`message_id`、`created_at`
- 是否阻塞前端：是
- 备注：如果只保留当前开发态浮层，前端还能继续；但要做真正可用的调试页 / 历史视图，需要后端查询能力

### [REQ-002] Agent 配置字段回传与归一化
- 来源线程：C
- 优先级：P1
- 状态：open
- 页面/功能：`CreateAgentModal` / `AgentDetailSidebar`
- 用户动作：创建 Agent、编辑 Agent 的 `skills` / `tags` / `personality` / `background`
- 前端期望：前端提交后的 `skills` / `tags` 在保存后能被后端稳定回传，刷新后仍能正确显示为标签；历史脏数据不会导致详情页空白或解析失败
- 需要后端提供：
  - 接口：沿用 `/api/v1/agents` 的 `POST` / `PATCH` / `GET`
  - WebSocket 事件：无
  - 字段：`skills`、`tags` 至少保证可稳定返回；如可行，补充 `skills_list`、`tags_list` 这类结构化字段，或由后端统一归一化
- 是否阻塞前端：否
- 备注：当前前端已可继续推进，先按 JSON 数组字符串兼容；该需求主要用于收口数据一致性与历史数据兼容

### [REQ-003] Provider 模型能力与连通性校验
- 来源线程：C
- 优先级：P1
- 状态：open
- 页面/功能：`SettingsPage` / `CreateAgentModal` / `AgentDetailSidebar`
- 用户动作：配置 provider、选择 model、保存 Agent 或优化器配置
- 前端期望：可在前端展示 provider 是否可用、当前 provider 支持哪些模型、模型与 provider 不匹配时给出明确原因
- 需要后端提供：
  - 接口：新增 provider health/capabilities 查询接口，或扩展 `/api/v1/providers` 与 `/api/v1/settings`
  - WebSocket 事件：无
  - 字段：`provider_status`、`supported_models`、`last_validation_error`、`last_validated_at`
- 是否阻塞前端：否
- 备注：不阻塞界面继续做，但会阻塞真实可用性校验和更友好的错误提示

### [REQ-005] Persona 生成 / Prompt 优化错误码与返回结构收口
- 来源线程：C
- 优先级：P2
- 状态：open
- 页面/功能：`CreateAgentModal`
- 用户动作：点击“AI 生成人设”或“AI 优化 Prompt”
- 前端期望：前端能区分“未配置 provider / API key”“模型不可用”“服务端限流 / 失败”等错误，并稳定拿到可直接回填表单的字段
- 需要后端提供：
  - 接口：沿用 `/api/v1/agents/generate` 与 `/api/v1/agents/optimize-prompt`
  - WebSocket 事件：无
  - 字段：稳定返回 `name`、`description`、`personality`、`background`、`skills`、`tags`、`system_prompt`；错误时返回可区分的 `error_code`
- 是否阻塞前端：否
- 备注：当前前端可以先用通用错误文案继续推进，该需求用于提升可诊断性与表单回填稳定性

## 8. 待补充信息区

如果某条需求信息不足，A 线程会在这里追问。

格式建议：

```md
### [REQ-编号] 需要补充

- 缺少：
- 需要谁补：
- 当前结论：
```

## 9. 已完成需求归档区

当 A 完成某个需求后，可以把简短结论移到这里。

格式建议：

```md
### [REQ-编号] 已完成

- 完成时间：
- 完成内容：
- 相关文件：
- 是否需要前端联调：
```

## 10. 与其他文档的关系

本文件只负责“沟通入口”。  
相关文档如下：

- 总协作规则：`docs/plans/2026-03-19-multi-thread-development-guide.md`
- 后端 LangGraph 设计：`docs/plans/2026-03-19-langgraph-agent-runtime-design.md`
- 后端实施计划：`docs/plans/2026-03-19-langgraph-agent-runtime-implementation-plan.md`
- 群聊协议：`docs/plans/2026-03-19-group-chat-speaking-protocol.md`

如果某个需求变复杂，应该：

- 先登记到本文档
- 再根据需要拆到更详细的设计文档

## 11. 给 B / C / D 的一句话

如果你需要线程 A 帮你补后端功能，请：

- 不要直接口头说“后端配合一下”
- 按模板写清楚页面、动作、前端期望、后端需要提供的内容
- 把需求追加到本文档
- 然后把需求内容直接发给 A 线程

这样效率最高，也最不容易返工。
