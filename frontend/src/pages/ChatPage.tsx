import { useEffect, useState, useRef } from 'react';
import { useAgentStore } from '../stores/agentStore';
import { useConversationStore } from '../stores/conversationStore';
import ChatArea from '../components/ChatArea';
import MessageInput from '../components/MessageInput';
import type { Message } from '../types';

interface ChatPageProps {
  agentId: number;
  onBack: () => void;
}

export default function ChatPage({ agentId, onBack }: ChatPageProps) {
  const { agents } = useAgentStore();
  const { currentConversation, messages, setCurrentConversation, createConversation, addMessage } = useConversationStore();
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [thinkingAgentId, setThinkingAgentId] = useState<number | undefined>();
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const streamingAgentId = useRef<number | undefined>(undefined);

  const agent = agents.find((a) => a.id === agentId);

  useEffect(() => {
    const initConversation = async () => {
      if (!agent) return;

      const conv = await createConversation({
        type: 'private',
        name: agent.name,
        members: JSON.stringify([agentId]),
      });

      if (conv) {
        setCurrentConversation(conv);
      }
    };

    initConversation();
  }, [agentId, agent, createConversation, setCurrentConversation]);

  useEffect(() => {
    if (!currentConversation) return;

    const websocket = new WebSocket(`ws://localhost:8000/ws/${currentConversation.id}`);

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'ping') {
        websocket.send(JSON.stringify({ type: 'pong' }));
      } else if (data.type === 'user_message') {
        addMessage(data.message);
      } else if (data.type === 'agent_thinking') {
        setThinkingAgentId(data.agent_id);
        streamingAgentId.current = data.agent_id;
        setStreamingMessage('');
      } else if (data.type === 'agent_message_chunk') {
        setStreamingMessage((prev) => prev + data.content);
      } else if (data.type === 'agent_done') {
        setThinkingAgentId(undefined);
        addMessage(data.message);
        setStreamingMessage('');
        streamingAgentId.current = undefined;
      } else if (data.type === 'error') {
        console.error('WebSocket error:', data.message);
        setThinkingAgentId(undefined);
      }
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [currentConversation]);

  const handleSend = (content: string) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'user_message',
        content,
        agent_id: agentId,
      }));
    }
  };

  const displayMessages: Message[] = [...messages];
  if (streamingMessage && streamingAgentId.current) {
    displayMessages.push({
      id: Date.now(),
      conversation_id: currentConversation?.id || 0,
      sender_type: 'agent',
      sender_id: streamingAgentId.current,
      content: streamingMessage,
      created_at: new Date().toISOString(),
    });
  }

  if (!agent) {
    return <div className="flex items-center justify-center h-screen">Agent not found</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex items-center gap-3 p-4 border-b border-border bg-surface">
        <button onClick={onBack} className="text-text-muted hover:text-text">
          ← Back
        </button>
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-xl">{agent.avatar || '🤖'}</span>
        </div>
        <div>
          <h2 className="font-semibold text-text">{agent.name}</h2>
          <p className="text-sm text-text-muted">{agent.description}</p>
        </div>
      </div>

      <ChatArea messages={displayMessages} thinkingAgentId={thinkingAgentId} />
      <MessageInput onSend={handleSend} disabled={!!thinkingAgentId} />
    </div>
  );
}
