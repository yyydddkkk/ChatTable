import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ChatArea } from '../components/ChatArea';
import { ChatHeader } from '../components/ChatHeader';
import { ConversationInsightsPanel } from '../components/ConversationInsightsPanel';
import MessageInput from '../components/MessageInput';
import { PlutoLoader } from '../components/PlutoLoader';
import { WS_ENDPOINTS } from '../config/api';
import { useAgentStore, type Agent } from '../stores/agentStore';
import { useAuthStore } from '../stores/authStore';
import { useConversationStore } from '../stores/conversationStore';
import { useTenantStore } from '../stores/tenantStore';
import type { Message } from '../types';

interface ChatPageProps {
  agentId?: number;
  conversationId?: number;
  onBack?: () => void;
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
  plannerOutputPreview?: string;
  retryCount: number;
  selectedAgents: number[];
  type: 'summary' | 'degraded';
}

export default function ChatPage({ agentId, conversationId, onBack }: ChatPageProps) {
  const { agents } = useAgentStore();
  const accessToken = useAuthStore((state) => state.accessToken);
  const tenantId = useTenantStore((state) => state.tenantId);
  const {
    currentConversation,
    messages,
    setCurrentConversation,
    createConversation,
    fetchConversations,
    addMessage,
  } = useConversationStore();

  const wsRef = useRef<WebSocket | null>(null);
  const lastInitKey = useRef('');
  const [thinkingAgents, setThinkingAgents] = useState<Set<number>>(new Set());
  const [streamingMessages, setStreamingMessages] = useState<Map<number, string>>(new Map());
  const [conversationMembers, setConversationMembers] = useState<Agent[]>([]);
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [dispatchDebugEntries, setDispatchDebugEntries] = useState<DispatcherDebugEntry[]>([]);
  const [showDispatchPanel, setShowDispatchPanel] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const isDispatchPanelEnabled = import.meta.env.DEV;

  const selectedAgent = agentId ? agents.find((agent) => agent.id === agentId) ?? null : null;

  useEffect(() => {
    const initKey = `${agentId ?? ''}-${conversationId ?? ''}`;
    if (lastInitKey.current === initKey) return;
    lastInitKey.current = initKey;

    const initConversation = async () => {
      setIsInitializing(true);
      try {
        if (conversationId) {
          const fetchedConversations = await fetchConversations();
          const matchedConversation = fetchedConversations.find(
            (conversation) => conversation.id === conversationId,
          );
          if (matchedConversation) {
            setCurrentConversation(matchedConversation);
            const members = JSON.parse(matchedConversation.members) as number[];
            const matchedAgents = members
              .map((memberId) => agents.find((agent) => agent.id === memberId))
              .filter((entry): entry is Agent => Boolean(entry));
            setConversationMembers(matchedAgents);
            setIsGroupChat(matchedConversation.type === 'group');
          }
        } else if (agentId) {
          const fetchedConversations = await fetchConversations();
          const existingConversation = fetchedConversations.find((conversation) => {
            if (conversation.type !== 'private') return false;
            try {
              return (JSON.parse(conversation.members) as number[]).includes(agentId);
            } catch {
              return false;
            }
          });
          if (existingConversation) {
            setCurrentConversation(existingConversation);
            setConversationMembers(selectedAgent ? [selectedAgent] : []);
            setIsGroupChat(false);
            return;
          }
          const newConversation = await createConversation({
            type: 'private',
            name: selectedAgent?.name || 'New conversation',
            members: JSON.stringify([agentId]),
          });
          if (newConversation) {
            setCurrentConversation(newConversation);
            setConversationMembers(selectedAgent ? [selectedAgent] : []);
            setIsGroupChat(false);
          }
        }
      } finally {
        setIsInitializing(false);
      }
    };

    void initConversation();
  }, [
    agentId,
    agents,
    conversationId,
    createConversation,
    fetchConversations,
    selectedAgent,
    setCurrentConversation,
  ]);

  const conversationIdForWs = currentConversation?.id;

  useEffect(() => {
    if (!conversationIdForWs) return;
    const websocket = new WebSocket(
      WS_ENDPOINTS.conversation(conversationIdForWs, tenantId, accessToken ?? undefined),
    );
    wsRef.current = websocket;

    const handleMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data) as Record<string, unknown>;
      switch (data.type) {
        case 'ping':
          websocket.send(JSON.stringify({ type: 'pong' }));
          break;
        case 'user_message':
          if (data.message) useConversationStore.getState().addMessage(data.message as Message);
          break;
        case 'agent_thinking':
          if (typeof data.agent_id === 'number') {
            setThinkingAgents((previous) => new Set([...previous, data.agent_id as number]));
            setStreamingMessages((previous) => new Map(previous).set(data.agent_id as number, ''));
          }
          break;
        case 'agent_message_chunk':
          if (typeof data.agent_id === 'number' && typeof data.content === 'string') {
            setStreamingMessages((previous) => {
              const next = new Map(previous);
              next.set(
                data.agent_id as number,
                `${next.get(data.agent_id as number) || ''}${data.content}`,
              );
              return next;
            });
          }
          break;
        case 'agent_done':
          if (typeof data.agent_id === 'number') {
            setThinkingAgents((previous) => {
              const next = new Set(previous);
              next.delete(data.agent_id as number);
              return next;
            });
            setStreamingMessages((previous) => {
              const next = new Map(previous);
              next.delete(data.agent_id as number);
              return next;
            });
          }
          if (data.message) useConversationStore.getState().addMessage(data.message as Message);
          break;
        case 'error':
          setThinkingAgents(new Set());
          break;
        case 'cleared':
          useConversationStore.getState().clearMessages();
          break;
        case 'dispatcher_summary':
          if (isDispatchPanelEnabled) {
            const contextData =
              typeof data.context === 'object' && data.context !== null
                ? (data.context as Record<string, unknown>)
                : null;
            const planData =
              typeof data.plan === 'object' && data.plan !== null
                ? (data.plan as Record<string, unknown>)
                : null;
            const entry: DispatcherDebugEntry = {
              type: 'summary',
              createdAt: new Date().toISOString(),
              context: contextData
                ? {
                    rawContent:
                      typeof contextData.raw_content === 'string'
                        ? contextData.raw_content
                        : undefined,
                    cleanedContent:
                      typeof contextData.cleaned_content === 'string'
                        ? contextData.cleaned_content
                        : undefined,
                    activeAgentIds: Array.isArray(contextData.active_agent_ids)
                      ? contextData.active_agent_ids
                          .map((item) => Number(item))
                          .filter((id) => !Number.isNaN(id))
                      : [],
                    mentionedIds: Array.isArray(contextData.mentioned_ids)
                      ? contextData.mentioned_ids
                          .map((item) => Number(item))
                          .filter((id) => !Number.isNaN(id))
                      : [],
                    missingMentionedIds: Array.isArray(contextData.missing_mentioned_ids)
                      ? contextData.missing_mentioned_ids
                          .map((item) => Number(item))
                          .filter((id) => !Number.isNaN(id))
                      : [],
                    isGroup:
                      typeof contextData.is_group === 'boolean'
                        ? contextData.is_group
                        : undefined,
                  }
                : undefined,
              selectedAgents: Array.isArray(data.selected_agents)
                ? data.selected_agents
                    .map((item) => Number(item))
                    .filter((id) => !Number.isNaN(id))
                : [],
              fallback: Boolean(data.fallback),
              failureType:
                typeof data.failure_type === 'string' ? data.failure_type : undefined,
              retryCount: typeof data.retry_count === 'number' ? data.retry_count : 0,
              latencyMs: typeof data.latency_ms === 'number' ? data.latency_ms : 0,
              messageId: typeof data.message_id === 'number' ? data.message_id : undefined,
              plannerOutputPreview:
                typeof data.planner_output_preview === 'string'
                  ? data.planner_output_preview
                  : undefined,
              plan: planData
                ? {
                    planId:
                      typeof planData.plan_id === 'string' ? planData.plan_id : undefined,
                    selectedAgents: Array.isArray(planData.selected_agents)
                      ? planData.selected_agents
                          .filter(
                            (item): item is Record<string, unknown> =>
                              typeof item === 'object' && item !== null,
                          )
                          .map((item) => ({
                            agentId: Number(item.agent_id),
                            priority: Number(item.priority),
                            reasonTag:
                              typeof item.reason_tag === 'string'
                                ? item.reason_tag
                                : 'unknown',
                          }))
                          .filter((item) => !Number.isNaN(item.agentId))
                      : [],
                    executionGraph: Array.isArray(planData.execution_graph)
                      ? planData.execution_graph
                          .filter(
                            (item): item is Record<string, unknown> =>
                              typeof item === 'object' && item !== null,
                          )
                          .map((item) => ({
                            stage: Number(item.stage),
                            mode:
                              typeof item.mode === 'string' ? item.mode : 'parallel',
                            agents: Array.isArray(item.agents)
                              ? item.agents
                                  .map((member) => Number(member))
                                  .filter((id) => !Number.isNaN(id))
                              : [],
                          }))
                          .filter((item) => !Number.isNaN(item.stage))
                      : [],
                    roundControl:
                      typeof planData.round_control === 'object' &&
                      planData.round_control !== null
                        ? {
                            maxRounds: Number(
                              (planData.round_control as Record<string, unknown>).max_rounds,
                            ),
                            triggerNextRound: Boolean(
                              (planData.round_control as Record<string, unknown>)
                                .trigger_next_round,
                            ),
                            nextRoundCandidates: Array.isArray(
                              (planData.round_control as Record<string, unknown>)
                                .next_round_candidates,
                            )
                              ? (
                                  (planData.round_control as Record<string, unknown>)
                                    .next_round_candidates as unknown[]
                                )
                                  .map((item) => Number(item))
                                  .filter((id) => !Number.isNaN(id))
                              : [],
                          }
                        : undefined,
                    deferredCandidates: Array.isArray(planData.deferred_candidates)
                      ? planData.deferred_candidates
                          .map((item) => Number(item))
                          .filter((id) => !Number.isNaN(id))
                      : [],
                  }
                : undefined,
            };
            setDispatchDebugEntries((previous) => [entry, ...previous].slice(0, 20));
          }
          break;
        default:
          break;
      }
    };

    websocket.addEventListener('message', handleMessage);
    return () => {
      websocket.removeEventListener('message', handleMessage);
      websocket.close();
      wsRef.current = null;
    };
  }, [accessToken, conversationIdForWs, isDispatchPanelEnabled, tenantId]);

  const handleSend = useCallback((content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'user_message', content }));
    }
  }, []);

  const handleCommand = useCallback(
    (command: string, args: string) => {
      void args;
      if (command === 'clear' && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'clear' }));
        return;
      }
      if (command === 'help') {
        addMessage({
          id: Date.now(),
          conversation_id: currentConversation?.id || 0,
          sender_type: 'agent',
          sender_id: 0,
          content: ['可用命令:', '/clear - 清除聊天记录', '/help - 显示帮助'].join('\n'),
          created_at: new Date().toISOString(),
        });
      }
    },
    [addMessage, currentConversation],
  );

  const streamingDisplayMessages = useMemo(() => {
    const items: Message[] = [];
    streamingMessages.forEach((content, activeAgentId) => {
      if (!content) return;
      items.push({
        id: -activeAgentId,
        conversation_id: currentConversation?.id || 0,
        sender_type: 'agent',
        sender_id: activeAgentId,
        content,
        created_at: new Date().toISOString(),
      });
    });
    return items;
  }, [currentConversation, streamingMessages]);

  const displayMessages = useMemo(
    () => [...messages, ...streamingDisplayMessages],
    [messages, streamingDisplayMessages],
  );
  const displayAgents = useMemo(
    () =>
      isGroupChat && conversationMembers.length > 0
        ? conversationMembers
        : selectedAgent
          ? [selectedAgent]
          : [],
    [conversationMembers, isGroupChat, selectedAgent],
  );
  const thinkingAgentId =
    thinkingAgents.size > 0 ? Array.from(thinkingAgents.values())[0] : undefined;

  return (
    <div className="pluto-chat-layout flex h-full min-h-0 min-w-0 flex-1 overflow-hidden">
      <div className="pluto-chat-main flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <ChatHeader
          agent={selectedAgent}
          agents={displayAgents}
          conversation={currentConversation}
          isGroup={isGroupChat}
          onMoreClick={() => setShowInsights(true)}
        />

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="absolute left-6 top-6 rounded-full border border-[--color-border] bg-[--color-surface] px-4 py-2 text-sm text-[--color-text]"
          >
            返回
          </button>
        )}

        {isInitializing ? (
          <div className="flex flex-1 items-center justify-center px-8">
            <div className="rounded-[28px] border border-[--color-border-light] bg-[--color-surface]/80 px-8 py-7 text-center backdrop-blur-xl">
              <PlutoLoader label="正在连接会话..." />
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
          </>
        )}
      </div>

      {showInsights && (
        <>
          <div
            className="absolute inset-0 z-20 bg-black/8 backdrop-blur-[2px]"
            onClick={() => setShowInsights(false)}
          />
          <div className="absolute inset-y-3 right-3 z-30 w-[320px] max-w-full overflow-hidden rounded-[28px] pluto-insights-shell">
            <ConversationInsightsPanel
              agent={selectedAgent}
              agents={displayAgents}
              conversation={currentConversation}
              isGroup={isGroupChat}
            />
          </div>
        </>
      )}

      {isDispatchPanelEnabled && showDispatchPanel && (
        <div className="absolute bottom-6 right-6 z-30 w-[340px] rounded-[24px] border border-[--color-border-light] bg-[--color-surface]/92 p-4 shadow-[0_24px_60px_rgba(7,10,24,0.2)] backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium leading-6 text-[--color-text]">
              Dispatcher Dev Panel
            </p>
            <button
              type="button"
              onClick={() => setShowDispatchPanel(false)}
              className="rounded-full border border-[--color-border] bg-[--color-surface-elevated] px-3 py-1 text-xs text-[--color-text-muted]"
            >
              Hide
            </button>
          </div>
          <div className="max-h-80 space-y-3 overflow-y-auto">
            {dispatchDebugEntries.length === 0 ? (
              <div className="rounded-2xl bg-[--color-surface-elevated] px-3 py-3 text-sm leading-6 text-[--color-text-muted]">
                等待调度器事件…
              </div>
            ) : (
              dispatchDebugEntries.map((entry, index) => (
                <div
                  key={`${entry.createdAt}-${index}`}
                  className="rounded-2xl border border-[--color-border] bg-[--color-surface-elevated] px-3 py-3 text-xs leading-5 text-[--color-text-muted]"
                >
                  <p className="font-medium text-[--color-text]">
                    {entry.type === 'summary' ? 'Summary' : 'Degraded'}
                  </p>
                  <p className="mt-1">selected=[{entry.selectedAgents.join(', ')}]</p>
                  <p>
                    fallback={String(entry.fallback)} retry={entry.retryCount} latency=
                    {entry.latencyMs}ms
                  </p>
                  {entry.context?.mentionedIds && (
                    <p>mentioned=[{entry.context.mentionedIds.join(', ')}]</p>
                  )}
                  {entry.plan?.planId && <p>plan={entry.plan.planId}</p>}
                  {entry.failureType && (
                    <p className="text-amber-500">failure={entry.failureType}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
