import { useState, useEffect } from 'react';
import { getDispatcherStatus, getDispatcherLogs, getDispatcherSummaries, type DispatcherStatus, type DispatchLog, type DispatcherSummary } from '../services/dispatcher';
import { Bug, RefreshCw, Activity, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

export default function DebugPage() {
  const [status, setStatus] = useState<DispatcherStatus | null>(null);
  const [logs, setLogs] = useState<DispatchLog[]>([]);
  const [summaries, setSummaries] = useState<DispatcherSummary[]>([]);
  const [activeTab, setActiveTab] = useState<'status' | 'logs' | 'summaries'>('status');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statusData, logsData, summariesData] = await Promise.all([
        getDispatcherStatus(),
        getDispatcherLogs(100),
        getDispatcherSummaries(undefined, 50),
      ]);
      setStatus(statusData);
      setLogs(logsData);
      setSummaries(summariesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const renderStatus = () => {
    if (!status) return null;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface rounded-xl p-4" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Activity size={16} className="text-primary" />
              <span className="font-medium text-text">Dispatcher 状态</span>
            </div>
            <div className="text-2xl font-semibold text-text">
              {status.enabled ? '启用' : '禁用'}
            </div>
          </div>
          <div className="bg-surface rounded-xl p-4" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Clock size={16} className="text-primary" />
              <span className="font-medium text-text">运行模式</span>
            </div>
            <div className="text-2xl font-semibold text-text">{status.mode}</div>
          </div>
        </div>
        <div className="bg-surface rounded-xl p-4" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
          <h3 className="font-medium text-text mb-3">配置参数</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-text-muted">硬上限 (hard_cap)</div>
            <div className="text-text">{status.hard_cap}</div>
            <div className="text-text-muted">最大轮次 (max_rounds)</div>
            <div className="text-text">{status.max_rounds}</div>
            <div className="text-text-muted">规划模型</div>
            <div className="text-text">{status.planner_model}</div>
            <div className="text-text-muted">调试反馈</div>
            <div className="text-text">{status.debug_feedback ? '启用' : '禁用'}</div>
            <div className="text-text-muted">最后更新</div>
            <div className="text-text">{formatTimestamp(status.last_updated)}</div>
          </div>
        </div>
      </div>
    );
  };

  const renderLogs = () => {
    if (logs.length === 0) {
      return (
        <div className="text-center py-8 text-text-muted text-sm">
          暂无调度日志
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {logs.map((log, index) => (
          <div
            key={`${log.request_id}-${index}`}
            className="bg-surface rounded-xl p-4" style={{ border: '1px solid rgba(0,0,0,0.06)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {log.failure_type ? (
                  <AlertTriangle size={16} className="text-yellow-500" />
                ) : (
                  <CheckCircle size={16} className="text-green-500" />
                )}
                <span className="font-medium text-text">{log.event}</span>
              </div>
              <span className="text-xs text-text-muted">{formatTimestamp(log.timestamp)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-text-muted">会话 ID</div>
              <div className="text-text">{log.conversation_id}</div>
              <div className="text-text-muted">消息 ID</div>
              <div className="text-text">{log.message_id}</div>
              <div className="text-text-muted">请求 ID</div>
              <div className="text-text font-mono text-xs">{log.request_id}</div>
              <div className="text-text-muted">规划模型</div>
              <div className="text-text">{log.planner_model}</div>
              <div className="text-text-muted">延迟 (ms)</div>
              <div className="text-text">{log.latency_ms}</div>
              {log.failure_type && (
                <>
                  <div className="text-text-muted">失败类型</div>
                  <div className="text-red-500">{log.failure_type}</div>
                </>
              )}
              {log.retry_count > 0 && (
                <>
                  <div className="text-text-muted">重试次数</div>
                  <div className="text-text">{log.retry_count}</div>
                </>
              )}
              {log.fallback_strategy && (
                <>
                  <div className="text-text-muted">降级策略</div>
                  <div className="text-text">{log.fallback_strategy}</div>
                </>
              )}
              <div className="text-text-muted">选中的 Agent</div>
              <div className="text-text">{log.selected_agents.join(', ') || '无'}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSummaries = () => {
    if (summaries.length === 0) {
      return (
        <div className="text-center py-8 text-text-muted text-sm">
          暂无调度摘要
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {summaries.map((summary, index) => (
          <div
            key={`${summary.conversation_id}-${summary.message_id}-${index}`}
            className="bg-surface rounded-xl p-4" style={{ border: '1px solid rgba(0,0,0,0.06)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {summary.fallback ? (
                  <AlertTriangle size={16} className="text-yellow-500" />
                ) : (
                  <CheckCircle size={16} className="text-green-500" />
                )}
                <span className="font-medium text-text">
                  会话 {summary.conversation_id} - 消息 {summary.message_id}
                </span>
              </div>
              <span className="text-xs text-text-muted">{summary.latency_ms}ms</span>
            </div>
            
            <div className="mb-3">
              <div className="text-sm text-text-muted mb-1">原始内容:</div>
              <div className="text-sm text-text bg-background rounded p-2">
                {summary.context.raw_content}
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-sm text-text-muted mb-1">清理后内容:</div>
              <div className="text-sm text-text bg-background rounded p-2">
                {summary.context.cleaned_content}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-text-muted">选中的 Agent</div>
              <div className="text-text">{summary.selected_agents.join(', ') || '无'}</div>
              <div className="text-text-muted">活跃 Agent</div>
              <div className="text-text">{summary.context.active_agent_ids.join(', ') || '无'}</div>
              <div className="text-text-muted">提及的 Agent</div>
              <div className="text-text">{summary.context.mentioned_ids.join(', ') || '无'}</div>
              <div className="text-text-muted">缺失提及的 Agent</div>
              <div className="text-text">{summary.context.missing_mentioned_ids.join(', ') || '无'}</div>
              <div className="text-text-muted">是否群聊</div>
              <div className="text-text">{summary.context.is_group ? '是' : '否'}</div>
              {summary.fallback && (
                <>
                  <div className="text-text-muted">失败类型</div>
                  <div className="text-red-500">{summary.failure_type}</div>
                </>
              )}
              {summary.retry_count > 0 && (
                <>
                  <div className="text-text-muted">重试次数</div>
                  <div className="text-text">{summary.retry_count}</div>
                </>
              )}
            </div>
            
            <div className="mt-3">
              <div className="text-sm text-text-muted mb-1">计划详情:</div>
              <div className="text-xs text-text bg-background rounded p-2 font-mono overflow-x-auto">
                <pre>{JSON.stringify(summary.plan, null, 2)}</pre>
              </div>
            </div>
            
            {summary.planner_output_preview && (
              <div className="mt-3">
                <div className="text-sm text-text-muted mb-1">规划器输出预览:</div>
                <div className="text-xs text-text bg-background rounded p-2 font-mono overflow-x-auto">
                  {summary.planner_output_preview}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[--color-background]">
      <div className="max-w-4xl mx-auto py-8 px-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Bug size={24} className="text-primary" />
            <h1 className="text-2xl font-semibold text-text">Dispatcher 调试</h1>
          </div>
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition bg-primary text-white hover:opacity-90 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            刷新
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="text-red-600 text-sm">{error}</div>
          </div>
        )}

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('status')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'status'
                ? 'bg-primary text-white'
                : 'bg-surface text-text hover:bg-background'
            }`}
          >
            状态
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'logs'
                ? 'bg-primary text-white'
                : 'bg-surface text-text hover:bg-background'
            }`}
          >
            日志
          </button>
          <button
            onClick={() => setActiveTab('summaries')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'summaries'
                ? 'bg-primary text-white'
                : 'bg-surface text-text hover:bg-background'
            }`}
          >
            摘要
          </button>
        </div>

        <div>
          {activeTab === 'status' && renderStatus()}
          {activeTab === 'logs' && renderLogs()}
          {activeTab === 'summaries' && renderSummaries()}
        </div>
      </div>
    </div>
  );
}