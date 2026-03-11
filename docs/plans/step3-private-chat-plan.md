# Step 3: 私聊基础功能实现计划

## 目标
实现用户与单个 Agent 的私聊功能，包括发送消息、Agent 流式回复、思考状态显示。

## 后端任务

### 1. 数据模型 (backend/app/models/)

#### 1.1 Conversation 模型 (conversation.py)
```python
- id: int (主键)
- type: str (private/group)
- name: str (会话名称)
- members: str (JSON 字符串，存储 agent_id 列表)
- last_message_at: datetime
- created_at: datetime
```

#### 1.2 Message 模型 (message.py)
```python
- id: int (主键)
- conversation_id: int (外键)
- sender_type: str (user/agent)
- sender_id: int (可选，agent 的 id)
- content: str (消息内容)
- created_at: datetime
```

### 2. API 端点 (backend/app/api/)

#### 2.1 会话 API (conversations.py)
- POST /api/v1/conversations - 创建会话
- GET /api/v1/conversations - 获取会话列表
- GET /api/v1/conversations/{id} - 获取会话详情
- GET /api/v1/conversations/{id}/messages - 获取消息历史

#### 2.2 消息 API (messages.py)
- POST /api/v1/conversations/{id}/messages - 发送消息（触发 Agent 回复）

### 3. LLM 集成 (backend/app/services/)

#### 3.1 LLM 服务 (llm_service.py)
- 集成 LiteLLM
- 实现流式调用
- 处理 API key 解密
- 错误处理

### 4. WebSocket 增强 (backend/app/main.py)
- 处理 user_message 事件
- 触发 Agent 回复
- 推送 agent_thinking 事件
- 推送流式 agent_message 事件
- 推送 agent_done 事件
- 保存消息到数据库

## 前端任务

### 1. 数据模型和 Store (frontend/src/)

#### 1.1 类型定义 (types/index.ts)
```typescript
- Conversation 接口
- Message 接口
- MessageSender 类型
```

#### 1.2 会话 Store (stores/conversationStore.ts)
- 会话列表管理
- 消息列表管理
- 发送消息
- WebSocket 连接管理

### 2. UI 组件 (frontend/src/components/)

#### 2.1 ChatArea 组件
- 消息列表显示
- 自动滚动到底部
- 用户消息气泡（右侧，绿色）
- Agent 消息气泡（左侧，白色）
- Agent 思考中状态（三点动画）

#### 2.2 MessageInput 组件
- 文本输入框
- 发送按钮
- Enter 发送，Shift+Enter 换行

### 3. 页面更新 (frontend/src/pages/)

#### 3.1 ContactsPage 优化
- 点击 Agent 卡片创建/打开私聊
- 跳转到聊天界面

#### 3.2 ChatPage 新建
- 三栏布局（导航栏、会话列表、聊天区）
- 集成 ChatArea 和 MessageInput
- WebSocket 连接管理

## 实现顺序

### Phase 1: 后端基础 (30 分钟)
1. 创建 Conversation 和 Message 模型
2. 实现数据库迁移
3. 创建会话和消息 API 端点
4. 测试 API

### Phase 2: LLM 集成 (45 分钟)
1. 安装 litellm 依赖
2. 创建 llm_service.py
3. 实现基础调用（非流式）
4. 实现流式调用
5. 测试 LLM 调用

### Phase 3: WebSocket 增强 (30 分钟)
1. 更新 WebSocket 处理逻辑
2. 实现消息接收和 Agent 回复触发
3. 实现流式消息推送
4. 测试 WebSocket 通信

### Phase 4: 前端 Store (30 分钟)
1. 创建类型定义
2. 创建 conversationStore
3. 实现 WebSocket 客户端
4. 测试 Store 功能

### Phase 5: 前端 UI (60 分钟)
1. 创建 ChatArea 组件
2. 创建 MessageInput 组件
3. 创建 ChatPage
4. 更新 ContactsPage
5. 测试 UI 交互

### Phase 6: 集成测试 (30 分钟)
1. 端到端测试
2. 修复 bug
3. 优化用户体验

## 验收标准

- [ ] 可以创建与 Agent 的私聊会话
- [ ] 可以发送消息给 Agent
- [ ] Agent 显示"思考中"状态
- [ ] Agent 以流式方式回复消息
- [ ] 消息正确保存到数据库
- [ ] 刷新页面后消息历史保留
- [ ] WebSocket 断线自动重连
- [ ] 错误处理友好

## 技术要点

1. **流式输出**: LiteLLM stream=True，逐 token 推送
2. **消息存储**: 流式完成后保存完整消息
3. **WebSocket 事件**: agent_thinking → agent_message (多次) → agent_done
4. **自动滚动**: 新消息时滚动到底部
5. **API Key 安全**: 后端解密后使用，不传给前端
