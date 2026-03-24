# 2026-03-19 多线程开发协作指南

## 1. 目标

本文档用于作为 ChatTable 当前阶段的**共享协作文档**。  
后续新开的线程、worktree、分支、需求交接、联调方式，都以本文档为统一约束。

当前策略：

- 采用 **主线程 + 多执行线程** 模式。
- 主线程负责统一决策、拆任务、维护协议、收口集成。
- 每个执行线程使用**独立 worktree + 独立分支**。
- 不允许多个线程直接共用同一个 worktree。

## 2. 主线程职责

主线程职责固定如下：

- 维护整体架构方向。
- 维护后端 LangGraph 主线设计与核心实现。
- 负责前后端协议收口。
- 负责线程之间的需求翻译与任务拆分。
- 负责最终验证、集成、合并时机判断。
- 维护本文档与关键协作文档。

主线程不一定写最多代码，但必须是**唯一的全局协调入口**。

## 3. 当前已知主工作区

### 3.1 主仓库目录

- `D:\ChatTable`

### 3.2 当前后端 LangGraph worktree

- 分支：`feature/langgraph-agent-runtime`
- 路径：`D:\ChatTable\.worktrees\langgraph-agent-runtime`

说明：

- 该 worktree 当前承载后端 LangGraph 主线开发。
- 后续需要后端新功能时，优先在这个 worktree 继续推进。

## 4. 线程组织建议

在**不考虑成本**前提下，建议当前阶段采用 4 条主线线程。

### 线程 A：主线程 / 后端核心

职责：

- LangGraph runtime
- scheduler
- persistence
- RAG / MCP / skills 接点
- WebSocket 协议收口
- 最终验证

建议：

- 继续使用 `feature/langgraph-agent-runtime`
- 继续使用 `D:\ChatTable\.worktrees\langgraph-agent-runtime`

### 线程 B：前端 UI 线程

职责：

- 页面结构
- 聊天体验
- 多 Agent 接话表现
- 主动消息 UI
- Agent 状态展示

建议分支名：

- `feature/frontend-chat-ui`

建议 worktree：

- `D:\ChatTable\.worktrees\frontend-chat-ui`

### 线程 C：前端新功能线程

职责：

- 新页面功能
- Agent 配置页增强
- 设置页、调试页、辅助交互

建议分支名：

- `feature/frontend-agent-features`

建议 worktree：

- `D:\ChatTable\.worktrees\frontend-agent-features`

### 线程 D：协议 / 联调 / 验证线程

职责：

- 整理接口契约
- 整理 WebSocket 事件
- 联调验证
- 记录 bug 与待决策问题

建议分支名：

- `feature/integration-protocol`

建议 worktree：

- `D:\ChatTable\.worktrees\integration-protocol`

## 5. 线程边界规则

### 5.1 必须遵守

- 一个线程只操作一个 worktree。
- 一个线程只负责自己明确的模块范围。
- 未经主线程确认，不修改其他线程核心文件。
- 所有跨线程协作优先通过文档和明确需求完成。

### 5.2 不允许

- 多个线程同时改同一个 worktree。
- 多个线程同时改同一核心文件。
- 用口头转述替代协议文档。
- “先改了再说”式跨线程侵入。

## 6. 文件所有权建议

### 主线程优先负责

- `backend/app/modules/agents/`
- `backend/app/core/config.py`
- `backend/app/core/database.py`
- `backend/app/main.py`
- `backend/app/modules/im/application/chat_application_service.py`
- `backend/app/modules/knowledge/`
- `backend/app/modules/tools/`
- `backend/app/modules/skills/`

### 前端 UI 线程优先负责

- `frontend/src/pages/`
- `frontend/src/components/`
- `frontend/src/lib/`
- `frontend/src/stores/`

### 协议 / 联调线程优先负责

- `docs/plans/`
- 后续若新增：
  - `docs/contracts/`
  - `docs/events/`
  - `docs/open-questions/`

## 7. 新线程启动规范

每开一个新线程，建议固定做以下 5 件事：

1. 先读本文档。
2. 明确自己负责的模块范围。
3. 新建独立分支。
4. 新建独立 worktree。
5. 开始前确认不要碰主线程当前正在改的核心文件。

推荐统一命名：

- 分支：`feature/<thread-purpose>`
- worktree：`D:\ChatTable\.worktrees\<thread-purpose>`

## 8. 需求交接规范

### 8.1 给主线程提后端需求，推荐格式

建议直接用下面模板：

```md
## 需求标题

页面/功能：

用户动作：

前端期望：

需要新增：
- 接口：
- WebSocket 事件：
- 字段：

是否已有 UI：

优先级：
```

### 8.2 最推荐的交接方式

优先级如下：

1. 直接把需求复制给主线程
2. 把需求写进 md 文件，再给文件路径
3. 截图 + 文字说明

不推荐：

- 只口头描述一个模糊方向
- 让不同线程自己猜测彼此需求

## 9. 协议协作规则

前后端并行时，所有关键协议必须尽量文档化。

建议至少维护以下内容：

- 当前 REST 接口字段
- 当前 WebSocket 事件列表
- 事件 payload 示例
- 当前已确认字段
- 当前待定字段

如果需求经常变化，建议新建：

- `docs/plans/2026-03-19-frontend-backend-contracts.md`

由协议 / 联调线程持续维护。

## 10. 联调规则

联调阶段必须遵循：

- 先确认接口契约。
- 再确认前端需要的最小字段。
- 再让主线程补后端。
- 最后跑回归验证。

避免这种低效模式：

- 前端先假设一套字段
- 后端再猜一套字段
- 最后双方各改三轮

## 11. 最适合当前阶段的协作方式

结合当前项目状态，推荐采用：

- 主线程：继续推进后端 LangGraph 主线
- 前端 UI 线程：继续做界面与交互
- 前端功能线程：补页面功能和交互细节
- 协议 / 联调线程：整理需求、字段、事件、待决策问题

这 4 条线已经足够高效。

当前不推荐再无限制增加写代码线程，因为接下来最大瓶颈不是“没人写”，而是：

- 需求传递
- 接口对齐
- 联调验证
- 收口时机

## 12. 主线程决策规则

以下事项统一由主线程拍板：

- 是否改后端协议
- 是否新增 WebSocket 事件
- 是否修改核心 LangGraph runtime
- 是否合并到主线
- 是否回滚某个线程改动

这样可以避免多线程并行时架构发散。

## 13. 当前默认结论

当前阶段默认执行以下规则：

- 后端 LangGraph 主线继续保留在独立 worktree 中
- 前端线程使用新的独立 worktree 开发
- 所有新后端需求统一发给主线程
- 主线程负责把需求翻译成后端实现任务
- 在前端未完成前，不急于把 LangGraph 后端合并到主线

## 14. 给新线程的一句话说明

如果新线程需要快速理解当前协作方式，可直接给它下面这段：

```md
请先阅读 `docs/plans/2026-03-19-multi-thread-development-guide.md`。
当前项目采用“主线程 + 多执行线程”模式。
主线程负责架构、协议、后端 LangGraph 主线与最终集成。
你必须使用独立 worktree 和独立分支开发，不要与其他线程共用同一 worktree。
如果需要后端新增能力，请整理需求后交给主线程，不要直接修改主线程负责的核心后端文件。
```
