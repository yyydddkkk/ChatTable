import { useEffect, useRef, useState } from 'react';
import { MainLayout } from './components/MainLayout';
import AgentDetailSidebar from './components/AgentDetailSidebar';
import { SessionList } from './components/SessionList';
import AuthPage from './pages/AuthPage';
import ChatPage from './pages/ChatPage';
import ContactsPage from './pages/ContactsPage';
import SettingsPage from './pages/SettingsPage';
import DebugPage from './pages/DebugPage';
import { authConstants } from './lib/auth';
import { useAgentStore, type Agent } from './stores/agentStore';
import { useAuthStore } from './stores/authStore';
import { useConversationStore } from './stores/conversationStore';
import { useProviderStore } from './stores/providerStore';
import { useTenantStore } from './stores/tenantStore';

interface AuthenticatedAppProps {
  agents: Agent[];
}

function AuthenticatedApp({ agents }: AuthenticatedAppProps) {
  const [currentView, setCurrentView] = useState<'contacts' | 'chat' | 'settings' | 'debug'>('contacts');
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetailSidebar, setShowDetailSidebar] = useState(false);

  const conversations = useConversationStore((state) => state.conversations);
  const selectAgent = useAgentStore((state) => state.selectAgent);

  const handleSelectAgent = (agent: Agent | null) => {
    selectAgent(agent);
    if (agent) {
      setSelectedAgentId(agent.id);
      setSelectedConversationId(null);
      setCurrentView('chat');
    }
  };

  const handleStartChat = (nextAgentId: number) => {
    setSelectedAgentId(nextAgentId);
    setSelectedConversationId(null);
    setCurrentView('chat');
  };

  const activeAgent = selectedAgentId ? agents.find((item) => item.id === selectedAgentId) : null;

  return (
    <MainLayout currentView={currentView} onViewChange={setCurrentView}>
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
              <div className="text-6xl mb-4">??</div>
              <h2 className="text-xl font-medium text-[--color-text]">Select a conversation to start chatting</h2>
              <p className="text-[--color-text-muted] mt-2">Choose an agent or group from the sidebar</p>
            </div>
          </div>
        )
      ) : currentView === 'settings' ? (
        <SettingsPage />
      ) : currentView === 'debug' ? (
        <DebugPage />
      ) : (
        <ContactsPage onStartChat={handleStartChat} onSelectAgent={handleSelectAgent} />
      )}

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
            <AgentDetailSidebar agent={activeAgent} onClose={() => setShowDetailSidebar(false)} />
          </div>
        </>
      )}
    </MainLayout>
  );
}

function App() {
  const { hydrateAuth, isAuthenticated, isLoading: isAuthLoading, logout } = useAuthStore();
  const { agents, fetchAgents, selectAgent } = useAgentStore();
  const fetchConversations = useConversationStore((state) => state.fetchConversations);
  const setCurrentConversation = useConversationStore((state) => state.setCurrentConversation);
  const clearMessages = useConversationStore((state) => state.clearMessages);
  const fetchProviders = useProviderStore((state) => state.fetchProviders);
  const tenantId = useTenantStore((state) => state.tenantId);
  const previousTenantIdRef = useRef<string | null>(null);

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener(authConstants.unauthorizedEventName, handleUnauthorized);
    return () => {
      window.removeEventListener(authConstants.unauthorizedEventName, handleUnauthorized);
    };
  }, [logout]);

  useEffect(() => {
    if (!isAuthenticated) {
      previousTenantIdRef.current = null;
      return;
    }

    fetchAgents();
    fetchConversations();
    fetchProviders();
  }, [isAuthenticated, tenantId, fetchAgents, fetchConversations, fetchProviders]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    if (previousTenantIdRef.current === null) {
      previousTenantIdRef.current = tenantId;
      return;
    }

    if (previousTenantIdRef.current === tenantId) {
      return;
    }

    previousTenantIdRef.current = tenantId;
    selectAgent(null);
    setCurrentConversation(null);
    clearMessages();
  }, [isAuthenticated, tenantId, selectAgent, setCurrentConversation, clearMessages]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[--color-background]">
        <div className="text-sm text-[--color-text-muted]">Loading session...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return <AuthenticatedApp key={tenantId} agents={agents} />;
}

export default App;
