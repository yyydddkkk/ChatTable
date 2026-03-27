import { useEffect, useRef } from 'react';
import type { FC } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { useAgentStore } from '../stores/agentStore';
import type { Message } from '../types';
import { AgentAvatar } from './AgentAvatar';

function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/<think>[\s\S]*/g, '').trim();
}

interface ChatAreaProps {
  messages: Message[];
  thinkingAgentId?: number;
  thinkingAgentIds?: number[];
}

export const ChatArea: FC<ChatAreaProps> = ({
  messages,
  thinkingAgentId,
  thinkingAgentIds = [],
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousLengthRef = useRef(0);
  const { agents } = useAgentStore();

  useEffect(() => {
    const previousLength = previousLengthRef.current;
    const currentLength = messages.length;
    const behavior: ScrollBehavior = previousLength === 0 ? 'auto' : 'smooth';
    messagesEndRef.current?.scrollIntoView({ behavior });
    previousLengthRef.current = currentLength;
  }, [messages, thinkingAgentId, thinkingAgentIds]);

  const getAgent = (agentId?: number) => agents.find((agent) => agent.id === agentId);
  const hasThinkingState = thinkingAgentId !== undefined || thinkingAgentIds.length > 0;

  if (messages.length === 0 && !hasThinkingState) {
    return <div className="flex-1" />;
  }

  return (
    <div className="pluto-chat-thread flex-1 overflow-y-auto px-7 py-7">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        {messages.map((message) => {
          const isUser = message.sender_type === 'user';
          const agent = !isUser ? getAgent(message.sender_id) : null;

          return (
            <div
              key={message.id}
              className={`pluto-message-row flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex gap-3 ${isUser ? 'max-w-[68%] flex-row-reverse' : 'max-w-[74%] flex-row'}`}
              >
                {!isUser && agent && (
                  <AgentAvatar agent={agent} size={38} iconSize={17} className="mt-1" />
                )}

                <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
                  {!isUser && agent && (
                    <span className="px-1 text-sm font-medium text-[--color-text]">{agent.name}</span>
                  )}

                  <div
                    className={`animate-messagePop px-5 py-4 text-[15px] leading-[1.7] ${
                      isUser
                        ? 'pluto-chat-bubble pluto-chat-bubble--user text-white'
                        : 'pluto-chat-bubble pluto-chat-bubble--agent text-[--color-text]'
                    }`}
                  >
                    {isUser ? (
                      <span className="whitespace-pre-wrap">{message.content}</span>
                    ) : (
                      <div className="markdown-body select-text">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {stripThinking(message.content)}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>

                  <span className="px-1 text-[11px] text-[--color-text-subtle]">
                    {new Date(message.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {hasThinkingState && (
          <div className="flex justify-start animate-fadeIn">
            <div className="flex max-w-[74%] gap-3">
              {thinkingAgentId && getAgent(thinkingAgentId) && (
                <AgentAvatar
                  agent={getAgent(thinkingAgentId)!}
                  size={38}
                  iconSize={17}
                  className="mt-1"
                />
              )}
              <div className="pluto-thinking-bubble rounded-[24px] rounded-bl-[10px] px-5 py-4">
                <div className="flex items-center gap-3" role="status" aria-label="AI 正在思考">
                  <div className="flex gap-1.5">
                    {[0, 0.18, 0.36].map((delay) => (
                      <span
                        key={delay}
                        className="pluto-thinking-dot h-2.5 w-2.5 rounded-full"
                        style={{
                          animation: 'bounce 1.2s ease-in-out infinite',
                          animationDelay: `${delay}s`,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-[--color-text-muted]">正在输入…</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

