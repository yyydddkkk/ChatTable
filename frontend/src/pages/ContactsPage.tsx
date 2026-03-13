import { useEffect, useState } from 'react';
import { useAgentStore, type Agent } from '../stores/agentStore';
import { useConversationStore } from '../stores/conversationStore';
import type { Conversation } from '../types';
import { Plus, MessageCircle, Search, Users } from 'lucide-react';
import CreateAgentModal from '../components/CreateAgentModal';
import CreateGroupModal from '../components/CreateGroupModal';
import AgentDetailSidebar from '../components/AgentDetailSidebar';
import GroupAvatar from '../components/GroupAvatar';

interface ContactsPageProps {
  onStartChat: (agentId: number) => void;
  onOpenConversation?: (conversationId: number) => void;
}

export default function ContactsPage({ onStartChat, onOpenConversation }: ContactsPageProps) {
  const { agents, selectedAgent, isLoading, error, fetchAgents, selectAgent } = useAgentStore();
  const { createConversation, fetchConversations } = useConversationStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupConversations, setGroupConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    fetchAgents();
    fetchConversations().then((convs) => {
      if (convs) {
        setGroupConversations(convs.filter((c: Conversation) => c.type === 'group'));
      }
    });
  }, [fetchAgents, fetchConversations]);

  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getAvatarDisplay = (agent: Agent) => {
    if (agent.avatar) {
      return agent.avatar.startsWith('http') ? (
        <img src={agent.avatar} alt={agent.name} className="w-12 h-12 rounded-full object-cover" />
      ) : (
        <span className="text-2xl">{agent.avatar}</span>
      );
    }
    return <span className="text-2xl">{agent.name.charAt(0).toUpperCase()}</span>;
  };

  const handleCreateGroup = async (name: string, memberIds: number[]) => {
    const conversation = await createConversation({
      type: 'group',
      name,
      members: JSON.stringify(memberIds),
    });
    if (conversation) {
      setGroupConversations((prev) => [...prev, conversation]);
    }
  };

  const getGroupMembers = (membersJson: string): Agent[] => {
    try {
      const memberIds = JSON.parse(membersJson);
      return memberIds.map((id: number) => agents.find((a) => a.id === id)).filter(Boolean) as Agent[];
    } catch {
      return [];
    }
  };

  const handleGroupClick = (conv: Conversation) => {
    if (onOpenConversation) {
      onOpenConversation(conv.id);
    } else {
      const members = getGroupMembers(conv.members);
      if (members.length > 0) {
        selectAgent(members[0]);
      }
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Left Column: Contact List */}
      <div className="w-80 border-r border-border bg-surface flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-text">Contacts</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setShowGroupModal(true)}
                className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition"
                title="Create Group"
              >
                <Users size={20} />
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="p-2 rounded-full bg-primary text-white hover:bg-opacity-90 transition"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input
              type="text"
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Agent List */}
        <div className="flex-1 overflow-y-auto">
          {/* Group Chats */}
          {groupConversations.length > 0 && (
            <div className="p-2">
              <div className="text-xs font-medium text-text-muted uppercase px-2 py-1">Group Chats</div>
              {groupConversations.map((conv) => {
                const members = getGroupMembers(conv.members);
                return (
                  <div
                    key={conv.id}
                    onClick={() => handleGroupClick(conv)}
                    className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-background transition"
                  >
                    <GroupAvatar agents={members} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text truncate">{conv.name}</div>
                      <div className="text-xs text-text-muted truncate">
                        {members.map((m) => m.name).join(', ')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Private Chats / Agents */}
          <div className="p-2">
            <div className="text-xs font-medium text-text-muted uppercase px-2 py-1">Agents</div>
          {isLoading && agents.length === 0 ? (
            <div className="p-4 text-center text-text-muted">Loading...</div>
          ) : filteredAgents.length === 0 ? (
            <div className="p-4 text-center text-text-muted">
              {searchQuery ? 'No agents found' : 'No agents yet. Create one!'}
            </div>
          ) : (
            filteredAgents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => selectAgent(agent)}
                className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-background transition ${
                  selectedAgent?.id === agent.id ? 'bg-background' : ''
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {getAvatarDisplay(agent)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text truncate">{agent.name}</span>
                    {!agent.is_active && (
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500">Offline</span>
                    )}
                  </div>
                  {agent.description && (
                    <p className="text-sm text-text-muted truncate">{agent.description}</p>
                  )}
                </div>
              </div>
            ))
          )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 mx-4 mb-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}
      </div>

      {/* Middle Column: Chat Area (Placeholder) */}
      <div className="flex-1 flex items-center justify-center bg-background">
        {selectedAgent ? (
          <div className="text-center">
            <MessageCircle size={64} className="mx-auto text-text-muted mb-4" />
            <h2 className="text-xl font-medium text-text">{selectedAgent.name}</h2>
            <p className="text-text-muted mt-2 mb-4">{selectedAgent.description || 'Start a conversation'}</p>
            <button
              onClick={() => onStartChat(selectedAgent.id)}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition"
            >
              Start Chat
            </button>
          </div>
        ) : (
          <div className="text-center">
            <MessageCircle size={64} className="mx-auto text-text-muted mb-4" />
            <p className="text-text-muted">Select an agent to start chatting</p>
          </div>
        )}
      </div>

      {/* Right Column: Agent Detail Sidebar */}
      {selectedAgent && (
        <AgentDetailSidebar agent={selectedAgent} onClose={() => selectAgent(null)} />
      )}

      {/* Create Agent Modal */}
      {showCreateModal && (
        <CreateAgentModal onClose={() => setShowCreateModal(false)} />
      )}

      {/* Create Group Modal */}
      {showGroupModal && (
        <CreateGroupModal
          onClose={() => setShowGroupModal(false)}
          onCreateGroup={handleCreateGroup}
        />
      )}
    </div>
  );
}
