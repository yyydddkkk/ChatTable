import { useEffect, useState } from 'react';

import { MainLayout } from './components/MainLayout';
import { PlutoLoader } from './components/PlutoLoader';
import { SessionList } from './components/SessionList';
import { authConstants } from './lib/auth';
import ContactsPage from './pages/ContactsPage';
import ChatPage from './pages/ChatPage';
import SettingsPage from './pages/SettingsPage';
import { useAgentStore, type Agent } from './stores/agentStore';
import { useAuthStore } from './stores/authStore';
import { useConversationStore } from './stores/conversationStore';
import { useProviderStore } from './stores/providerStore';
import { useTenantStore } from './stores/tenantStore';
import { useThemeStore } from './stores/themeStore';
import AuthPage from './pages/AuthPage';
import type { Conversation } from './types';

type WorkspaceView = 'contacts' | 'chat' | 'settings';

interface AuthenticatedWorkspaceProps {
  agents: Agent[];
  conversations: Conversation[];
}

function WorkspaceEmptyState({ onJumpContacts }: { onJumpContacts: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center px-8">
      <div className="pluto-empty-state-card max-w-md rounded-[28px] border border-[--color-border-light] bg-[--color-surface]/80 p-8 text-center shadow-[0_24px_60px_rgba(7,10,24,0.16)] backdrop-blur-xl">
        <h2 className="text-2xl font-semibold text-[--color-text]">选择一个会话</h2>
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onJumpContacts}
            className="pluto-empty-state-action rounded-full border border-[--color-border-light] bg-[--color-surface] px-5 py-2.5 text-sm font-medium text-[--color-text] transition hover:bg-white/80"
          >
            去联系人页
          </button>
        </div>
      </div>
    </div>
  );
}

function AuthenticatedWorkspace({ agents, conversations }: AuthenticatedWorkspaceProps) {
  const [currentView, setCurrentView] = useState<WorkspaceView>('chat');
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { selectAgent } = useAgentStore();
  const { setCurrentConversation, clearMessages } = useConversationStore();

  const handleStartChat = (agentId: number) => {
    setSelectedConversationId(null);
    setSelectedAgentId(agentId);
    setCurrentView('chat');
  };

  const handleSelectConversation = (conversationId: number) => {
    setSelectedAgentId(null);
    setSelectedConversationId(conversationId);
    setCurrentView('chat');
  };

  useEffect(() => {
    return () => {
      setSelectedAgentId(null);
      setSelectedConversationId(null);
      selectAgent(null);
      setCurrentConversation(null);
      clearMessages();
    };
  }, [clearMessages, selectAgent, setCurrentConversation]);

  return (
    <MainLayout currentView={currentView} onViewChange={setCurrentView}>
      {currentView === 'chat' && (
        <SessionList
          agents={agents}
          conversations={conversations}
          activeId={selectedAgentId}
          activeConversationId={selectedConversationId}
          onSelectAgent={handleStartChat}
          onSelectConversation={handleSelectConversation}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      )}

      {currentView === 'chat' ? (
        selectedAgentId || selectedConversationId ? (
          <ChatPage
            agentId={selectedAgentId || undefined}
            conversationId={selectedConversationId || undefined}
          />
        ) : (
          <WorkspaceEmptyState onJumpContacts={() => setCurrentView('contacts')} />
        )
      ) : currentView === 'settings' ? (
        <SettingsPage />
      ) : (
        <ContactsPage onStartChat={handleStartChat} />
      )}
    </MainLayout>
  );
}

function App() {
  const [authBootstrapped, setAuthBootstrapped] = useState(false);
  const tenantId = useTenantStore((state) => state.tenantId);
  const { hydrateAuth, isAuthenticated, isLoading: isAuthLoading, logout } = useAuthStore();
  const { agents, fetchAgents } = useAgentStore();
  const { conversations, fetchConversations } = useConversationStore();
  const { fetchProviders } = useProviderStore();
  const { theme, hydrateTheme } = useThemeStore();

  useEffect(() => {
    hydrateTheme();
    void hydrateAuth().finally(() => setAuthBootstrapped(true));
  }, [hydrateAuth, hydrateTheme]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.body.dataset.theme = theme;
  }, [theme]);

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
    if (!isAuthenticated) return;
    void fetchAgents();
    void fetchConversations();
    void fetchProviders();
  }, [fetchAgents, fetchConversations, fetchProviders, isAuthenticated, tenantId]);

  if (isAuthLoading || !authBootstrapped) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[--color-background] px-6">
        <div className="rounded-[28px] border border-[--color-border-light] bg-[--color-surface]/80 px-8 py-7 text-center shadow-[0_20px_80px_rgba(6,10,24,0.16)] backdrop-blur-xl">
          <PlutoLoader label="载入 Pluto…" size="lg" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return <AuthenticatedWorkspace key={tenantId} agents={agents} conversations={conversations} />;
}

export default App;

