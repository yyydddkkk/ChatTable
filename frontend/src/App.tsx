import { useState, useEffect } from 'react';
import { MainLayout } from './components/MainLayout';
import { SessionList } from './components/SessionList';
import ContactsPage from './pages/ContactsPage';
import ChatPage from './pages/ChatPage';
import SettingsPage from './pages/SettingsPage';
import AgentDetailSidebar from './components/AgentDetailSidebar';
import { useAgentStore, type Agent } from './stores/agentStore';
import { useConversationStore } from './stores/conversationStore';
import { useProviderStore } from './stores/providerStore';

function App() {
  const [currentView, setCurrentView] = useState<'contacts' | 'chat' | 'settings'>('contacts');
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetailSidebar, setShowDetailSidebar] = useState(false);

  const { agents, fetchAgents, selectAgent } = useAgentStore();
  const { conversations, fetchConversations } = useConversationStore();
  const { fetchProviders } = useProviderStore();

  useEffect(() => {
    fetchAgents();
    fetchConversations();
    fetchProviders();
  }, [fetchAgents, fetchConversations, fetchProviders]);

  const handleSelectAgent = (agent: Agent | null) => {
    selectAgent(agent);
    if (agent) {
      setSelectedAgentId(agent.id);
      setSelectedConversationId(null);
      setCurrentView('chat');
    }
  };

  const handleStartChat = (agentId: number) => {
    setSelectedAgentId(agentId);
    setSelectedConversationId(null);
    setCurrentView('chat');
  };

  const activeAgent = selectedAgentId ? agents.find((a) => a.id === selectedAgentId) : null;

  return (
    <MainLayout currentView={currentView} onViewChange={setCurrentView}>
      {/* Session List Sidebar - only show in chat view */}
      {currentView === 'chat' && (
        <SessionList
          agents={agents}
          conversations={conversations}
          activeId={selectedAgentId}
          activeConversationId={selectedConversationId}
          onSelectAgent={(id) => {
            setSelectedAgentId(id);
            setSelectedConversationId(null);
          }}
          onSelectConversation={(id) => {
            setSelectedConversationId(id);
            setSelectedAgentId(null);
          }}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      )}

      {/* Main Content Area */}
      {currentView === 'chat' ? (
        selectedAgentId || selectedConversationId ? (
          <ChatPage
            agentId={selectedAgentId || undefined}
            conversationId={selectedConversationId || undefined}
            onOpenDetail={() => setShowDetailSidebar(true)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[--color-background]">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <h2 className="text-xl font-medium text-[--color-text]">选择会话开始聊天</h2>
              <p className="text-[--color-text-muted] mt-2">从左侧选择一个 Agent 或群聊</p>
            </div>
          </div>
        )
      ) : currentView === 'settings' ? (
        <SettingsPage />
      ) : (
        <ContactsPage 
          onStartChat={handleStartChat}
          onSelectAgent={handleSelectAgent}
        />
      )}

      {/* Agent Detail Sidebar */}
      {showDetailSidebar && activeAgent && (
        <>
          <div 
            className="fixed inset-0 bg-[--color-text]/30 backdrop-blur-sm z-20"
            style={{ opacity: 1, pointerEvents: 'auto' }}
            onClick={() => setShowDetailSidebar(false)}
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
              agent={activeAgent} 
              onClose={() => setShowDetailSidebar(false)} 
            />
          </div>
        </>
      )}
    </MainLayout>
  );
}

export default App;
