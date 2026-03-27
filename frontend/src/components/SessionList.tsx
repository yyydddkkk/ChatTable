import type { FC } from 'react';
import { MessageCircle } from 'lucide-react';

import type { Agent } from '../stores/agentStore';
import type { Conversation } from '../types';
import { AgentAvatar } from './AgentAvatar';
import { GroupAvatar } from './GroupAvatar';
import { SearchField } from './SearchField';

interface SessionListProps {
  agents: Agent[];
  conversations: Conversation[];
  activeId: number | null;
  activeConversationId: number | null;
  onSelectAgent: (agentId: number) => void;
  onSelectConversation: (conversationId: number) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

interface SessionItem {
  id: number;
  type: 'agent' | 'conversation';
  title: string;
  preview: string;
  timeLabel: string;
  isGroup: boolean;
  members: number[];
  agent?: Agent;
}

function parseMembers(raw: string): number[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((item) => Number(item)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function formatTimeLabel(timestamp?: string): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function buildConversationPreview(conversation: Conversation): string {
  return conversation.type === 'group' ? '群聊' : '继续聊天';
}

function SectionTitle({ title }: { title: string }) {
  return (
    <p className="mb-3 px-2 text-xs font-medium tracking-[0.12em] text-[--color-text-subtle] uppercase">
      {title}
    </p>
  );
}

export const SessionList: FC<SessionListProps> = ({
  agents,
  conversations,
  activeId,
  activeConversationId,
  onSelectAgent,
  onSelectConversation,
  searchQuery,
  onSearchChange,
}) => {
  const loweredQuery = searchQuery.toLowerCase();
  const conversationItems: SessionItem[] = conversations
    .map((conversation) => ({
      id: conversation.id,
      type: 'conversation' as const,
      title: conversation.name,
      preview: buildConversationPreview(conversation),
      timeLabel: formatTimeLabel(conversation.last_message_at),
      isGroup: conversation.type === 'group',
      members: parseMembers(conversation.members),
    }))
    .filter((item) => item.title.toLowerCase().includes(loweredQuery));

  const agentItems: SessionItem[] = agents
    .filter((agent) =>
      [agent.name, agent.description || '', agent.tags || '']
        .join(' ')
        .toLowerCase()
        .includes(loweredQuery),
    )
    .map((agent) => ({
      id: agent.id,
      type: 'agent' as const,
      title: agent.name,
      preview: agent.description || '新对话',
      timeLabel: '',
      isGroup: false,
      members: [agent.id],
      agent,
    }));

  return (
    <aside className="pluto-session-list pluto-chat-sidebar hidden h-full min-h-0 w-[296px] shrink-0 p-4 lg:flex lg:flex-col">
      <div className="shrink-0">
        <p className="text-xs font-medium tracking-[0.14em] text-[--color-text-subtle] uppercase">消息</p>
        <div className="mt-4">
          <SearchField
            value={searchQuery}
            onChange={onSearchChange}
            placeholder="搜索"
          />
        </div>
      </div>

      <div className="pluto-sidebar-scroll mt-5 min-h-0 flex-1 space-y-6 overflow-y-auto">
        <section className="pluto-session-section">
          <SectionTitle title="最近" />
          <div className="space-y-2">
            {conversationItems.length === 0 ? (
              <div className="pluto-session-empty rounded-[20px] px-4 py-4 text-sm text-[--color-text-muted]">
                暂无会话
              </div>
            ) : (
              conversationItems.map((item) => {
                const active = activeConversationId === item.id;
                const memberAgents = item.members
                  .map((memberId) => agents.find((agent) => agent.id === memberId))
                  .filter((agent): agent is Agent => Boolean(agent));

                return (
                  <button
                    key={`conversation-${item.id}`}
                    type="button"
                    onClick={() => onSelectConversation(item.id)}
                    data-active={active ? 'true' : 'false'}
                    className="pluto-session-item flex w-full items-center gap-3 rounded-[22px] px-3 py-3 text-left transition"
                  >
                    {item.isGroup ? (
                      <GroupAvatar agents={memberAgents} size={44} />
                    ) : memberAgents[0] ? (
                      <AgentAvatar agent={memberAgents[0]} size={44} iconSize={19} />
                    ) : (
                      <div className="flex h-[44px] w-[44px] items-center justify-center rounded-[18px] bg-[color-mix(in_srgb,var(--color-surface-elevated)_86%,transparent)] text-[--color-primary]">
                        <MessageCircle size={17} />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-medium text-[--color-text]">{item.title}</p>
                        {item.timeLabel && (
                          <p className="shrink-0 text-[11px] text-[--color-text-subtle]">{item.timeLabel}</p>
                        )}
                      </div>
                      <p className="mt-1 truncate text-xs text-[--color-text-muted]">{item.preview}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="pluto-session-section">
          <SectionTitle title="Agent" />
          <div className="space-y-2">
            {agentItems.map((item) => {
              const active = activeId === item.id;
              return (
                <button
                  key={`agent-${item.id}`}
                  type="button"
                  onClick={() => onSelectAgent(item.id)}
                  data-active={active ? 'true' : 'false'}
                  className="pluto-session-item flex w-full items-center gap-3 rounded-[22px] px-3 py-3 text-left transition"
                >
                  {item.agent ? (
                    <AgentAvatar agent={item.agent} size={42} iconSize={18} />
                  ) : (
                    <div className="h-[42px] w-[42px]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[--color-text]">{item.title}</p>
                    <p className="mt-1 truncate text-xs text-[--color-text-muted]">{item.preview}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </aside>
  );
};
