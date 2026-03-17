import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useAgentStore, type Agent } from '../stores/agentStore';
import { useAuthStore } from '../stores/authStore';
import { useConversationStore } from '../stores/conversationStore';
import type { Conversation, Message } from '../types';
import { ChatArea } from '../components/ChatArea';
import MessageInput from '../components/MessageInput';
import { ChatHeader } from '../components/ChatHeader';
import { WS_ENDPOINTS } from '../config/api';
import { useTenantStore } from '../stores/tenantStore';

interface ChatPageProps {
  agentId?: number;
  conversationId?: number;
  onBack?: () => void;
  onOpenDetail?: () => void;
}

interface DispatcherSelectedAgentDetail {
  agentId: number;
  priority: number;
  reasonTag: string;
}

interface DispatcherExecutionStageDetail {
  stage: number;
  mode: string;
  agents: number[];
}

interface DispatcherRoundControlDetail {
  maxRounds: number;
  triggerNextRound: boolean;
  nextRoundCandidates: number[];
}

interface DispatcherContextDetail {
  rawContent?: string;
  cleanedContent?: string;
  activeAgentIds: number[];
  mentionedIds: number[];
  missingMentionedIds: number[];
  isGroup?: boolean;
}

interface DispatcherPlanDetail {
  planId?: string;
  selectedAgents: DispatcherSelectedAgentDetail[];
  executionGraph: DispatcherExecutionStageDetail[];
  roundControl?: DispatcherRoundControlDetail;
  deferredCandidates: number[];
}

interface DispatcherDebugEntry {
  context?: DispatcherContextDetail;
  createdAt: string;
  fallback: boolean;
  failureType?: string;
  latencyMs: number;
  messageId?: number;
  plan?: DispatcherPlanDetail;
  retryCount: number;
  selectedAgents: number[];
  type: 'summary' | 'degraded';
}

export default function ChatPage({ agentId, conversationId, onBack, onOpenDetail }: ChatPageProps) {
  const { agents } = useAgentStore();
  const accessToken = useAuthStore((state) => state.accessToken);
  const { currentConversation, messages, setCurrentConversation, createConversation, fetchConversations, addMessage } = useConversationStore();
  const tenantId = useTenantStore((state) => state.tenantId);
  const wsRef = useRef<WebSocket | null>(null);
  const [thinkingAgents, setThinkingAgents] = useState<Set<number>>(new Set());
  const [streamingMessages, setStreamingMessages] = useState<Map<number, string>>(new Map());
  const streamingAgentIds = useRef<Set<number>>(new Set());
  const [conversationMembers, setConversationMembers] = useState<Agent[]>([]);
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [dispatchDebugEntries, setDispatchDebugEntries] = useState<DispatcherDebugEntry[]>([]);
  const [showDispatchPanel, setShowDispatchPanel] = useState(true);
  const isDispatchPanelEnabled = import.meta.env.DEV;

  const agent = agentId ? agents.find((a) => a.id === agentId) : null;
  const lastInitKey = useRef<string>('');

  useEffect(() => {
    const key = `${agentId ?? ''}-${conversationId ?? ''}`;
    if (lastInitKey.current === key) return;
    lastInitKey.current = key;

    const initConversation = async () => {
      setIsInitializing(true);
      try {
        if (conversationId) {
          const convs = await fetchConversations();
          const conv = convs?.find((c: Conversation) => c.id === conversationId);
          if (conv) {
            setCurrentConversation(conv);
            setIsGroupChat(conv.type === 'group');

            if (conv.type === 'group') {
              try {
                const memberIds = JSON.parse(conv.members);
                const members = memberIds.map((id: number) => agents.find((a) => a.id === id)).filter(Boolean) as Agent[];
                setConversationMembers(members);
              } catch {
                // ignore parse errors
              }
            }
          }
        } else if (agentId) {
          // Check if a private conversation already exists for this agent
          const convs = await fetchConversations();
          const existing = convs?.find((c: Conversation) => {
            if (c.type !== 'private') return false;
            try {
              const memberIds = JSON.parse(c.members);
              return memberIds.includes(agentId);
            } catch {
              return false;
            }
          });

          if (existing) {
            setCurrentConversation(existing);
          } else {
            const agentData = agents.find((a) => a.id === agentId);
            const conv = await createConversation({
              type: 'private',
              name: agentData?.name || 'Chat',
              members: JSON.stringify([agentId]),
            });
            if (conv) {
              setCurrentConversation(conv);
            }
          }
        }
      } finally {
        setIsInitializing(false);
      }
    };

    initConversation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, conversationId]);

  const conversationIdForWs = currentConversation?.id;

  useEffect(() => {
    if (!conversationIdForWs) return;

    const websocket = new WebSocket(
      WS_ENDPOINTS.conversation(conversationIdForWs, tenantId, accessToken ?? undefined),
    );
    wsRef.current = websocket;

    const handleMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);

      if (data.type === 'ping') {
        websocket.send(JSON.stringify({ type: 'pong' }));
      } else if (data.type === 'user_message') {
        useConversationStore.getState().addMessage(data.message);
      } else if (data.type === 'agent_thinking') {
        setThinkingAgents((prev) => new Set([...prev, data.agent_id]));
        streamingAgentIds.current.add(data.agent_id);
        setStreamingMessages((prev) => new Map(prev).set(data.agent_id, ''));
      } else if (data.type === 'agent_message_chunk') {
        setStreamingMessages((prev) => {
          const newMap = new Map(prev);
          const current = newMap.get(data.agent_id) || '';
          newMap.set(data.agent_id, current + data.content);
          return newMap;
        });
      } else if (data.type === 'agent_done') {
        setThinkingAgents((prev) => {
          const newSet = new Set(prev);
          newSet.delete(data.agent_id);
          return newSet;
        });
        streamingAgentIds.current.delete(data.agent_id);
        if (data.error) {
          console.error('Agent error:', data.error_message);
        } else if (data.message) {
          useConversationStore.getState().addMessage(data.message);
        }
        setStreamingMessages((prev) => {
          const newMap = new Map(prev);
          newMap.delete(data.agent_id);
          return newMap;
        });
      } else if (data.type === 'error') {
        console.error('WebSocket error:', data.message);
        setThinkingAgents(new Set());
      } else if (data.type === 'length_set') {
        // length is now per-agent config, no local state needed
      } else if (data.type === 'topic_switched') {
        // Handle topic switched
      } else if (data.type === 'cleared') {
        useConversationStore.getState().clearMessages();
      } else if (data.type === 'dispatcher_summary' && isDispatchPanelEnabled) {
        const contextData = (typeof data.context === 'object' && data.context !== null)
          ? (data.context as Record<string, unknown>)
          : null;
        const planData = (typeof data.plan === 'object' && data.plan !== null)
          ? (data.plan as Record<string, unknown>)
          : null;

        const context: DispatcherContextDetail | undefined = contextData ? {
          rawContent: typeof contextData.raw_content === 'string' ? contextData.raw_content : undefined,
          cleanedContent: typeof contextData.cleaned_content === 'string' ? contextData.cleaned_content : undefined,
          activeAgentIds: Array.isArray(contextData.active_agent_ids)
            ? contextData.active_agent_ids
                .map((item: unknown) => Number(item))
                .filter((id: number) => !Number.isNaN(id))
            : [],
          mentionedIds: Array.isArray(contextData.mentioned_ids)
            ? contextData.mentioned_ids
                .map((item: unknown) => Number(item))
                .filter((id: number) => !Number.isNaN(id))
            : [],
          missingMentionedIds: Array.isArray(contextData.missing_mentioned_ids)
            ? contextData.missing_mentioned_ids
                .map((item: unknown) => Number(item))
                .filter((id: number) => !Number.isNaN(id))
            : [],
          isGroup: typeof contextData.is_group === 'boolean' ? contextData.is_group : undefined,
        } : undefined;

        const plan: DispatcherPlanDetail | undefined = planData ? {
          planId: typeof planData.plan_id === 'string' ? planData.plan_id : undefined,
          selectedAgents: Array.isArray(planData.selected_agents)
            ? planData.selected_agents
                .filter((item: unknown) => typeof item === 'object' && item !== null)
                .map((item: unknown) => {
                  const row = item as Record<string, unknown>;
                  return {
                    agentId: Number(row.agent_id),
                    priority: Number(row.priority),
                    reasonTag: typeof row.reason_tag === 'string' ? row.reason_tag : 'unknown',
                  };
                })
                .filter((item: DispatcherSelectedAgentDetail) => !Number.isNaN(item.agentId))
            : [],
          executionGraph: Array.isArray(planData.execution_graph)
            ? planData.execution_graph
                .filter((item: unknown) => typeof item === 'object' && item !== null)
                .map((item: unknown) => {
                  const row = item as Record<string, unknown>;
                  return {
                    stage: Number(row.stage),
                    mode: typeof row.mode === 'string' ? row.mode : 'parallel',
                    agents: Array.isArray(row.agents)
                      ? row.agents
                          .map((agentId: unknown) => Number(agentId))
                          .filter((agentId: number) => !Number.isNaN(agentId))
                      : [],
                  };
                })
                .filter((item: DispatcherExecutionStageDetail) => !Number.isNaN(item.stage))
            : [],
          roundControl: (typeof planData.round_control === 'object' && planData.round_control !== null)
            ? {
                maxRounds: Number((planData.round_control as Record<string, unknown>).max_rounds),
                triggerNextRound: Boolean((planData.round_control as Record<string, unknown>).trigger_next_round),
                nextRoundCandidates: Array.isArray((planData.round_control as Record<string, unknown>).next_round_candidates)
                  ? ((planData.round_control as Record<string, unknown>).next_round_candidates as unknown[])
                      .map((item: unknown) => Number(item))
                      .filter((id: number) => !Number.isNaN(id))
                  : [],
              }
            : undefined,
          deferredCandidates: Array.isArray(planData.deferred_candidates)
            ? planData.deferred_candidates
                .map((item: unknown) => Number(item))
                .filter((id: number) => !Number.isNaN(id))
            : [],
        } : undefined;

        const entry: DispatcherDebugEntry = {
          type: 'summary',
          createdAt: new Date().toISOString(),
          context,
          selectedAgents: Array.isArray(data.selected_agents)
            ? data.selected_agents.map((item: unknown) => Number(item)).filter((id: number) => !Number.isNaN(id))
            : [],
          fallback: Boolean(data.fallback),
          failureType: typeof data.failure_type === 'string' ? data.failure_type : undefined,
          retryCount: typeof data.retry_count === 'number' ? data.retry_count : 0,
          latencyMs: typeof data.latency_ms === 'number' ? data.latency_ms : 0,
          messageId: typeof data.message_id === 'number' ? data.message_id : undefined,
          plan,
        };
        setDispatchDebugEntries((prev) => [entry, ...prev].slice(0, 30));
      }
    };

    websocket.addEventListener('message', handleMessage);

    return () => {
      websocket.removeEventListener('message', handleMessage);
      websocket.close();
      wsRef.current = null;
    };
  }, [conversationIdForWs, tenantId, accessToken]);

  const handleSend = useCallback((content: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'user_message',
        content,
      }));
    }
  }, []);

  const handleCommand = useCallback((command: string, _args: string) => {
    if (command === 'clear' && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'clear' }));
    } else if (command === 'help') {
      const helpText = '可用命令:\n/clear - 清除聊天记录\n/help - 显示帮助';
      addMessage({
        id: Date.now(),
        conversation_id: currentConversation?.id || 0,
        sender_type: 'agent',
        sender_id: 0,
        content: helpText,
        created_at: new Date().toISOString(),
      });
    }
  }, [addMessage, currentConversation]);

  const getStreamingMessages = useCallback((): Message[] => {
    const streaming: Message[] = [];
    streamingMessages.forEach((content, agentId) => {
      if (content) {
        streaming.push({
          id: -agentId,
          conversation_id: currentConversation?.id || 0,
          sender_type: 'agent',
          sender_id: agentId,
          content,
          created_at: new Date().toISOString(),
        });
      }
    });
    return streaming;
  }, [streamingMessages, currentConversation]);

  const displayMessages = useMemo(
    () => [...messages, ...getStreamingMessages()],
    [messages, getStreamingMessages]
  );

  const displayAgents = useMemo(
    () => (isGroupChat && conversationMembers.length > 0
      ? conversationMembers 
      : (agent ? [agent] : [])),
    [isGroupChat, conversationMembers, agent]
  );

  const thinkingAgentId = thinkingAgents.size > 0 ? Array.from(thinkingAgents)[0] : undefined;

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[--color-background]">
      <ChatHeader
        agent={agent}
        agents={displayAgents}
        isGroup={isGroupChat}
        onMoreClick={onOpenDetail}
      />

      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-4 left-4 p-2 text-text-muted hover:text-text bg-surface rounded-lg transition z-10"
        >
          ← Back
        </button>
      )}

      {isInitializing ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div
              className="w-10 h-10 rounded-full mx-auto mb-3 animate-spin"
              style={{ border: '2px solid rgba(234,120,80,0.2)', borderTopColor: 'var(--color-primary)' }}
            />
            <p className="text-sm text-[--color-text-muted]">正在连接会话...</p>
          </div>
        </div>
      ) : (
        <>
          <ChatArea
            messages={displayMessages}
            thinkingAgentId={thinkingAgentId}
            thinkingAgentIds={Array.from(thinkingAgents)}
          />

          <MessageInput
            onSend={handleSend}
            onCommand={handleCommand}
            disabled={thinkingAgents.size > 0}
            agents={isGroupChat ? displayAgents : []}
          />

          {isDispatchPanelEnabled && (
            <div className="absolute right-4 bottom-4 z-20 w-80 rounded-lg border border-black/10 bg-white/95 p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-semibold tracking-wide text-slate-700">
                  Dispatcher Dev Panel
                </div>
                <button
                  onClick={() => setShowDispatchPanel((prev) => !prev)}
                  className="rounded border border-slate-200 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100"
                >
                  {showDispatchPanel ? 'Hide' : 'Show'}
                </button>
              </div>

              {showDispatchPanel && (
                <div className="max-h-56 space-y-2 overflow-auto pr-1">
                  {dispatchDebugEntries.length === 0 && (
                    <div className="text-xs text-slate-500">
                      Waiting for dispatcher events...
                    </div>
                  )}
                  {dispatchDebugEntries.map((entry, index) => (
                    <div
                      key={`${entry.createdAt}-${entry.type}-${index}`}
                      className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs"
                    >
                      <div className="font-medium text-slate-700">
                        {entry.type === 'summary' ? 'Summary' : 'Degraded'}
                      </div>
                      <div className="text-slate-600">
                        selected=[{entry.selectedAgents.join(',')}]
                      </div>
                      {entry.context && (
                        <div className="text-slate-600">
                          mentioned=[{entry.context.mentionedIds.join(',')}]
                        </div>
                      )}
                      {entry.plan && (
                        <div className="text-slate-600">
                          plan={entry.plan.planId ?? 'unknown'}
                        </div>
                      )}
                      <div className="text-slate-600">
                        fallback={String(entry.fallback)} retry={entry.retryCount} latency={entry.latencyMs}ms
                      </div>
                      {entry.context && entry.context.missingMentionedIds.length > 0 && (
                        <div className="text-amber-700">
                          missing_mentioned=[{entry.context.missingMentionedIds.join(',')}]
                        </div>
                      )}
                      {entry.plan && entry.plan.selectedAgents.length > 0 && (
                        <div className="text-slate-600">
                          reasons={entry.plan.selectedAgents
                            .map((item) => `${item.agentId}:${item.reasonTag}(${item.priority})`)
                            .join(', ')}
                        </div>
                      )}
                      {entry.plan && entry.plan.executionGraph.length > 0 && (
                        <div className="text-slate-600">
                          graph={entry.plan.executionGraph
                            .map((stage) => `s${stage.stage}-${stage.mode}[${stage.agents.join(',')}]`)
                            .join(' | ')}
                        </div>
                      )}
                      {entry.context?.rawContent && (
                        <div className="text-slate-500">
                          input={entry.context.rawContent.slice(0, 80)}
                        </div>
                      )}
                      {entry.context?.cleanedContent && entry.context.cleanedContent !== entry.context.rawContent && (
                        <div className="text-slate-500">
                          cleaned={entry.context.cleanedContent.slice(0, 80)}
                        </div>
                      )}
                      {entry.failureType && (
                        <div className="text-rose-700">failure={entry.failureType}</div>
                      )}
                      {entry.failureType === 'missing_api_key' && (
                        <div className="text-amber-700">
                          hint: set DISPATCHER_PLANNER_API_KEY in backend .env
                        </div>
                      )}
                      {entry.messageId !== undefined && (
                        <div className="text-slate-500">message_id={entry.messageId}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
