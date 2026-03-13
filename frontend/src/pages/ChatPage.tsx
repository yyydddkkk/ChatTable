import { useEffect, useState, useRef } from 'react';
import { useAgentStore, type Agent } from '../stores/agentStore';
import { useConversationStore } from '../stores/conversationStore';
import type { Conversation } from '../types';
import ChatArea from '../components/ChatArea';
import MessageInput from '../components/MessageInput';
import GroupAvatar from '../components/GroupAvatar';
import LengthAdjuster from '../components/LengthAdjuster';
import type { Message } from '../types';

interface ChatPageProps {
  agentId?: number;
  conversationId?: number;
  onBack: () => void;
}

export default function ChatPage({ agentId, conversationId, onBack }: ChatPageProps) {
  const { agents } = useAgentStore();
  const { currentConversation, messages, setCurrentConversation, createConversation, fetchConversations, addMessage } = useConversationStore();
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [thinkingAgents, setThinkingAgents] = useState<Set<number>>(new Set());
  const [streamingMessages, setStreamingMessages] = useState<Map<number, string>>(new Map());
  const streamingAgentIds = useRef<Set<number>>(new Set());
  const [conversationMembers, setConversationMembers] = useState<Agent[]>([]);
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [lengthLevel, setLengthLevel] = useState(3);

  const agent = agentId ? agents.find((a) => a.id === agentId) : null;

  useEffect(() => {
    const initConversation = async () => {
      if (conversationId) {
        const convs = await fetchConversations();
        const conv = convs?.find((c: Conversation) => c.id === conversationId);
        if (conv) {
          setCurrentConversation(conv);
          setIsGroupChat(conv.type === 'group');
          
          if (conv.type === 'group') {
            try {
              const memberIds = JSON.parse(conv.members);
              const members = memberIds.map((id: number) => agents.find((a) => a.id === id)).filter(Boolean) as Agent[];
              setConversationMembers(members);
            } catch {
              // ignore parse errors
            }
          }
        }
      } else if (agent) {
        const conv = await createConversation({
          type: 'private',
          name: agent.name,
          members: JSON.stringify([agentId]),
        });

        if (conv) {
          setCurrentConversation(conv);
        }
      }
    };

    initConversation();
  }, [agentId, conversationId, agent, createConversation, setCurrentConversation, fetchConversations, agents]);

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
        setThinkingAgents((prev) => new Set([...prev, data.agent_id]));
        streamingAgentIds.current.add(data.agent_id);
        setStreamingMessages((prev) => new Map(prev).set(data.agent_id, ''));
      } else if (data.type === 'agent_message_chunk') {
        setStreamingMessages((prev) => {
          const newMap = new Map(prev);
          const current = newMap.get(data.agent_id) || '';
          newMap.set(data.agent_id, current + data.content);
          return newMap;
        });
      } else if (data.type === 'agent_done') {
        setThinkingAgents((prev) => {
          const newSet = new Set(prev);
          newSet.delete(data.agent_id);
          return newSet;
        });
        streamingAgentIds.current.delete(data.agent_id);
        addMessage(data.message);
        setStreamingMessages((prev) => {
          const newMap = new Map(prev);
          newMap.delete(data.agent_id);
          return newMap;
        });
      } else if (data.type === 'error') {
        console.error('WebSocket error:', data.message);
        if (data.agent_id) {
          setThinkingAgents((prev) => {
            const newSet = new Set(prev);
            newSet.delete(data.agent_id);
            return newSet;
          });
        }
      } else if (data.type === 'length_set') {
        setLengthLevel(data.level);
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
      }));
    }
  };

  const displayMessages: Message[] = [...messages];
  
  streamingMessages.forEach((content, agentId) => {
    if (content) {
      displayMessages.push({
        id: Date.now() + agentId,
        conversation_id: currentConversation?.id || 0,
        sender_type: 'agent',
        sender_id: agentId,
        content,
        created_at: new Date().toISOString(),
      });
    }
  });

  const displayAgents = isGroupChat && conversationMembers.length > 0 
    ? conversationMembers 
    : (agent ? [agent] : []);

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex items-center gap-3 p-4 border-b border-border bg-surface">
        <button onClick={onBack} className="text-text-muted hover:text-text">
          ← Back
        </button>
        <LengthAdjuster level={lengthLevel} onChange={(level) => {
          setLengthLevel(level);
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'set_length', level }));
          }
        }} />
        {isGroupChat ? (
          <GroupAvatar agents={displayAgents} size="md" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xl">{agent?.avatar || '🤖'}</span>
          </div>
        )}
        <div>
          <h2 className="font-semibold text-text">
            {isGroupChat ? currentConversation?.name : agent?.name}
          </h2>
          <p className="text-sm text-text-muted">
            {isGroupChat 
              ? displayAgents.map((a) => a.name).join(', ')
              : agent?.description}
          </p>
        </div>
      </div>

      <ChatArea messages={displayMessages} thinkingAgentId={thinkingAgents.size > 0 ? Array.from(thinkingAgents)[0] : undefined} />
      <MessageInput 
        onSend={handleSend} 
        disabled={thinkingAgents.size > 0} 
        agents={isGroupChat ? displayAgents : []}
      />
    </div>
  );
}
