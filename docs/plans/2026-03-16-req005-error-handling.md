# REQ-005: Persona生成/Prompt优化错误码与返回结构收口

**优先级**: P2  
**状态**: 待实现  
**负责**: 后端线程 (A)  
**前端依赖**: 前端需要更新错误处理

## 需求描述

统一Persona生成和Prompt优化接口的错误码和返回结构，提供更清晰的错误信息。

## 当前问题

1. 错误信息不统一：有些是中文，有些是英文
2. 错误码不明确：只有400和500状态码
3. 返回结构不统一：没有标准的错误响应格式

## 接口设计

### 统一错误响应格式
```json
{
  "error": {
    "code": "INVALID_API_KEY",
    "message": "API密钥无效",
    "details": "Provider OpenAI 的 API密钥验证失败",
    "timestamp": "2026-03-16T10:00:00Z"
  }
}
```

### 错误码定义

1. **Provider相关**:
   - `PROVIDER_NOT_CONFIGURED`: 未配置优化服务商
   - `PROVIDER_NOT_FOUND`: 优化服务商不存在
   - `INVALID_API_KEY`: API密钥无效
   - `PROVIDER_UNAVAILABLE`: 服务商不可用
   - `RATE_LIMIT_EXCEEDED`: 请求频率超限

2. **LLM相关**:
   - `LLM_TIMEOUT`: LLM请求超时
   - `LLM_INVALID_RESPONSE`: LLM返回无效响应
   - `LLM_QUOTA_EXCEEDED`: LLM配额超限
   - `LLM_CONTENT_FILTER`: 内容被过滤

3. **输入相关**:
   - `INVALID_DESCRIPTION`: 角色描述无效
   - `INVALID_PROMPT`: Prompt内容无效
   - `DESCRIPTION_TOO_LONG`: 角色描述过长
   - `PROMPT_TOO_LONG`: Prompt内容过长

### 接口更新

#### 1. Persona生成
```
POST /api/v1/agents/generate
```

**成功响应**:
```json
{
  "name": "角色名称",
  "description": "一句话简介",
  "personality": "性格特征描述",
  "background": "背景故事",
  "skills": ["技能1", "技能2"],
  "tags": ["标签1", "标签2"],
  "system_prompt": "系统提示词"
}
```

**错误响应**:
```json
{
  "error": {
    "code": "PROVIDER_NOT_CONFIGURED",
    "message": "请先在设置中配置AI优化的服务商",
    "details": "需要配置优化服务商才能生成角色",
    "timestamp": "2026-03-16T10:00:00Z"
  }
}
```

#### 2. Prompt优化
```
POST /api/v1/agents/optimize-prompt
```

**成功响应**:
```json
{
  "optimized_prompt": "优化后的Prompt",
  "original_prompt": "原始Prompt",
  "improvements": ["改进点1", "改进点2"],
  "confidence_score": 0.85
}
```

**错误响应**:
```json
{
  "error": {
    "code": "LLM_TIMEOUT",
    "message": "LLM请求超时",
    "details": "请稍后重试或检查网络连接",
    "timestamp": "2026-03-16T10:00:00Z"
  }
}
```

## 实现建议

1. **错误处理中间件**:
   - 创建统一的错误处理中间件
   - 捕获所有异常并转换为标准格式

2. **错误码映射**:
   - 创建错误码枚举
   - 映射异常类型到错误码

3. **日志记录**:
   - 记录详细的错误信息
   - 包含请求ID用于追踪

## 测试要求

- 单元测试: 每种错误码的响应格式
- 集成测试: 实际错误场景的处理
- 端到端测试: 前端错误显示

## 前端更新

前端需要更新错误处理逻辑，显示结构化的错误信息。