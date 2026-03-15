# ChatTable 前后端并行开发共享文档（多租户 + AutoGen）

更新时间：2026-03-15  
目标：后端与前端并行开发，避免接口反复变更

## 1. 当前状态（后端）

- 数据库已切换到 PostgreSQL（不再使用 SQLite 作为运行库）
- Redis 已接入（运行态索引）
- 聊天引擎支持开关：
  - `CHAT_ENGINE=legacy`
  - `CHAT_ENGINE=autogen`（当前默认）
- AutoGen 已接入：
  - `AssistantAgent + RoundRobinGroupChat`
  - 流式 chunk 事件输出
  - 会话状态持久化到 `autogen_checkpoints`
- 多租户第一阶段已完成：
  - 核心表均有 `tenant_id`
  - Repository/Service/WebSocket 关键路径按租户过滤
  - 未传租户头时默认 `tenant_id=local`
- 多租户第二阶段（本次）已完成：
  - 已创建租户相关复合索引（查询性能优化）
  - 已新增审计表 `audit_logs`
  - Agent/Provider/Conversation/Settings 写操作会记录审计日志

## 2. 前后端契约（必须对齐）

### 2.1 租户头

- 前端所有 HTTP 请求和 WebSocket 连接都应携带：
  - `X-Tenant-Id: <tenant-id>`
- 现阶段可先固定一个值（例如 `local` / `team-a`）
- 不传时后端会回落到 `local`，仅用于兼容，不建议长期依赖

### 2.2 HTTP 接口

- 仍保持现有路径：
  - `/api/v1/agents`
  - `/api/v1/providers`
  - `/api/v1/conversations`
  - `/api/v1/conversations/{id}/messages`
  - `/api/v1/settings`
- 对前端的响应结构保持兼容（无需大改）

### 2.3 WebSocket 事件（保持不变）

- 入站：
  - `user_message`
  - `set_length`
  - `clear`
  - `pong`
- 出站：
  - `user_message`
  - `agent_thinking`
  - `agent_message_chunk`
  - `agent_done`
  - `length_set`
  - `topic_switched`
  - `cleared`
  - `ping`

## 3. 并行分工

### 3.1 后端（我负责）

- 继续完善多租户后续阶段：
  - 增加更多跨租户访问告警与审计检索接口
- 增强 AutoGen 引擎稳定性：
  - checkpoint 失效恢复策略
  - 更细粒度异常分类
- 提供联调脚本和最小验收用例

### 3.2 前端（你开新线程负责）

- 抽象统一请求层：
  - 自动附加 `X-Tenant-Id`
  - HTTP + WebSocket 一致注入
- 增加租户切换能力（先简版）：
  - 本地持久化当前 tenant
  - 切换后刷新会话/Agent 列表
- 保持现有页面结构，优先稳定联调

## 4. 联调检查清单

1. 同一账号下，`tenant-a` 与 `tenant-b` 看不到彼此 Agent/会话/消息。  
2. `CHAT_ENGINE=autogen` 时，WebSocket 能持续收到 `agent_message_chunk`。  
3. 服务重启后，同一会话可继续（`autogen_checkpoints` 有更新）。  
4. `/api/v1/settings` 在不同 tenant 下互不影响。  
5. 前端未传 `X-Tenant-Id` 时仍可用（默认落 `local`，仅兼容）。
6. 执行写操作后，`audit_logs` 可看到对应审计记录（按 tenant 隔离）。

## 5. 启动与联调命令

后端：

```bash
cd backend
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

前端：

```bash
cd frontend
npm run dev
```

## 6. 风险提醒

- 当前 `ENCRYPTION_KEY` 必须与已加密 provider 数据一致，否则会出现 `InvalidToken`。
- 现阶段是“请求头租户隔离”，未接完整登录态与 token 解析，属于可运行但非最终安全形态。

## 7. 前端进度同步（2026-03-15）

- 已完成：统一 HTTP 请求层，前端所有请求自动附加 `X-Tenant-Id`。
- 已完成：新增前端租户状态与本地持久化（默认 `local`）。
- 已完成：设置页增加简版租户切换入口（Apply 后触发前端状态切换）。
- 已完成：租户切换后自动刷新 Agent / 会话 / Provider 数据，并清空当前聊天上下文选择。
- 已完成：WebSocket 连接统一注入 tenant 标识（`?tenant_id=<id>`）。
- 联调备注：浏览器原生 WebSocket 无法直接自定义 `X-Tenant-Id` Header，当前前端通过 query 参数传递 tenant，若后端仅从 Header 取租户，需要后端在 WebSocket 入口兼容 query 参数读取。
