# ChatTable 架构重构设计（微信式 IM + AutoGen）

日期：2026-03-15  
范围：后端一期重构（保持现有前端 API/WebSocket 兼容）

## 1. 目标与原则

- 以 AutoGen 原生多 Agent 能力作为对话核心，避免重复造轮子。
- 采用“模块化单体 + 清晰分层”，先提升可维护性与可测试性。
- 保持 `/api/v1/*` 和现有 WebSocket 事件协议兼容，降低迁移风险。
- 一期即支持多租户（用户单租户模型）和生产级存储能力。

## 2. 六层架构（单体内模块化落地）

1. 客户端层（类微信体验）
- 聊天界面、Agent 配置、会话列表、消息状态展示。
- 继续使用当前前端，不做破坏性改动。

2. 统一网关层（多租户核心）
- 统一鉴权、租户上下文注入（`tenant_id/user_id/request_id`）。
- 路由分发、限流、安全过滤、审计日志。

3. 核心 IM 业务层（微信式 IM 逻辑）
- 用户与会话管理、消息落地、状态同步、离线消息。
- 与具体 AI 引擎解耦，通过引擎接口调用。

4. AutoGen 多 Agent 引擎层（核心）
- 每个 `tenant_id + conversation_id` 对应一个 GroupChat Runtime。
- 统一支撑单聊/群聊/辩论：`GroupChat + GroupChatManager`。
- 处理发言规则、流式输出、人机打断、会话恢复。

5. 扩展能力层（RAG/MCP/插件）
- 将 RAG/MCP/插件统一封装为 AutoGen Tool。
- 以 Tool Registry 形式注册，供引擎层按需调用。

6. 统一存储层
- 业务数据：租户、用户、Agent、会话、消息、配置。
- 引擎数据：AutoGen Checkpoint（会话状态快照）。
- 缓存与分布式协作：Redis。

## 3. 关键模块设计

### 3.1 引擎生命周期管理
- 创建、恢复、暂停、销毁会话 Runtime。
- 会话不活跃时持久化并释放内存，重入时恢复。

### 3.2 Agent 实例管理
- 将数据库中的 Agent 配置映射为 `ConversableAgent`。
- 支持每个 Agent 独立 `llm_config`、工具与模型参数。

### 3.3 群聊规则管理
- 使用 `speaker_selection_func` 管控发言顺序。
- 支持普通群聊、@提及优先、辩论轮次上限等策略。

### 3.4 人机交互控制
- 支持用户随时插话、取消、终止当前运行回合。
- 用户输入优先级高于自动轮次执行。

### 3.5 流式输出适配
- 引擎 token 流式回调透传到 WebSocket。
- 保持现有事件结构兼容（`agent_thinking`、`agent_message_chunk`、`agent_done`）。

## 4. 渐进迁移方案

### Phase 1（先聊天链路）
- 新增网关上下文中间件与租户强制过滤。
- 新建 IM 应用服务与 AutoGen 引擎适配层。
- 将当前聊天编排逐步从 `chat_handler` 切换到新引擎层（灰度开关）。

### Phase 2（迁移 CRUD）
- Agent/Provider/Conversation/Message 迁入应用服务层。
- Repository 只做持久化，业务规则上收至服务层。

### Phase 3（收口与清理）
- 清理旧编排路径与重复逻辑。
- 补齐集成测试、性能基线和可观测性指标。

## 5. 数据库选型：MySQL vs PostgreSQL

结论：**本项目更推荐 PostgreSQL（优先）**。

### PostgreSQL 更适配的原因
- 多租户与复杂查询能力强，SQL 表达力更高。
- `JSONB` 适合 Agent 配置、工具元数据、扩展字段。
- 生态更适合 AI 场景（如 `pgvector`，后续 RAG 可平滑接入）。
- 事务、并发控制和可观测能力在复杂业务下更稳。
- 对会话状态、审计日志、规则配置等半结构化数据更友好。

### MySQL 何时更合适
- 团队已有成熟 MySQL 运维体系且业务模型相对简单。
- 更偏传统 OLTP，JSON/向量检索需求较弱。

### 最终建议
- 一期采用：**PostgreSQL + Redis**。  
- 保留 ORM 抽象，确保后续必要时可迁移数据库实现。

## 6. 一期验收标准

- 前端不改代码，核心聊天流程可用。
- API 与 WebSocket 协议保持兼容。
- 会话可恢复、租户严格隔离、错误可追踪。
- 核心链路具备单元测试与集成测试覆盖。
