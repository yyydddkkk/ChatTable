import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ChevronRight,
  MessageCircle,
  Plus,
  Settings2,
  Users,
} from 'lucide-react';

import AgentDetailSidebar from '../components/AgentDetailSidebar';
import { AgentAvatar } from '../components/AgentAvatar';
import CreateAgentModal from '../components/CreateAgentModal';
import CreateGroupModal from '../components/CreateGroupModal';
import { GroupAvatar } from '../components/GroupAvatar';
import { PlutoLoader } from '../components/PlutoLoader';
import { SearchField } from '../components/SearchField';
import { useAgentStore, type Agent } from '../stores/agentStore';
import { useConversationStore } from '../stores/conversationStore';
import type { Conversation } from '../types';

interface ContactsPageProps {
  onStartChat: (agentId: number) => void;
}

type PresenceTone = 'online' | 'recent' | 'idle';

function parseTags(raw?: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function parseMembers(raw: string): number[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map((item) => Number(item)).filter((item) => !Number.isNaN(item))
      : [];
  } catch {
    return [];
  }
}

function formatRelativeTime(timestamp?: string): string {
  if (!timestamp) return '最近';

  const now = Date.now();
  const value = new Date(timestamp).getTime();
  const diffMinutes = Math.max(0, Math.floor((now - value) / 60000));

  if (diffMinutes < 1) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} 小时前`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} 天前`;

  return new Date(timestamp).toLocaleDateString();
}

function buildRecentSummary(agent: Agent, conversation: Conversation): string {
  const description = agent.description?.trim();
  if (description) {
    return description;
  }

  if (conversation.last_message_at) {
    return '点击继续上一次对话';
  }

  return '开始一段新的对话';
}

function buildAllContactsSummary(agent: Agent): string {
  const description = agent.description?.trim();
  if (description) return description;
  return '开始一段新的对话';
}

function getPresence(
  agent: Agent,
  lastMessageAt?: string,
): { label: string; tone: PresenceTone } {
  if (agent.is_active) {
    return { label: '在线', tone: 'online' };
  }
  if (lastMessageAt) {
    return { label: '最近活跃', tone: 'recent' };
  }
  return { label: '待联系', tone: 'idle' };
}

function isConversationMatch(conversation: Conversation, query: string): boolean {
  if (!query) return true;
  return conversation.name.toLowerCase().includes(query);
}

function PresenceDot({ tone }: { tone: PresenceTone }) {
  const styles = {
    online: 'bg-emerald-500',
    recent: 'bg-[--color-primary]',
    idle: 'bg-[color-mix(in_srgb,var(--color-text)_18%,transparent)]',
  } as const;

  return <span className={`h-2 w-2 rounded-full ${styles[tone]}`} />;
}

function SectionLabel({ title, extra }: { title: string; extra?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 px-1">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-[--color-text-subtle]">
        {title}
      </p>
      {extra && <span className="text-xs text-[--color-text-subtle]">{extra}</span>}
    </div>
  );
}

function GroupCard({ children }: { children: ReactNode }) {
  return <div className="pluto-ios-group p-2">{children}</div>;
}

function ContactRow({
  agent,
  summary,
  activity,
  presence,
  tags = [],
  onConfigure,
  onOpenChat,
}: {
  agent: Agent;
  summary: string;
  activity?: string;
  presence: { label: string; tone: PresenceTone };
  tags?: string[];
  onConfigure: () => void;
  onOpenChat: () => void;
}) {
  return (
    <div className="pluto-ios-row flex items-center gap-3 rounded-[20px] px-3 py-2.5">
      <button type="button" onClick={onOpenChat} className="flex min-w-0 flex-1 items-center gap-3.5 text-left">
        <AgentAvatar agent={agent} size={46} iconSize={19} />

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-medium text-[--color-text]">{agent.name}</p>
              <div className="mt-1 flex items-center gap-2 text-[12px] text-[--color-text-subtle]">
                <PresenceDot tone={presence.tone} />
                <span>{presence.label}</span>
              </div>
            </div>
            {activity && <span className="shrink-0 text-[12px] text-[--color-text-subtle]">{activity}</span>}
          </div>

          <p className="mt-1 truncate text-[13px] text-[--color-text-muted]">{summary}</p>

          {tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span key={tag} className="pluto-inline-tag rounded-full px-2.5 py-1 text-[11px]">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </button>

      <button
        type="button"
        onClick={onConfigure}
        className="pluto-ios-icon-button flex h-9 w-9 items-center justify-center rounded-full text-[--color-text-subtle] transition hover:text-[--color-text]"
        aria-label={`配置 ${agent.name}`}
      >
        <Settings2 size={16} />
      </button>
    </div>
  );
}

function GroupEntry({
  conversation,
  members,
}: {
  conversation: Conversation;
  members: Agent[];
}) {
  return (
    <div className="pluto-ios-row flex items-center gap-3 rounded-[20px] px-3 py-2.5">
      <GroupAvatar agents={members} size={46} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-[15px] font-medium text-[--color-text]">{conversation.name}</p>
          <span className="shrink-0 text-[12px] text-[--color-text-subtle]">
            {formatRelativeTime(conversation.last_message_at)}
          </span>
        </div>
        <p className="mt-1 truncate text-[13px] text-[--color-text-muted]">{members.length} 位成员</p>
      </div>
      <ChevronRight size={16} className="text-[--color-text-subtle]" />
    </div>
  );
}

export default function ContactsPage({ onStartChat }: ContactsPageProps) {
  const { agents, error, fetchAgents, isLoading } = useAgentStore();
  const { conversations, createConversation, fetchConversations } = useConversationStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  useEffect(() => {
    void fetchAgents();
    void fetchConversations();
  }, [fetchAgents, fetchConversations]);

  const loweredQuery = searchQuery.toLowerCase();

  const filteredAgents = useMemo(() => {
    return agents.filter((agent) =>
      [agent.name, agent.description || '', agent.tags || '']
        .join(' ')
        .toLowerCase()
        .includes(loweredQuery),
    );
  }, [agents, loweredQuery]);

  const recentContacts = useMemo(() => {
    return conversations
      .filter((conversation) => conversation.type === 'private')
      .filter((conversation) => isConversationMatch(conversation, loweredQuery))
      .map((conversation) => {
        const memberIds = parseMembers(conversation.members);
        const agent = memberIds
          .map((memberId) => agents.find((item) => item.id === memberId))
          .find(Boolean) ?? null;

        return { conversation, agent };
      })
      .filter((item): item is { conversation: Conversation; agent: Agent } => Boolean(item.agent))
      .sort((left, right) => {
        const leftTime = left.conversation.last_message_at
          ? new Date(left.conversation.last_message_at).getTime()
          : 0;
        const rightTime = right.conversation.last_message_at
          ? new Date(right.conversation.last_message_at).getTime()
          : 0;
        return rightTime - leftTime;
      })
      .slice(0, 6);
  }, [agents, conversations, loweredQuery]);

  const groupConversations = useMemo(() => {
    return conversations
      .filter((conversation) => conversation.type === 'group')
      .filter((conversation) => isConversationMatch(conversation, loweredQuery))
      .sort((left, right) => {
        const leftTime = left.last_message_at ? new Date(left.last_message_at).getTime() : 0;
        const rightTime = right.last_message_at ? new Date(right.last_message_at).getTime() : 0;
        return rightTime - leftTime;
      });
  }, [conversations, loweredQuery]);

  const activeCount = useMemo(() => agents.filter((agent) => agent.is_active).length, [agents]);

  const handleCreateGroup = async (name: string, memberIds: number[]) => {
    await createConversation({ type: 'group', name, members: JSON.stringify(memberIds) });
  };

  return (
    <div className="pluto-contacts-shell flex-1 overflow-y-auto px-8 py-8">
      <div className="mx-auto max-w-5xl">
        <section className="pluto-contacts-hero mb-7 rounded-[28px] px-5 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[--color-text-subtle]">
                通讯录
              </p>
              <h1 className="mt-2 text-[28px] font-semibold text-[--color-text]">联系人</h1>
              <p className="mt-2 text-sm text-[--color-text-muted]">
                {agents.length} 位联系人 · {activeCount} 位在线
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowGroupModal(true)}
                className="pluto-ios-button inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-[--color-text]"
              >
                <Users size={16} />
                新群聊
              </button>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="pluto-ios-button pluto-ios-button--primary inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium"
              >
                <Plus size={16} />
                新 Agent
              </button>
            </div>
          </div>

          <div className="mt-5 max-w-xl">
            <SearchField
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="搜索名字、简介、标签"
            />
          </div>
        </section>

        <section className="space-y-7">
          <div>
            <SectionLabel title="最近联系" extra={recentContacts.length > 0 ? undefined : '暂无'} />
            {recentContacts.length === 0 ? (
              <GroupCard>
                <div className="rounded-[20px] px-3 py-8 text-center text-sm text-[--color-text-muted]">
                  暂无最近联系
                </div>
              </GroupCard>
            ) : (
              <GroupCard>
                <div className="space-y-1">
                  {recentContacts.map(({ conversation, agent }) => (
                    <ContactRow
                      key={conversation.id}
                      agent={agent}
                      summary={buildRecentSummary(agent, conversation)}
                      activity={formatRelativeTime(conversation.last_message_at)}
                      presence={getPresence(agent, conversation.last_message_at)}
                      onConfigure={() => setEditingAgent(agent)}
                      onOpenChat={() => onStartChat(agent.id)}
                    />
                  ))}
                </div>
              </GroupCard>
            )}
          </div>

          <div>
            <SectionLabel
              title="群聊入口"
              extra={groupConversations.length > 0 ? `${groupConversations.length} 个` : undefined}
            />
            <GroupCard>
              <button
                type="button"
                onClick={() => setShowGroupModal(true)}
                className="pluto-ios-row flex w-full items-center gap-3 rounded-[20px] px-3 py-3 text-left"
              >
                <div className="pluto-ios-icon-button flex h-12 w-12 items-center justify-center rounded-[16px] text-[--color-text-subtle]">
                  <MessageCircle size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium text-[--color-text]">新建群聊</p>
                  <p className="mt-1 text-sm text-[--color-text-muted]">让多个 Agent 同时参与对话</p>
                </div>
                <ChevronRight size={16} className="text-[--color-text-subtle]" />
              </button>

              {groupConversations.length > 0 && (
                <div className="mt-1 space-y-1">
                  {groupConversations.map((conversation) => {
                    const members = parseMembers(conversation.members)
                      .map((memberId) => agents.find((agent) => agent.id === memberId))
                      .filter((agent): agent is Agent => Boolean(agent));

                    return (
                      <GroupEntry key={conversation.id} conversation={conversation} members={members} />
                    );
                  })}
                </div>
              )}
            </GroupCard>
          </div>

          <div>
            <SectionLabel title="全部联系人" extra={`${filteredAgents.length} 个`} />
            {isLoading && agents.length === 0 ? (
              <GroupCard>
                <div className="flex justify-center px-3 py-10">
                  <PlutoLoader label="载入联系人…" />
                </div>
              </GroupCard>
            ) : filteredAgents.length === 0 ? (
              <GroupCard>
                <div className="rounded-[20px] px-3 py-10 text-center">
                  <h3 className="text-base font-semibold text-[--color-text]">
                    {searchQuery ? '没有结果' : '还没有 Agent'}
                  </h3>
                  <p className="mt-2 text-sm text-[--color-text-muted]">
                    {searchQuery ? '换个关键词试试。' : '先创建一个新的 Agent。'}
                  </p>
                </div>
              </GroupCard>
            ) : (
              <GroupCard>
                <div className="space-y-1">
                  {filteredAgents.map((agent) => (
                    <ContactRow
                      key={agent.id}
                      agent={agent}
                      summary={buildAllContactsSummary(agent)}
                      presence={getPresence(agent)}
                      tags={parseTags(agent.tags).slice(0, 2)}
                      onConfigure={() => setEditingAgent(agent)}
                      onOpenChat={() => onStartChat(agent.id)}
                    />
                  ))}
                </div>
              </GroupCard>
            )}
          </div>

          {error && <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}
        </section>
      </div>

      {showCreateModal && <CreateAgentModal onClose={() => setShowCreateModal(false)} />}
      {showGroupModal && (
        <CreateGroupModal
          onClose={() => setShowGroupModal(false)}
          onCreateGroup={handleCreateGroup}
        />
      )}

      {editingAgent && (
        <>
          <div className="fixed inset-0 z-30 bg-black/12 backdrop-blur-sm" onClick={() => setEditingAgent(null)} />
          <div className="fixed inset-y-4 right-4 z-40 w-[360px] max-w-full overflow-hidden rounded-[28px] border border-[--color-border] bg-[--color-surface] shadow-[0_18px_60px_rgba(15,23,42,0.12)]">
            <AgentDetailSidebar
              agent={editingAgent}
              onClose={() => {
                setEditingAgent(null);
                void fetchAgents();
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
