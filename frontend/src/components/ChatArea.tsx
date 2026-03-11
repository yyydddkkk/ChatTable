import { useEffect, useRef } from 'react';
import type { Message } from '../types';
import { useAgentStore } from '../stores/agentStore';

interface ChatAreaProps {
  messages: Message[];
  thinkingAgentId?: number;
}

export default function ChatArea({ messages, thinkingAgentId }: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { agents } = useAgentStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinkingAgentId]);

  const getAgent = (agentId?: number) => {
    return agents.find((a) => a.id === agentId);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-background">
      {messages.map((msg) => {
        const isUser = msg.sender_type === 'user';
        const agent = !isUser ? getAgent(msg.sender_id) : null;

        return (
          <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-2 max-w-[70%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
              {!isUser && agent && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">{agent.avatar || '🤖'}</span>
                </div>
              )}
              <div>
                {!isUser && agent && (
                  <div className="text-xs text-text-muted mb-1">{agent.name}</div>
                )}
                <div
                  className={`px-4 py-2 rounded-2xl ${
                    isUser
                      ? 'bg-primary text-white rounded-br-sm'
                      : 'bg-surface text-text rounded-bl-sm shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {thinkingAgentId && (
        <div className="flex justify-start">
          <div className="flex gap-2 max-w-[70%]">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">🤖</span>
            </div>
            <div className="px-4 py-2 rounded-2xl bg-surface text-text rounded-bl-sm shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
