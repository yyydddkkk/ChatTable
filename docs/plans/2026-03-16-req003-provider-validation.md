# REQ-003: Provider模型能力与连通性校验

**优先级**: P1  
**状态**: 待实现  
**负责**: 后端线程 (A)  
**前端依赖**: 需要前端添加校验按钮

## 需求描述

前端需要Provider连通性校验功能，用于验证Provider的API连通性和模型能力。

## 接口设计

### 1. 校验Provider连通性
```
POST /api/v1/providers/{provider_id}/validate
```

**响应**:
```json
{
  "valid": true,
  "message": "Provider连接正常",
  "latency_ms": 250,
  "models": ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"],
  "error": null
}
```

**错误响应**:
```json
{
  "valid": false,
  "message": "API密钥无效",
  "latency_ms": null,
  "models": [],
  "error": "Invalid API key"
}
```

### 2. 获取Provider支持的模型列表
```
GET /api/v1/providers/{provider_id}/models
```

**响应**:
```json
{
  "models": ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"],
  "provider_id": 1,
  "provider_name": "OpenAI"
}
```

## 实现建议

1. **连通性校验**:
   - 调用Provider的API（如OpenAI的/models端点）
   - 测量响应延迟
   - 返回支持的模型列表

2. **错误处理**:
   - API密钥无效
   - 网络超时
   - 服务不可用

3. **权限**:
   - 需要租户隔离
   - 验证Provider属于当前租户

## 测试要求

- 单元测试: 接口返回格式正确
- 集成测试: 实际调用Provider API
- 性能测试: 校验响应时间<5秒

## 前端集成

前端需要在SettingsPage添加校验按钮，显示校验结果。