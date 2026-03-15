# ChatTable 优化计划

## 一、架构质量

### 1. 拆分 main.py 的 WebSocket 巨型函数

现状：`main.py` 410 行，所有 WebSocket 逻辑（消息保存、Agent 编排、流式回复、记忆管理）都塞在一个函数里，`stream_agent_reply` 作为闭包嵌套在里面，依赖外层变量。

优化：抽出 `app/core/chat_handler.py`，把消息处理、Agent 编排、流式回复拆成独立方法。main.py 只负责 WebSocket 连接管理和事件分发。

效果：每个模块职责清晰，可以单独测试，新增消息类型不用在 400 行函数里找位置。

### 2. DB Session 生命周期管理

现状：WebSocket handler 里用 `with Session(engine) as db` 手动创建 session，且在 `stream_agent_reply` 闭包中复用外层 db，并发 `asyncio.gather` 多个 agent 共享同一个 session，存在线程安全隐患。

优化：每个 agent reply 任务创建独立 session，或者用 async session + connection pool。

效果：消除并发写入冲突风险，避免 session 脏读。

### 3. 决策引擎调用 LLM 的开销

现状：`DecisionEngine.calculate_relevance()` 每条群聊消息对每个 agent 都调一次 LLM 来判断相关度，N 个 agent 就是 N 次 API 调用，成本高、延迟大。

优化：改用本地规则引擎（关键词匹配 + agent 技能/标签匹配 + 简单 embedding 相似度），只在规则无法判断时才 fallback 到 LLM。

效果：群聊响应速度从 N×LLM延迟 降到近乎即时，API 成本大幅降低。

---

## 二、功能完善

### 4. 对话历史上下文

现状：每次 agent 回复只拿到当前一条用户消息 + memory_manager 构建的摘要/最近消息。但 memory 上下文是以纯文本拼接的，没有按 LLM 的 messages 格式（role: user/assistant 交替）传入，LLM 无法正确理解多轮对话。

优化：把历史消息按标准 messages 数组格式传给 LLM（system → 历史 user/assistant 交替 → 当前 user），支持可配置的上下文窗口大小。

效果：Agent 能真正记住上下文，多轮对话连贯性大幅提升。

### 5. 消息操作（重新生成 / 删除）

现状：消息发出后不可操作，agent 回复不满意只能重新发一遍。

优化：
- 重新生成：前端加 "重新生成" 按钮，WebSocket 新增 `regenerate` 事件，后端删除最后一条 agent 消息并重新调用 LLM
- 删除：支持删除单条消息

效果：用户对 agent 回复有更多控制权，体验接近主流 AI 聊天产品。

### 6. 会话管理增强

现状：没有删除会话、重命名会话的功能。SessionList 没有显示最后一条消息预览和未读状态。

优化：增加会话删除/重命名 API 和前端操作，SessionList 显示最后消息摘要和时间。

效果：会话列表从"能用"变成"好用"。

---

## 三、性能与稳定性

### 7. WebSocket 错误恢复

现状：agent 流式回复出错时，前端 thinking 状态可能卡住（error 事件没带 agent_id 时无法清除对应 thinking 状态）。后端 `stream_agent_reply` 异常只发了 error 消息，没有发 `agent_done` 来终结流。

优化：错误时也发送 `agent_done`（带 error 标记），前端统一在 `agent_done` 中清理状态。

效果：不会再出现 "永远在思考" 的卡死状态。

### 8. 流式消息去重

现状：`agent_done` 时 addMessage 添加完整消息，但如果 streaming 消息还没清理干净，可能短暂出现重复内容。

优化：`agent_done` 处理时先确保清除对应 streaming 状态再 addMessage，用 React batch update 保证原子性。

效果：消息切换更丝滑，无闪烁。

### 12. 应用层内存缓存

现状：每次 WebSocket 消息处理都从 DB 查询 Agent、Provider 数据，`memory_manager.build_context` 每次都查库取最近消息。这些数据变化频率很低，但查询频率很高。

优化（不需要引入 Redis，用 Python 内置数据结构即可）：
- Agent / Provider 缓存：用 `dict` + TTL（60秒过期）缓存，CRUD 操作时主动失效。DB 查询减少 90%
- 对话消息队列：内存中维护 per-conversation 的消息 deque，新消息 append，不用每次 build_context 都查库
- 决策引擎结果：同一个 agent 对相似消息的相关度判断可以短期缓存（30秒），避免群聊中重复 LLM 调用

效果：减少大量重复 DB 查询，WebSocket 消息处理延迟降低，且不引入外部依赖。

### 关于 SQLite

结论：当前阶段完全够用，不需要换。

理由：ChatTable 是单用户本地应用，只有一个 uvicorn 进程，不存在多进程并发写入。SQLite 的瓶颈是写锁竞争，但这个场景下写入量很小。SQLite 的零配置、单文件、部署简单的优势对这个项目很合适。

什么时候该考虑换：如果未来做多用户在线部署、消息量到十万级以上、或者需要全文搜索（FTS 虽然 SQLite 也支持但体验不如 PG），再考虑迁移到 PostgreSQL。SQLModel 的好处是切换数据库只需要改连接字符串。

---

## 四、用户体验

### 9. Markdown 渲染

现状：消息内容用纯文本 `<span>` 显示，agent 返回的代码块、列表、加粗等 markdown 格式全部丢失。

优化：引入 `react-markdown` + `rehype-highlight`，agent 消息用 Markdown 渲染，用户消息保持纯文本。

效果：代码高亮、列表、表格等正常显示，阅读体验质的飞跃。

### 10. 流式打字效果优化

现状：streaming 消息直接拼接显示，没有光标动画，大段文字突然出现。

优化：streaming 消息末尾加闪烁光标指示器，chunk 到达时有平滑过渡。

效果：视觉上更像"正在打字"，体验更自然。

### 11. 空状态与引导

现状：没有 agent 时联系人页面空白，没有会话时聊天页只有一个 emoji。

优化：设计空状态插画和引导文案（"创建你的第一个 AI 朋友"），首次使用引导流程。

效果：新用户不会迷茫，产品感更完整。

---

## 优先级建议

| 优先级 | 项目 | 理由 |
|--------|------|------|
| P0 | #4 对话历史上下文 | 当前 agent 几乎没有多轮记忆，是最影响核心体验的问题 |
| P0 | #7 WebSocket 错误恢复 | 卡死 bug 直接影响可用性 |
| P1 | #9 Markdown 渲染 | 投入小收益大，体验提升明显 |
| P1 | #1 拆分 main.py | 后续所有功能开发都依赖更好的代码组织 |
| P1 | #3 决策引擎优化 | 群聊场景下成本和延迟问题突出 |
| P1 | #12 应用层内存缓存 | 零依赖，减少 90% 重复 DB 查询，对群聊性能提升明显 |
| P2 | #2 DB Session 管理 | 目前并发量不大暂时没出问题，但是隐患 |
| P2 | #5 消息重新生成 | 常见需求，提升交互控制感 |
| P2 | #6 会话管理增强 | 完善基础功能 |
| P3 | #8 流式去重 | 小优化 |
| P3 | #10 打字效果 | 锦上添花 |
| P3 | #11 空状态引导 | 锦上添花 |
