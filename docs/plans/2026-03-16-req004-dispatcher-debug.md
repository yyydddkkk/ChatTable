# REQ-004: Dispatcher调试信息查询接口

**优先级**: P1 (阻塞前端)  
**状态**: 待实现  
**负责**: 后端线程 (A)  
**前端依赖**: 前端调试页面已完成

## 需求描述

前端需要Dispatcher调试信息查询接口，用于展示Dispatcher状态、调度计划和执行日志。

## 接口设计

### 1. 获取Dispatcher状态
```
GET /api/v1/dispatcher/status
```

**响应**:
```json
{
  "enabled": true,
  "mode": "mixed",
  "hard_cap": 5,
  "max_rounds": 2,
  "planner_model": "qwen-plus",
  "debug_feedback": true,
  "last_updated": "2026-03-16T10:00:00Z"
}
```

### 2. 获取调度日志
```
GET /api/v1/dispatcher/logs?limit=100
```

**参数**:
- `limit`: 返回日志数量，默认100

**响应**:
```json
[
  {
    "event": "dispatch_summary",
    "tenant_id": "local",
    "conversation_id": 123,
    "message_id": 456,
    "request_id": "uuid",
    "planner_model": "qwen-plus",
    "failure_type": null,
    "retry_count": 0,
    "fallback_strategy": null,
    "selected_agents": [1, 2],
    "latency_ms": 250,
    "timestamp": "2026-03-16T10:00:00Z"
  }
]
```

### 3. 获取调度摘要
```
GET /api/v1/dispatcher/summaries?conversation_id=123&limit=50
```

**参数**:
- `conversation_id`: 可选，过滤特定会话
- `limit`: 返回数量，默认50

**响应**:
```json
[
  {
    "conversation_id": 123,
    "message_id": 456,
    "selected_agents": [1, 2],
    "fallback": false,
    "failure_type": null,
    "retry_count": 0,
    "latency_ms": 250,
    "context": {
      "raw_content": "原始消息",
      "cleaned_content": "清理后消息",
      "active_agent_ids": [1, 2, 3],
      "mentioned_ids": [1],
      "missing_mentioned_ids": [],
      "is_group": true
    },
    "plan": {
      "plan_id": "uuid",
      "conversation_id": 123,
      "trigger_message_id": 456,
      "selected_agents": [...],
      "execution_graph": [...],
      "round_control": {...},
      "deferred_candidates": [...]
    },
    "planner_output_preview": "规划器输出预览"
  }
]
```

## 实现建议

1. **数据源**:
   - 状态: 从配置和Redis获取
   - 日志: 从结构化日志系统获取
   - 摘要: 从WebSocket事件或Redis缓存获取

2. **权限**:
   - 需要租户隔离
   - 调试接口仅限开发环境启用

3. **性能**:
   - 日志接口支持分页
   - 摘要接口支持会话过滤

## 测试要求

- 单元测试: 接口返回格式正确
- 集成测试: 租户隔离正确
- 性能测试: 日志接口响应时间<500ms

## 前端状态

前端调试页面已完成，等待后端接口实现。
页面位置: `frontend/src/pages/DebugPage.tsx`
服务位置: `frontend/src/services/dispatcher.ts`