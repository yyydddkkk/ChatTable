import { useEffect, useState } from 'react';
import { useAgentStore, type Agent } from '../stores/agentStore';
import { Plus, MessageCircle, Search } from 'lucide-react';
import CreateAgentModal from '../components/CreateAgentModal';
import AgentDetailSidebar from '../components/AgentDetailSidebar';

export default function ContactsPage() {
  const { agents, selectedAgent, isLoading, error, fetchAgents, selectAgent } = useAgentStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

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

  return (
    <div className="flex h-screen bg-background">
      {/* Left Column: Contact List */}
      <div className="w-80 border-r border-border bg-surface flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-text">Contacts</h1>
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-2 rounded-full bg-primary text-white hover:bg-opacity-90 transition"
            >
              <Plus size={20} />
            </button>
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
            <p className="text-text-muted mt-2">Start a conversation</p>
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
    </div>
  );
}
