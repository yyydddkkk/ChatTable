import { useState } from 'react';
import ContactsPage from './pages/ContactsPage';
import ChatPage from './pages/ChatPage';

function App() {
  const [currentPage, setCurrentPage] = useState<'contacts' | 'chat'>('contacts');
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);

  const handleStartChat = (agentId: number) => {
    setSelectedAgentId(agentId);
    setCurrentPage('chat');
  };

  const handleBackToContacts = () => {
    setCurrentPage('contacts');
    setSelectedAgentId(null);
  };

  if (currentPage === 'chat' && selectedAgentId) {
    return <ChatPage agentId={selectedAgentId} onBack={handleBackToContacts} />;
  }

  return <ContactsPage onStartChat={handleStartChat} />;
}

export default App;
