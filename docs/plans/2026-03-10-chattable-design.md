# ChatTable - AI Agent 社交聊天应用设计文档

> 设计日期：2026-03-10
> 版本：v1.0

## 1. 项目概述

### 1.1 产品定位

ChatTable 是一个以"好友"为核心概念的 AI Agent 社交聊天应用。用户可以创建多个 AI Agent 作为好友，与他们私聊或拉群聊天。每个 Agent 是独立个体，有自己的性格、记忆、知识库和模型配置。

### 1.2 产品特点

- **社交化体验**：产品感觉类似微信，温暖社交风格，不是工具管理后台
- **个性化 Agent**：每个 Agent 有独特的性格、记忆和知识库
- **智能对话**：Agent 可以根据话题相关度自主决定是否发言
- **群聊互动**：多个 Agent 可以在群聊中互相交流，形成有趣的对话
- **隐私优先**：所有数据存储在本地，不上传云端

### 1.3 部署方式

- **阶段一**：本地 Web 应用（后端运行在 localhost，前端浏览器访问）
- **阶段二**：可选打包成 Electron 桌面应用

---

## 2. 技术栈

### 2.1 前端技术栈

- **框架**：React 18+ + TypeScript
- **样式**：Tailwind CSS
- **UI 组件库**：shadcn/ui（基于 Radix UI 和 Tailwind CSS）
- **状态管理**：Zustand
- **图标**：Lucide Icons
- **图表**：Chart.js / Recharts（用于性格雷达图）
- **包管理**：npm / pnpm

### 2.2 后端技术栈

- **框架**：Python 3.10+ + FastAPI
- **ORM**：SQLModel（同时作为 ORM 和 Pydantic 模型）
- **项目管理**：uv（快速的 Python 包管理工具）
- **异步编程**：asyncio + async/await
- **定时任务**：APScheduler

### 2.3 数据库

- **关系型数据库**：SQLite（开发）→ PostgreSQL（生产可选）
- **向量数据库**：ChromaDB（本地部署）
- **嵌入模型**：BGE / sentence-transformers（本地免费模型）

### 2.4 AI 模型调用

- **统一接口**：LiteLLM（支持所有主流模型提供商）
- **支持的提供商**：
  - 国外：OpenAI、Anthropic、Google Gemini、Mistral AI、本地模型（Ollama）
  - 国内：通义千问、文心一言、ChatGLM、Kimi、豆包、混元、星火、MiniMax、百川、零一万物

### 2.5 实时通信

- **协议**：WebSocket
- **实现**：FastAPI WebSocket 支持
- **特性**：心跳检测、自动重连、流式输出

---

## 3. 数据模型设计

### 3.1 Agent 表

**表名**：`agents`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| name | String(50) | Agent 名字 |
| avatar | String(255) | 头像 URL 或路径 |
| gender | Enum | 性别：male/female/neutral |
| bio | String(200) | 一句话简介 |
| tags | JSON | 擅长领域，数组格式 |
| system_prompt | Text | 系统提示词 |
| model_name | String(100) | 模型名称 |
| api_key | String(255) | API Key（加密存储） |
| api_base | String(255) | API 端点（可选） |
| proactivity | Float | 发言主动性（0-1） |
| focus | Float | 专注度（0-1） |
| confidence | Float | 自信度（0-1） |
| social_sensitivity | Float | 社交敏感度（0-1） |
| response_speed | Enum | 反应速度：fast/medium/slow |
| default_length_level | Integer | 默认回复长度等级（1-5） |
| skills | JSON | 挂载工具，数组格式 |
| mcp_config | JSON | MCP 配置 |
| is_active | Boolean | 是否激活 |
| created_by | String(20) | 创建方式：manual/template |
| created_at | DateTime | 创建时间 |

### 3.2 Conversation 表

**表名**：`conversations`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| type | Enum | 类型：private/group |
| name | String(100) | 会话名称 |
| avatar | String(255) | 会话头像 |
| members | JSON | 成员 Agent ID 数组 |
| last_message_at | DateTime | 最后消息时间 |
| unread_count | Integer | 未读消息数（用户视角） |
| created_at | DateTime | 创建时间 |

### 3.3 Message 表

**表名**：`messages`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| conversation_id | UUID | 所属会话 ID |
| sender_type | Enum | 发送者类型：user/agent |
| sender_id | UUID | 发送者 ID（如果是 agent） |
| content | Text | 消息内容 |
| length_level | Integer | 本条消息使用的长度等级（1-5） |
| is_reply_to | UUID | 回复哪条消息 ID（可空） |
| status | Enum | 消息状态：sending/sent/failed |
| metadata | JSON | 额外信息（token 数、耗时等） |
| created_at | DateTime | 创建时间 |

### 3.4 Memory 表

**表名**：`memories`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| agent_id | UUID | 所属 Agent ID |
| conversation_id | UUID | 所属会话 ID |
| memory_type | Enum | 记忆类型：working/short_term/long_term |
| content | Text | 摘要文本 |
| importance_weight | Float | 重要性权重（0-1） |
| decay_factor | Float | 衰减因子 |
| created_at | DateTime | 创建时间 |
| last_accessed_at | DateTime | 最后访问时间 |

### 3.5 KnowledgeBase 表

**表名**：`knowledge_bases`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| agent_id | UUID | 所属 Agent ID |
| title | String(200) | 文档标题 |
| content_type | Enum | 内容类型：pdf/txt/md/url/text |
| file_path | String(500) | 文件路径 |
| scope | Enum | 作用域：private/group |
| embedding_model | String(100) | 使用的嵌入模型 |
| chunk_count | Integer | 文档分块数量 |
| status | Enum | 处理状态：processing/ready/failed |
| created_at | DateTime | 创建时间 |


---

## 4. 后端架构设计

### 4.1 核心模块

#### 4.1.1 发言决策模块（decision_engine.py）

**功能**：处理每条新消息，决定哪些 Agent 需要回复

**五层决策流程**：

1. **强制发言检查**
   - 检测消息中是否包含 @AgentName 或直接提到某 Agent 名字
   - 如果有：只有被提到的 Agent 必须回复，其他 Agent 跳过
   - 注意：@ 标签转为纯文本名字传入 Agent 上下文

2. **意愿计算**（仅无强制指定时执行）
   - 意愿值 = proactivity × topic_relevance × incremental_score × random_factor
   - topic_relevance：用 LiteLLM 轻量判断话题和 Agent 擅长领域的相关度（0-1）
   - incremental_score：判断已有回复是否已经覆盖该话题
   - random_factor：0.8-1.2 之间的随机扰动
   - 意愿值超过 Agent 自身阈值（1 - proactivity）则进入发言队列
   - **优化**：使用轻量级 prompt + 快速模型（GPT-3.5-turbo 或国内快速模型）

3. **发言时机错开**
   - fast：0-1 秒随机延迟
   - medium：1-3 秒随机延迟
   - slow：3-6 秒随机延迟

4. **后发言者动态调整**
   - 后发言的 Agent 能看到先发言的内容
   - 在 prompt 中注入："以下是其他成员已经说的内容：{prior_responses}，请不要重复，只补充新角度或不同观点"

5. **Agent 互相触发**
   - Agent 回复中如果提到另一个 Agent 名字，触发被提到者的意愿计算
   - 最大连续互动深度为 3，超过后等待用户介入

**技术实现**：
- 使用 asyncio.gather 实现 Agent 并行回复
- 使用队列管理发言顺序

#### 4.1.2 回复长度控制模块（length_control.py）

**功能**：控制 Agent 回复的长度

**五个等级定义**：
- 1 极简：1 句话，甚至 1 个词，不解释
- 2 简短：2-3 句，点到为止
- 3 适中：1 小段，有基本解释，不深入
- 4 详细：多段，有结构，会举例
- 5 完整：不设限，全力输出

**优先级**（从高到低）：
1. 对话级临时设置（用户在当前会话手动调整）
2. 自然语言触发（检测"说详细点"/"简短点"等关键词）
3. Agent 级默认设置
4. 系统级全局默认

**自然语言触发规则**：
- 升级关键词：说详细点、展开讲、为什么、详细说说、具体讲
- 降级关键词：简短点、说重点、简单说、一句话
- 结束关键词：好的、明白了、懂了、行 → 回到默认等级
- **实现**：使用简单字符串匹配，不需要 LLM

**System Prompt 注入**（末尾）：
- 1级："回复极简，最多一句话，不做任何解释"
- 2级："回复简短，2-3句，不展开"
- 3级："回复适中，一小段，基本解释即可"
- 4级："回复详细，可以多段，举例说明"
- 5级："完整回复，不设长度限制"

#### 4.1.3 记忆管理模块（memory_manager.py）

**功能**：管理 Agent 的三层记忆结构

**三层记忆结构**：

1. **工作记忆（Working Memory）**
   - 保存当前会话最近 20 条原始消息
   - 80% 水位线触发压缩（即超过 16 条时）
   - 直接作为 messages 历史传入模型

2. **短期记忆（Short-term Memory）**
   - 存储当前会话较早内容的摘要
   - 格式："时间段内讨论了{话题}，结论是{结论}，用户倾向{偏好}"
   - 作为 System Prompt 的补充段落注入

3. **长期记忆（Long-term Memory）**
   - 跨会话持久化
   - 存储用户偏好、重要结论、关键事件
   - 每个 Agent 独立维护
   - 通过 ChromaDB 语义检索，按需注入上下文

**遗忘机制**：
- 每条记忆有 importance_weight 和 decay_factor
- 定时任务每天运行：decay_factor × 0.95（时间衰减）
- 被多次引用的记忆：importance_weight + 0.1（重要性保护）
- importance_weight 低于 0.1 且非 long_term 的记忆自动删除
- 用户可手动删除某条记忆

**压缩触发时机**（三级）：
1. 空闲触发：用户停止发言 5 分钟后，后台异步压缩（优先）
2. 话题切换触发：检测到硬切换时立即归档上一话题
3. 窗口压力触发：工作记忆到 80% 水位线时兜底

**压缩实现**：
- 调用 LiteLLM 生成摘要
- Prompt："请将以下对话压缩为一段简短摘要，保留：主要话题、关键结论、用户的偏好和态度，丢弃：具体措辞、重复内容、无关细节"
- **技术实现**：使用 APScheduler 实现定时任务

#### 4.1.4 话题检测模块（topic_detector.py）

**功能**：检测话题切换

**硬切换关键词列表**：
- 换个话题、聊点别的、算了不说这个、新话题、换话题
- 别聊这个了、我们聊聊、转移话题、跳过这个

**检测到硬切换后执行**：
1. 压缩当前工作记忆进短期记忆
2. 清空工作记忆
3. 广播话题切换事件给所有 Agent，意愿值重置

**实现**：
- 使用关键词匹配（简单字符串匹配或正则表达式）
- 关键词列表可扩展，支持用户自定义

#### 4.1.5 知识库模块（knowledge_base.py）

**功能**：管理 Agent 的知识库

**支持格式**：PDF、txt、md、网页 URL、手动输入文本

**处理流程**：
1. 文本提取（PyPDF2、python-docx、markdown 等库）
2. 分块（chunk_size=500，使用 LangChain 的 TextSplitter）
3. 向量化（使用 BGE 或 sentence-transformers）
4. 存入 ChromaDB

**检索**：
- Agent 回复前自动检索自己的知识库
- top_k=3
- 检索结果作为 context 注入 System Prompt

**权限**：
- scope=private：只在私聊使用
- scope=group：群聊也可使用

### 4.2 API 设计

**基础路径**：`/api/v1/`（添加版本控制）

#### Agent 管理
- `POST /api/v1/agents` - 创建 Agent
- `GET /api/v1/agents` - 获取所有 Agent
- `GET /api/v1/agents/{id}` - 获取单个 Agent
- `PUT /api/v1/agents/{id}` - 更新 Agent
- `DELETE /api/v1/agents/{id}` - 删除 Agent

#### 会话管理
- `POST /api/v1/conversations` - 创建会话（私聊或群聊）
- `GET /api/v1/conversations` - 获取所有会话
- `GET /api/v1/conversations/{id}` - 获取会话详情
- `GET /api/v1/conversations/{id}/messages` - 获取消息历史（支持分页：?limit=50&offset=0）

#### 消息
- `POST /api/v1/conversations/{id}/messages` - 发送消息（触发 Agent 回复）

#### 记忆
- `GET /api/v1/agents/{id}/memories` - 获取某 Agent 的记忆
- `DELETE /api/v1/agents/{id}/memories/{mid}` - 删除某条记忆

#### 知识库
- `POST /api/v1/agents/{id}/knowledge` - 上传文档
- `GET /api/v1/agents/{id}/knowledge` - 获取知识库列表
- `DELETE /api/v1/agents/{id}/knowledge/{kid}` - 删除文档

#### 设置
- `GET /api/v1/settings` - 获取全局设置
- `PUT /api/v1/settings` - 更新全局设置（含全局默认长度等级）

**错误响应格式**：
```json
{
  "error": "错误描述",
  "code": "ERROR_CODE",
  "details": {}
}
```

### 4.3 WebSocket 设计

**连接**：`ws://localhost:8000/ws/{conversation_id}`

**服务端推送事件类型**：
- `agent_thinking`：`{agent_id, agent_name}` → 显示"思考中"状态
- `agent_message`：`{agent_id, agent_name, content, timestamp}` → 新消息（支持流式输出）
- `agent_done`：`{agent_id}` → 该 Agent 本轮回复完毕
- `topic_switched`：`{}` → 话题已切换
- `error`：`{message, code}` → 错误事件
- `connection_status`：`{status}` → 连接状态（connected/reconnecting/disconnected）

**客户端发送事件**：
- `user_message`：`{content, conversation_id}` → 发送消息
- `set_length_level`：`{level}` → 临时设置长度等级
- `stop_agent`：`{agent_id}` → 打断某个 Agent

**技术实现**：
- 使用 FastAPI 的 WebSocket 支持
- 使用 ConnectionManager 管理多个连接
- 心跳机制：每 30 秒 ping/pong
- 客户端自动重连：指数退避（1s → 2s → 4s → 8s）
- 流式输出：LiteLLM `stream=True` → 逐 token 推送 → WebSocket 实时发送


---

## 5. 前端设计系统

### 5.1 整体风格和配色

**设计风格**：Soft UI Evolution（柔和 UI 演进）
- 关键词：柔和阴影、微妙深度、平静、高级感、有机形状
- 适合：温暖社交风格，类似微信

**配色方案**（温暖柔和）：

```
Primary:    #07C160  (微信绿，温暖友好)
Secondary:  #10AEFF  (天蓝色，清新)
Background: #F7F5F2  (暖米色，非纯白)
Surface:    #FFFFFF  (纯白，用于卡片和气泡)
Text:       #1A1A1A  (深灰，不是纯黑)
Text-Muted: #8E8E93  (中灰)
Border:     #E5E5EA  (浅灰)
```

**Agent 专属颜色**：
- 根据 Agent ID 哈希生成
- 柔和色系（饱和度 40-60%，亮度 60-80%）
- 用于 Agent 名字和头像边框

**字体**：
- 中文：PingFang SC / Noto Sans SC（圆润可读）
- 英文：Nunito Sans（柔和、友好）
- 等宽字体：Consolas / Monaco（用于代码和 System Prompt）

**关键效果**：
- 圆角：18px（气泡）、12px（输入框、卡片）、8px（按钮）
- 阴影：柔和（0 2px 8px rgba(0,0,0,0.08)）
- 过渡：200-300ms，spring easing
- 间距：宽松，消息间距 12px，气泡内 padding 12px 16px

**UI 组件库**：shadcn/ui（基于 Tailwind CSS）

### 5.2 布局结构

**三栏布局**：

#### 5.2.1 最左侧导航栏（60px 宽）

- 背景：#FFFFFF（纯白）
- 右侧边框：1px solid #E5E5EA
- 图标：24px，使用 Lucide Icons
  - 未激活：#8E8E93
  - 激活：#07C160
  - 悬停：背景 #F7F5F2，过渡 200ms
- 布局（从上到下）：
  - 用户头像（40px 圆形，顶部）
  - 聊天图标（MessageSquare）
  - 联系人图标（Users）
  - 设置图标（Settings，底部）

#### 5.2.2 左侧会话列表（280px 宽）

- 背景：#F7F5F2（暖米色）
- 顶部搜索框：
  - 高度 40px，圆角 12px
  - 背景 #FFFFFF，边框 1px solid #E5E5EA
  - 图标：Search（16px）
  - placeholder："搜索会话"
- 会话列表项（72px 高）：
  - 默认：透明背景
  - 悬停：背景 #FFFFFF + 阴影 0 2px 8px rgba(0,0,0,0.08)
  - 激活：背景 #FFFFFF + 左侧 3px #07C160 边框
  - 布局：头像（48px）+ 名字 + 最后消息预览 + 时间
  - 群聊头像：2x2 拼图（最多 4 个成员）

#### 5.2.3 右侧聊天主区

- **顶部 Header（64px）**：
  - 背景 #FFFFFF，底部边框 1px solid #E5E5EA
  - 会话名（18px，PingFang SC Medium）
  - 成员头像列表（32px，最多 5 个 + 更多）
  - 设置按钮（MoreVertical）

- **消息流区域**：
  - 背景 #F7F5F2（暖米色）
  - padding 24px，消息间距 12px
  - 自动滚动到底部

- **底部输入区（最小 80px，自适应）**：
  - 背景 #FFFFFF，顶部边框 1px solid #E5E5EA
  - padding 16px

### 5.3 核心组件设计

#### 5.3.1 消息气泡

**用户消息（右侧）**：
- 背景：#07C160（微信绿）
- 文字：#FFFFFF
- 圆角：18px（左上、左下、右上），4px（右下）
- padding：12px 16px
- 最大宽度：60%
- 阴影：0 2px 4px rgba(7,193,96,0.2)
- 对齐：右对齐（flex justify-end）

**Agent 消息（左侧）**：
- 背景：#FFFFFF
- 文字：#1A1A1A
- 圆角：18px（右上、右下、左上），4px（左下）
- padding：12px 16px
- 最大宽度：60%
- 阴影：0 2px 8px rgba(0,0,0,0.08)
- 对齐：左对齐（flex justify-start）
- 显示：头像（32px）+ 名字（12px，#8E8E93）+ 消息气泡
- 每个 Agent 有专属柔和色（用于名字和头像边框）

**Agent 思考中状态**：
- 背景：#FFFFFF
- 圆角：18px
- padding：12px 16px
- 内容：3 个点（•••），依次淡入淡出动画
- 颜色：#8E8E93
- 动画持续时间根据 response_speed：
  - fast: 0-1 秒
  - medium: 1-3 秒
  - slow: 3-6 秒

**Agent 回应 Agent（引用标记）**：
- 气泡左侧有细线引用标记（2px，#E5E5EA）
- 引用消息显示在气泡顶部："回复 @AgentName: 消息预览"（11px，#8E8E93）

#### 5.3.2 底部输入区

**布局（从左到右，flex）**：

1. **附件按钮**：
   - 图标：Lucide Paperclip，24px
   - 颜色：#8E8E93
   - 悬停：颜色 #07C160，背景 #F7F5F2，圆角 8px
   - padding：8px

2. **文本输入框（flex-1）**：
   - 最小高度：40px
   - 最大高度：120px（约 5 行）
   - 自适应高度（根据内容）
   - 背景：#F7F5F2
   - 圆角：12px
   - padding：10px 16px
   - 边框：1px solid transparent（默认），1px solid #07C160（聚焦）
   - placeholder："输入消息..."
   - 字体：14px，PingFang SC
   - 支持：@ 触发选择器，Shift+Enter 换行，Enter 发送

3. **长度等级调节器**：
   - 5 个图标按钮（1-5 条横线）
   - 激活色：#07C160，未激活：#E5E5EA
   - 尺寸：20px，间距：4px
   - 悬停显示 tooltip："极简/简短/适中/详细/完整"
   - 过渡：200ms

4. **发送按钮**：
   - 图标：Lucide Send，24px
   - 有内容：#07C160，无内容：#E5E5EA（禁用）
   - 悬停：背景 #F7F5F2，圆角 8px
   - padding：8px

#### 5.3.3 @ 选择器

- **触发**：输入 @ 后自动弹出
- **位置**：输入框上方，左对齐
- **样式**：
  - 背景：#FFFFFF
  - 阴影：0 4px 16px rgba(0,0,0,0.12)
  - 圆角：12px
  - 最大高度：240px（约 5 个列表项）
  - 滚动：overflow-y auto

- **列表项（48px 高）**：
  - padding：8px 12px
  - 布局：头像（32px）+ 名字（14px）+ 简介（12px，#8E8E93）
  - 悬停：背景 #F7F5F2
  - 选中：背景 #F7F5F2 + 左侧 2px #07C160 边框

- **交互**：
  - 键盘导航：上下箭头选择，Enter 确认，Esc 关闭
  - 实时搜索过滤（输入 @A 只显示包含 "A" 的 Agent）

- **插入**：
  - 选择后插入：@AgentName（带空格）
  - @ 标签样式：
    - 背景：#E8F5E9（浅绿色）
    - 颜色：#07C160
    - 圆角：4px
    - padding：2px 6px

### 5.4 页面设计

#### 5.4.1 联系人页面

**布局**：
- 顶部搜索框（同会话列表）
- Agent 卡片网格（3 列，gap 24px，响应式）
- 右上角 "+" 按钮（固定位置）

**Agent 卡片设计**：
- 尺寸：宽度 100%（响应式），高度 auto
- 背景：#FFFFFF
- 圆角：16px
- 阴影：0 2px 8px rgba(0,0,0,0.08)
- 悬停：阴影 0 4px 16px rgba(0,0,0,0.12)，过渡 200ms
- padding：20px
- 布局（从上到下）：
  - 头像（80px 圆形，居中）
  - 名字（16px，#1A1A1A，PingFang SC Medium，居中）
  - 性别图标（12px，#8E8E93，居中）
  - 简介（14px，#8E8E93，2 行，省略号，居中）
  - 标签列表（12px，#07C160 背景，#FFFFFF 文字，圆角 12px，padding 4px 8px，最多 3 个）
  - 操作按钮（底部）：
    - "私聊"按钮（主按钮，#07C160 背景，#FFFFFF 文字）
    - "详情"按钮（次按钮，#F7F5F2 背景，#1A1A1A 文字）

**"+" 按钮设计**：
- 位置：右上角，固定（fixed）
- 尺寸：56px 圆形
- 背景：#07C160
- 图标：Plus，24px，#FFFFFF
- 阴影：0 4px 12px rgba(7,193,96,0.4)
- 悬停：背景 #06A850，阴影 0 6px 16px rgba(7,193,96,0.5)
- 点击：弹出选项菜单
  - "创建新好友"
  - "从模板添加"

#### 5.4.2 创建 Agent 流程（四步）

**整体设计**：
- 模态框（Modal）或全屏页面
- 背景：#FFFFFF
- 圆角：24px（如果是模态框）
- 最大宽度：720px
- padding：32px
- 顶部进度指示器：4 个点，当前步骤高亮（#07C160），其他步骤灰色（#E5E5EA）

**第一步：基本信息**
- 标题："创建新好友 - 基本信息"（20px，PingFang SC Medium）
- 表单字段：
  1. 头像上传（120px 圆形，支持拖拽，默认随机渐变头像）
  2. 名字（输入框，placeholder："给你的 AI 好友起个名字"，最大 20 字符）
  3. 性别（3 个单选按钮：男性/女性/中性，图标 + 文字）
  4. 简介（文本框，placeholder："一句话介绍你的 AI 好友"，最大 100 字符）
  5. 标签（输入框 + 标签列表，预设标签 + 自定义，最多 5 个）
- 底部按钮："下一步"（右侧，主按钮）+ "取消"（左侧，次按钮）

**第二步：性格设定**
- 标题："创建新好友 - 性格设定"
- 5 个性格参数滑块（两端自然语言描述）：
  1. 发言主动性："沉默寡言 ←→ 话痨"（默认 0.5）
  2. 专注度："容易跑题 ←→ 高度专注"（默认 0.7）
  3. 自信度："谨慎保守 ←→ 自信果断"（默认 0.6）
  4. 社交敏感度："直来直去 ←→ 善解人意"（默认 0.7）
  5. 反应速度：快速/适中/缓慢（3 选 1，图标 + 文字）
- 进阶区域（默认折叠）：
  - "高级设置"按钮（展开/折叠）
  - System Prompt 文本框（多行，最小 120px，等宽字体）
- 底部按钮："上一步"（左侧）+ "下一步"（右侧）

**第三步：能力配置**
- 标题："创建新好友 - 能力配置"
- 表单字段：
  1. 选择模型（下拉，分组：国外模型/国内模型）
  2. API Key（输入框，type="password"，右侧"测试连接"按钮）
  3. API Base（输入框，可选）
  4. 挂载工具（多选框，预设工具 + 自定义）
  5. MCP 配置（JSON 编辑器，默认折叠）
  6. 上传知识库（文件上传区域，支持 PDF/TXT/MD/URL，显示文件列表）
- 底部按钮："上一步"（左侧）+ "下一步"（右侧）

**第四步：完成**
- 标题："创建新好友 - 完成"
- Agent 卡片预览（大尺寸，同联系人页面）
- 底部按钮："上一步"（左侧）+ "发送好友申请"（右侧，#07C160）
  - 点击后：显示加载动画 → 创建 Agent → 跳转到私聊页面

#### 5.4.3 Agent 详情侧边栏

**触发**：点击 Agent 头像或名字

**样式**：
- 从右侧滑入
- 宽度：400px
- 背景：#FFFFFF
- 阴影：-4px 0 16px rgba(0,0,0,0.12)
- 动画：slide-in-right，300ms

**布局（从上到下）**：

1. **顶部区域**：
   - 关闭按钮（X，右上角）
   - 头像（120px 圆形，居中）
   - 名字（20px，#1A1A1A，PingFang SC Medium，居中）
   - 性别图标 + 简介（14px，#8E8E93，居中）
   - 标签列表（居中）

2. **性格参数雷达图**：
   - 标题："性格特征"（16px，#1A1A1A，PingFang SC Medium）
   - 雷达图（5 个维度）：
     - 发言主动性、专注度、自信度、社交敏感度、反应速度
     - 颜色：#07C160（填充 20% 透明度）
     - 边框：#07C160
     - 网格：#E5E5EA
   - 使用 Chart.js 或 Recharts 实现

3. **记忆摘要**：
   - 标题："它记得什么"（16px，#1A1A1A，PingFang SC Medium）
   - 记忆列表（最多 5 条）：
     - 内容（14px，#1A1A1A）
     - 时间（12px，#8E8E93）
     - 重要性指示器（星星图标，1-5 个）
   - "查看更多"按钮（如果有更多记忆）

4. **知识库文件列表**：
   - 标题："知识库"（16px，#1A1A1A，PingFang SC Medium）
   - 文件列表：
     - 文件图标（根据类型）+ 文件名（14px）+ 大小（12px，#8E8E93）+ 删除按钮
   - "添加文件"按钮（+ 图标）

5. **快速编辑入口**：
   - 底部固定按钮
   - "编辑好友"按钮（全宽，主按钮）
   - 点击后：打开编辑模态框（同创建流程，但预填充数据）


---

## 6. 开发顺序

按照以下顺序逐步实现，每步完成后验证效果：

### 6.1 第一步：基础框架搭建

**目标**：FastAPI + React + WebSocket 连通

**后端任务**：
- 使用 uv 初始化 Python 项目
- 安装 FastAPI、SQLModel、uvicorn
- 创建基础项目结构（app/api、app/models、app/core）
- 实现基础 WebSocket 连接（/ws/{conversation_id}）
- 实现心跳机制（ping/pong）

**前端任务**：
- 使用 Vite 创建 React + TypeScript 项目
- 安装 Tailwind CSS、shadcn/ui、Zustand
- 创建基础项目结构（components、pages、stores）
- 实现 WebSocket 连接和自动重连
- 测试前后端 WebSocket 通信

**验证**：前后端能够通过 WebSocket 互相发送和接收消息

### 6.2 第二步：Agent CRUD

**目标**：创建、编辑、删除 Agent

**后端任务**：
- 定义 Agent 数据模型（SQLModel）
- 实现 Agent CRUD API（/api/v1/agents）
- 初始化 SQLite 数据库
- 实现 API Key 加密存储

**前端任务**：
- 实现联系人页面（Agent 卡片网格）
- 实现创建 Agent 流程（四步模态框）
- 实现 Agent 详情侧边栏
- 实现 Agent 编辑功能

**验证**：能够创建、查看、编辑、删除 Agent

### 6.3 第三步：私聊基础功能

**目标**：发消息、Agent 回复、流式输出

**后端任务**：
- 定义 Conversation 和 Message 数据模型
- 实现会话和消息 API
- 集成 LiteLLM，实现基础 Agent 回复
- 实现流式输出（stream=True）
- 通过 WebSocket 推送流式消息

**前端任务**：
- 实现三栏布局（导航栏、会话列表、聊天主区）
- 实现消息气泡（用户消息、Agent 消息）
- 实现底部输入区（文本输入、发送按钮）
- 实现流式消息接收和显示
- 实现 Agent 思考中状态

**验证**：能够与单个 Agent 私聊，Agent 能够流式回复

### 6.4 第四步：群聊基础功能

**目标**：多 Agent 收到消息、强制发言层（@ 机制）

**后端任务**：
- 实现群聊会话创建
- 实现 @ 解析（将 @AgentName 转为纯文本）
- 实现强制发言检查（被 @ 的 Agent 必须回复）
- 实现多 Agent 并行回复（asyncio.gather）

**前端任务**：
- 实现 @ 选择器（输入 @ 后弹出）
- 实现 @ 标签样式（浅绿色背景）
- 实现群聊头像（2x2 拼图）
- 实现多个 Agent 消息显示（每个 Agent 有专属颜色）

**验证**：能够创建群聊，@ 某个 Agent 后该 Agent 会回复

### 6.5 第五步：意愿计算层

**目标**：无 @ 时 Agent 自行决定是否回复

**后端任务**：
- 实现发言决策模块（decision_engine.py）
- 实现意愿计算算法
- 实现话题相关度判断（使用轻量级 LLM）
- 实现发言时机错开（根据 response_speed）
- 实现后发言者动态调整（注入先发言内容）
- 实现 Agent 互相触发（最大深度 3）

**前端任务**：
- 实现 Agent 回应 Agent 的引用标记
- 优化多个 Agent 回复的显示效果

**验证**：群聊中发送消息后，相关的 Agent 会自动回复，不相关的 Agent 不回复

### 6.6 第六步：长度控制层

**目标**：五级长度 + 自然语言触发

**后端任务**：
- 实现回复长度控制模块（length_control.py）
- 实现五级长度定义和 System Prompt 注入
- 实现自然语言触发检测（关键词匹配）
- 实现长度等级优先级处理

**前端任务**：
- 实现长度等级调节器（5 格滑块或图标按钮）
- 实现 tooltip 显示
- 实现临时设置长度等级（通过 WebSocket）

**验证**：能够调节长度等级，Agent 回复长度符合预期；说"详细点"后 Agent 回复变长

### 6.7 第七步：话题检测

**目标**：关键词硬切换

**后端任务**：
- 实现话题检测模块（topic_detector.py）
- 实现硬切换关键词匹配
- 实现话题切换后的处理（压缩记忆、清空工作记忆、重置意愿值）
- 通过 WebSocket 推送话题切换事件

**前端任务**：
- 实现话题切换提示（显示"话题已切换"）

**验证**：说"换个话题"后，系统检测到话题切换，记忆被压缩

### 6.8 第八步：记忆系统

**目标**：工作记忆 + 短期记忆压缩

**后端任务**：
- 实现记忆管理模块（memory_manager.py）
- 定义 Memory 数据模型
- 实现工作记忆（最近 20 条消息）
- 实现短期记忆（压缩摘要）
- 实现压缩触发时机（空闲、话题切换、窗口压力）
- 实现压缩算法（调用 LiteLLM 生成摘要）
- 实现记忆注入（作为 System Prompt 补充）

**前端任务**：
- 在 Agent 详情侧边栏显示记忆摘要

**验证**：对话一段时间后，工作记忆被压缩为短期记忆，Agent 仍能记住之前的内容

### 6.9 第九步：长期记忆

**目标**：跨会话持久化 + 遗忘机制

**后端任务**：
- 实现长期记忆存储（跨会话）
- 集成 ChromaDB，实现语义检索
- 实现遗忘机制（时间衰减、重要性保护）
- 实现定时任务（APScheduler，每天运行）
- 实现长期记忆注入（按需检索）

**前端任务**：
- 在 Agent 详情侧边栏显示长期记忆
- 实现手动删除记忆功能

**验证**：跨会话后，Agent 仍能记住重要信息；不重要的记忆会逐渐遗忘

### 6.10 第十步：知识库

**目标**：文档上传 + 检索注入

**后端任务**：
- 实现知识库模块（knowledge_base.py）
- 定义 KnowledgeBase 数据模型
- 实现文档上传和文本提取（PDF、TXT、MD、URL）
- 实现文档分块（LangChain TextSplitter）
- 实现向量化（BGE 或 sentence-transformers）
- 存入 ChromaDB
- 实现检索（top_k=3）
- 实现检索结果注入（作为 context）

**前端任务**：
- 在创建 Agent 流程中实现知识库上传
- 在 Agent 详情侧边栏显示知识库文件列表
- 实现文件删除功能

**验证**：上传文档后，Agent 能够基于文档内容回答问题

---

## 7. 注意事项

### 7.1 技术实现要点

1. **模型调用**
   - 所有模型调用统一走 LiteLLM，不直接调用 openai 或 anthropic SDK
   - 支持国内外主流提供商（OpenAI、Anthropic、通义千问、文心一言等）
   - 使用流式 API（stream=True）实现实时输出

2. **并发处理**
   - Agent 并行回复用 asyncio.gather 实现，不能串行等待
   - 使用队列管理发言顺序
   - 后发言者能看到先发言的内容

3. **WebSocket 管理**
   - 推送要做心跳检测（每 30 秒 ping/pong），防止连接断开
   - 客户端自动重连（指数退避：1s → 2s → 4s → 8s）
   - 使用 ConnectionManager 管理多个连接

4. **@ 机制**
   - @ 解析时将 @AgentName 转为纯文本传入模型，不传 ID
   - 前端 @ 功能：输入 @ 后弹出当前群成员选择器
   - @ 标签样式：浅绿色背景（#E8F5E9）

5. **记忆压缩**
   - 记忆压缩是后台异步任务，不能阻塞主流程
   - 优先使用空闲触发（用户停止发言 5 分钟后）
   - 使用 APScheduler 实现定时任务

6. **数据存储**
   - 所有 Agent 配置（包括 API Key）存本地 SQLite，不上传
   - API Key 加密存储
   - 开发使用 SQLite，生产可选 PostgreSQL

7. **性能优化**
   - 意愿计算使用轻量级 prompt + 快速模型
   - 向量检索使用本地嵌入模型（BGE），降低成本
   - 知识库分块大小：500 字符
   - 检索 top_k=3

8. **用户体验**
   - 流式输出要实时显示，不能等全部生成完再显示
   - Agent 思考中状态要有动画效果
   - 消息发送失败要有错误提示和重试机制
   - 长时间操作（如文档上传）要有进度提示

### 7.2 安全性考虑

1. **API Key 安全**
   - API Key 加密存储，不明文保存
   - 不在日志中输出 API Key
   - 不通过网络传输 API Key（除非必要）

2. **输入验证**
   - 所有用户输入要验证和清理
   - 防止 SQL 注入、XSS 攻击
   - 文件上传要验证文件类型和大小

3. **错误处理**
   - 所有 API 调用要有错误处理
   - 错误信息不暴露敏感信息
   - 记录错误日志，方便调试

### 7.3 可访问性

1. **键盘导航**
   - 所有交互元素支持键盘导航
   - 焦点状态清晰可见
   - Tab 顺序合理

2. **屏幕阅读器**
   - 使用语义化 HTML
   - 添加 ARIA 标签
   - 图标要有文字说明

3. **颜色对比度**
   - 文本对比度至少 4.5:1（WCAG AA 标准）
   - 不仅依赖颜色传达信息

4. **动画**
   - 尊重 prefers-reduced-motion
   - 提供关闭动画的选项

### 7.4 响应式设计

- 支持断点：375px（手机）、768px（平板）、1024px（小屏笔记本）、1440px（桌面）
- 移动端优化：触摸友好、手势支持
- 三栏布局在小屏幕上自适应（隐藏导航栏和会话列表，使用抽屉）

---

## 8. 总结

ChatTable 是一个创新的 AI Agent 社交聊天应用，通过温暖的社交化设计和智能的对话机制，为用户提供独特的 AI 交互体验。

**核心特色**：
- 🤖 个性化 Agent：每个 Agent 有独特的性格、记忆和知识库
- 💬 智能对话：Agent 可以根据话题相关度自主决定是否发言
- 👥 群聊互动：多个 Agent 可以在群聊中互相交流
- 🧠 三层记忆：工作记忆、短期记忆、长期记忆，模拟人类记忆机制
- 📚 知识库：支持上传文档，Agent 可以基于文档回答问题
- 🎨 温暖设计：类似微信的温暖社交风格，柔和的配色和圆润的界面

**技术亮点**：
- 前后端分离，使用现代化技术栈
- 统一模型调用接口（LiteLLM），支持国内外主流提供商
- 异步并发处理，高性能
- 本地部署，隐私优先
- 完善的记忆和知识库系统

**下一步**：
按照开发顺序逐步实现，每步完成后验证效果，确保功能正确性和用户体验。

---

**文档版本**：v1.0  
**最后更新**：2026-03-10  
**作者**：ChatTable 开发团队

