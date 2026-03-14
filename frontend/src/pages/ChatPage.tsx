import { useEffect, useState, useRef } from 'react';
import { useAgentStore, type Agent } from '../stores/agentStore';
import { useConversationStore } from '../stores/conversationStore';
import type { Conversation } from '../types';
import ChatArea from '../components/ChatArea';
import MessageInput from '../components/MessageInput';
import GroupAvatar from '../components/GroupAvatar';
import LengthAdjuster from '../components/LengthAdjuster';
import type { Message } from '../types';
import { Bot, ArrowLeft, Trash2 } from 'lucide-react';

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
  const [showTopicSwitched, setShowTopicSwitched] = useState(false);

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
      } else if (data.type === 'topic_switched') {
        setShowTopicSwitched(true);
        setTimeout(() => setShowTopicSwitched(false), 3000);
      } else if (data.type === 'cleared') {
        // Clear local messages and refetch
        setMessages([]);
      }
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentConversation]);

  const handleSend = (content: string) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'user_message',
        content,
      }));
    }
  };

  const handleClear = () => {
    if (ws && ws.readyState === WebSocket.OPEN && currentConversation) {
      ws.send(JSON.stringify({ type: 'clear' }));
    }
  };

  const getStreamingMessages = (): Message[] => {
    const streaming: Message[] = [];
    streamingMessages.forEach((content, agentId) => {
      if (content) {
        streaming.push({
          id: -agentId,
          conversation_id: currentConversation?.id || 0,
          sender_type: 'agent',
          sender_id: agentId,
          content,
          created_at: new Date().toISOString(),
        });
      }
    });
    return streaming;
  };

  const displayMessages = [...messages, ...getStreamingMessages()];

  const displayAgents = isGroupChat && conversationMembers.length > 0 
    ? conversationMembers 
    : (agent ? [agent] : []);

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex items-center gap-3 p-4 border-b border-border bg-surface">
        <button 
          onClick={onBack} 
          className="p-2 text-text-muted hover:text-text hover:bg-background rounded-lg transition"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <LengthAdjuster level={lengthLevel} onChange={(level) => {
          setLengthLevel(level);
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'set_length', level }));
          }
        }} />
        <button
          onClick={handleClear}
          className="p-2 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition"
          title="Clear chat history"
          aria-label="Clear chat"
        >
          <Trash2 size={20} />
        </button>
        {isGroupChat ? (
          <GroupAvatar agents={displayAgents} size="md" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center" aria-hidden="true">
            {agent?.avatar && agent.avatar.startsWith('http') ? (
              <img src={agent.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <Bot size={20} className="text-primary" />
            )}
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

      {showTopicSwitched && (
        <div className="px-4 py-2 bg-primary/10 text-primary text-sm text-center">
          话题已切换
        </div>
      )}

      <ChatArea messages={displayMessages} thinkingAgentId={thinkingAgents.size > 0 ? Array.from(thinkingAgents)[0] : undefined} />
      <MessageInput 
        onSend={handleSend}
        onCommand={(command, args) => {
          if (command === 'clear' && ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'clear' }));
          } else if (command === 'help') {
            // Show help message in chat
            const helpText = '可用命令:\n/clear - 清除聊天记录\n/help - 显示帮助\n/length [1-5] - 设置回复长度';
            addMessage({
              id: Date.now(),
              conversation_id: currentConversation?.id || 0,
              sender_type: 'agent',
              sender_id: 0,
              content: helpText,
              created_at: new Date().toISOString(),
            });
          } else if (command === 'length') {
            const level = parseInt(args) || 3;
            const validLevel = Math.max(1, Math.min(5, level));
            setLengthLevel(validLevel);
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'set_length', level: validLevel }));
            }
            addMessage({
              id: Date.now(),
              conversation_id: currentConversation?.id || 0,
              sender_type: 'agent',
              sender_id: 0,
              content: `回复长度已设置为 ${validLevel}`,
              created_at: new Date().toISOString(),
            });
          }
        }}
        disabled={thinkingAgents.size > 0} 
        agents={isGroupChat ? displayAgents : []}
      />
    </div>
  );
}
