import { useState } from 'react';
import ContactsPage from './pages/ContactsPage';
import ChatPage from './pages/ChatPage';

function App() {
  const [currentPage, setCurrentPage] = useState<'contacts' | 'chat'>('contacts');
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);

  const handleStartChat = (agentId: number) => {
    setSelectedAgentId(agentId);
    setSelectedConversationId(null);
    setCurrentPage('chat');
  };

  const handleOpenConversation = (conversationId: number) => {
    setSelectedConversationId(conversationId);
    setSelectedAgentId(null);
    setCurrentPage('chat');
  };

  const handleBackToContacts = () => {
    setCurrentPage('contacts');
    setSelectedAgentId(null);
    setSelectedConversationId(null);
  };

  if (currentPage === 'chat') {
    return (
      <ChatPage 
        agentId={selectedAgentId || undefined} 
        conversationId={selectedConversationId || undefined}
        onBack={handleBackToContacts} 
      />
    );
  }

  return <ContactsPage onStartChat={handleStartChat} onOpenConversation={handleOpenConversation} />;
}

export default App;
