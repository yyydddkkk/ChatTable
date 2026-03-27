import type { FC } from 'react';
import type { Agent } from '../stores/agentStore';
import type { Conversation } from '../types';
import { Search, MessageCircle } from 'lucide-react';
import { AvatarIcon, getAgentPalette } from '../lib/agentPalette';
import { GroupAvatar } from './GroupAvatar';

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
  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sessions = [
    ...conversations.map((conv) => {
      const memberIds = (() => {
        try {
          return JSON.parse(conv.members) as number[];
        } catch {
          return [];
        }
      })();
      return {
        id: conv.id,
        type: 'conversation' as const,
        name: conv.name,
        members: memberIds,
        lastMsg: conv.last_message_at || '',
        time: conv.last_message_at 
          ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '',
        isGroup: conv.type === 'group',
      };
    }),
    ...filteredAgents.map((agent) => ({
      id: agent.id,
      type: 'agent' as const,
      name: agent.name,
      members: [agent.id],
      lastMsg: '还没有消息',
      time: '',
      isGroup: false,
      agent,
    })),
  ];

  return (
    <aside 
      className="w-72 flex flex-col shrink-0"
      style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #FAF8F5 100%)',
        boxShadow: '1px 0 8px rgba(0,0,0,0.04)',
      }}
    >
      <div className="p-4 pb-3">
        <div className="relative flex items-center">
          <Search size={15} className="absolute left-3.5 text-[--color-text-muted]" />
          <input
            type="text"
            placeholder="搜索会话..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-white border border-[--color-border-light] rounded-xl py-2.5 px-3 pl-10 text-sm text-[--color-text] outline-none transition-all duration-200 focus:border-[--color-primary] focus:ring-2 focus:ring-[--color-primary]/10"
          />
        </div>
      </div>

      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 text-[--color-text-subtle]">
          <MessageCircle size={14} />
          <span className="text-xs font-medium">会话列表</span>
          <span className="text-xs ml-auto bg-[--color-background] px-2 py-0.5 rounded-full">
            {sessions.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1 px-2">
        {sessions.map((session) => {
          const isAgentSession = session.type === 'agent';
          const isConversationSession = session.type === 'conversation';
          const isActive = (isAgentSession && activeId === session.id) || 
                          (isConversationSession && activeConversationId === session.id);
          
          return (
            <div
              key={`${session.type}-${session.id}`}
              onClick={() => {
                if (session.type === 'agent') {
                  onSelectAgent(session.id);
                } else {
                  onSelectConversation(session.id);
                }
              }}
              className="relative flex items-center py-3 px-3 rounded-2xl cursor-pointer mb-1 transition-all duration-200 group"
              style={{
                background: isActive 
                  ? 'linear-gradient(135deg, #FFFFFF 0%, #FFF8F5 100%)' 
                  : 'transparent',
                boxShadow: isActive 
                  ? '0 4px 16px rgba(234,120,80,0.12), 0 1px 3px rgba(0,0,0,0.04)' 
                  : 'none',
              }}
            >
              {isActive && (
                <span 
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full"
                  style={{ background: 'var(--color-primary)' }}
                />
              )}
              {!isActive && (
                <span 
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                  style={{ background: 'rgba(0,0,0,0.03)' }}
                />
              )}
              {session.isGroup ? (
                <GroupAvatar agents={session.members.map(id => agents.find(a => a.id === id)).filter(Boolean) as Agent[]} size={46} />
              ) : (
                <AgentAvatarComponent
                  agent={
                    session.type === 'agent'
                      ? (session as { agent: Agent }).agent
                      : agents.find(a => session.members.includes(a.id))!
                  }
                  size={46}
                />
              )}
              <div className="ml-3 flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <span 
                    className="text-sm font-semibold truncate"
                    style={{ color: isActive ? 'var(--color-text)' : 'var(--color-text)' }}
                  >
                    {session.name}
                  </span>
                  <span 
                    className="text-[10px] shrink-0 ml-2 px-1.5 py-0.5 rounded-md"
                    style={{ 
                      color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      background: isActive ? 'rgba(234,120,80,0.1)' : 'transparent',
                    }}
                  >
                    {session.time}
                  </span>
                </div>
                <p 
                  className="text-xs mt-1 overflow-hidden text-ellipsis whitespace-nowrap"
                  style={{ color: isActive ? 'var(--color-text-muted)' : 'var(--color-text-subtle)' }}
                >
                  {session.lastMsg}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};

interface AgentAvatarComponentProps {
  agent: Agent;
  size?: number;
}

const AgentAvatarComponent: FC<AgentAvatarComponentProps> = ({ agent, size = 40 }) => {
  if (!agent) return null;
  const palette = getAgentPalette(agent.id);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: palette.bg,
        border: `2px solid ${palette.border}`,
        overflow: 'hidden',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AvatarIcon avatarLabel={agent.avatar} size={size * 0.5} style={{ color: palette.dot }} />
    </div>
  );
};
