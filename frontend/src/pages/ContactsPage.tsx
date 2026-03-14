import { useEffect, useState } from 'react';
import { useAgentStore, type Agent } from '../stores/agentStore';
import { useConversationStore } from '../stores/conversationStore';
import { Plus, Search, Users, Sparkles, Settings } from 'lucide-react';
import CreateAgentModal from '../components/CreateAgentModal';
import CreateGroupModal from '../components/CreateGroupModal';
import AgentDetailSidebar from '../components/AgentDetailSidebar';
import { getAgentPalette, getAvatarIcon } from '../lib/agentPalette';

interface ContactsPageProps {
  onStartChat: (agentId: number) => void;
  onSelectAgent?: (agent: Agent) => void;
}

export default function ContactsPage({ onStartChat, onSelectAgent }: ContactsPageProps) {
  const { agents, isLoading, error, fetchAgents } = useAgentStore();
  const { createConversation } = useConversationStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateGroup = async (name: string, memberIds: number[]) => {
    await createConversation({
      type: 'group',
      name,
      members: JSON.stringify(memberIds),
    });
  };

  return (
    <div 
      className="flex-1 overflow-y-auto py-8 px-9"
      style={{
        background: 'linear-gradient(180deg, var(--color-background) 0%, #F0EDE8 100%)',
      }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div className="flex justify-between items-end mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Sparkles size={28} style={{ color: 'var(--color-primary)' }} />
              <h1 className="text-[28px] font-bold text-[--color-text] m-0">Agent 好友</h1>
            </div>
            <p className="text-[13px] text-[--color-text-subtle] mt-1 m-0">
              与 <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{agents.length}</span> 位 AI 伙伴相遇
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowGroupModal(true)}
              className="flex items-center gap-2 border-none rounded-[14px] py-2.5 px-5 text-[14px] font-semibold cursor-pointer transition-all duration-200 hover:scale-[1.02]"
              style={{ 
                background: 'rgba(234,120,80,0.1)', 
                color: 'var(--color-primary)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <Users size={18} />
              创建群聊
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 border-none rounded-[14px] py-2.5 px-5 text-[14px] font-semibold cursor-pointer transition-all duration-200 hover:scale-[1.02]"
              style={{ 
                background: 'linear-gradient(135deg, #EA7850 0%, #E86848 100%)', 
                color: '#fff',
                boxShadow: '0 4px 16px rgba(234,120,80,0.35)',
              }}
            >
              <Plus size={18} />
              添加好友
            </button>
          </div>
        </div>

        <div className="relative mb-8">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[--color-text-muted]" />
          <input
            type="text"
            placeholder="搜索 Agent 好友..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-[--color-border-light] rounded-2xl text-sm focus:outline-none focus:border-[--color-primary] transition-all duration-200 focus:ring-4 focus:ring-[--color-primary]/10"
            style={{
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
          />
        </div>

        {isLoading && agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 rounded-full border-2 border-[--color-primary]/30 border-t-[--color-primary] animate-spin" />
            <p className="text-[--color-text-muted] mt-4">正在加载...</p>
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
              style={{ background: 'rgba(234,120,80,0.1)' }}
            >
              <Sparkles size={32} style={{ color: 'var(--color-primary)' }} />
            </div>
            <p className="text-[--color-text-subtle] text-[15px]">
              {searchQuery ? '没有找到匹配的 Agent' : '还没有 Agent 好友，快创建一个吧！'}
            </p>
          </div>
        ) : (
          <div 
            className="grid gap-5"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
          >
            {filteredAgents.map((agent) => {
              const palette = getAgentPalette(agent.id);
              return (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  palette={palette}
                  onClick={() => onSelectAgent ? onSelectAgent(agent) : onStartChat(agent.id)}
                  onEdit={() => setEditingAgent(agent)}
                />
              );
            })}
          </div>
        )}

        {error && (
          <div className="p-3 mx-4 mb-2 bg-red-50 rounded-lg text-sm text-red-600" style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateAgentModal onClose={() => setShowCreateModal(false)} />
      )}

      {showGroupModal && (
        <CreateGroupModal
          onClose={() => setShowGroupModal(false)}
          onCreateGroup={handleCreateGroup}
        />
      )}

      {editingAgent && (
        <>
          <div
            className="fixed inset-0 bg-[--color-text]/30 backdrop-blur-sm z-20"
            onClick={() => setEditingAgent(null)}
          />
          <div
            className="fixed top-0 right-0 bottom-0 w-[300px] bg-white z-30 flex flex-col overflow-y-auto"
            style={{
              transform: 'translateX(0)',
              transition: 'transform 0.35s cubic-bezier(0.175,0.885,0.32,1.1)',
              boxShadow: '-8px 0 32px rgba(0,0,0,0.1)',
            }}
          >
            <AgentDetailSidebar
              agent={editingAgent}
              onClose={() => {
                setEditingAgent(null);
                fetchAgents();
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

interface AgentCardProps {
  agent: Agent;
  palette: ReturnType<typeof getAgentPalette>;
  onClick: () => void;
  onEdit: () => void;
}

function AgentCard({ agent, palette, onClick, onEdit }: AgentCardProps) {
  return (
    <div
      className="bg-white rounded-[24px] p-5 cursor-pointer transition-all duration-300 group"
      style={{
        border: '1px solid rgba(0,0,0,0.04)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(234,120,80,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)';
      }}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-4">
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 16,
            background: palette.bg,
            border: `2px solid ${palette.border}`,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        >
          {(() => {
            const AvatarIcon = getAvatarIcon(agent.avatar);
            return <AvatarIcon size={28} style={{ color: palette.dot }} />;
          })()}
        </div>
        <span
          className="text-[10px] font-bold text-[--color-text-subtle] bg-[--color-background] rounded-lg py-1.5 px-3 tracking-wider"
        >
          {agent.model}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100"
          style={{
            background: 'rgba(0,0,0,0.05)',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-muted)',
          }}
          aria-label={`Edit ${agent.name}`}
        >
          <Settings size={14} />
        </button>
      </div>

      <h3 className="text-[17px] font-bold m-0 mb-2 text-[--color-text]">{agent.name}</h3>
      <p className="text-[13px] text-[--color-text-muted] m-0 mb-4 line-clamp-2" style={{ lineHeight: 1.6 }}>
        {agent.description || '暂无简介'}
      </p>

      <div className="flex flex-wrap gap-2 mb-5">
        {['生活', '情感', '编程'].slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="text-[11px font-medium]"
            style={{
              padding: '4px 12px',
              borderRadius: 20,
              background: palette.dot + '15',
              color: palette.dot,
              border: `1px solid ${palette.dot}30`,
            }}
          >
            #{tag}
          </span>
        ))}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="w-full py-2.5 rounded-xl font-semibold text-[13px] transition-all duration-200"
        style={{
          border: `1.5px solid ${palette.border}`,
          background: 'transparent',
          color: palette.dot,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = palette.bg;
          e.currentTarget.style.transform = 'scale(1.02)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        开始聊天
      </button>
    </div>
  );
}
