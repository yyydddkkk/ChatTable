import { useEffect, useRef } from 'react';
import type { FC } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '../types';
import { useAgentStore, type Agent } from '../stores/agentStore';
import { AvatarIcon, getAgentPalette } from '../lib/agentPalette';

/** Strip <think>...</think> blocks from model output */
function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/<think>[\s\S]*/g, '').trim();
}

interface ChatAreaProps {
  messages: Message[];
  thinkingAgentId?: number;
  thinkingAgentIds?: number[];
}

export const ChatArea: FC<ChatAreaProps> = ({ messages, thinkingAgentId, thinkingAgentIds = [] }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);
  const { agents } = useAgentStore();

  useEffect(() => {
    const prevLen = prevLengthRef.current;
    const curLen = messages.length;
    // From 0 → N (conversation switch / initial load): jump instantly
    // From N → N+M (new message / streaming): smooth scroll
    const behavior = prevLen === 0 && curLen > 0 ? 'instant' : 'smooth';
    messagesEndRef.current?.scrollIntoView({ behavior });
    prevLengthRef.current = curLen;
  }, [messages, thinkingAgentId, thinkingAgentIds]);

  const getAgent = (agentId?: number) => {
    return agents.find((a) => a.id === agentId);
  };

  const isThinking = thinkingAgentId !== undefined || thinkingAgentIds.length > 0;

  return (
    <div 
      className="flex-1 overflow-y-auto p-5 space-y-4"
      style={{
        background: 'linear-gradient(180deg, var(--color-background) 0%, #F8F5F0 100%)',
      }}
    >
      {messages.map((msg) => {
        const isUser = msg.sender_type === 'user';
        const agent = !isUser ? getAgent(msg.sender_id) : null;
        const palette = agent ? getAgentPalette(agent.id) : null;

        return (
          <div
            key={msg.id}
            className="flex animate-fadeIn"
            style={{ justifyContent: isUser ? 'flex-end' : 'flex-start' }}
          >
            <div
              className="flex gap-3 max-w-[70%]"
              style={{ flexDirection: isUser ? 'row-reverse' : 'row' }}
            >
              {!isUser && agent && (
                <AgentAvatar 
                  agent={agent} 
                  size={36} 
                  onClick={() => {}}
                  className="cursor-pointer shrink-0"
                />
              )}
              <div
                className="flex flex-col"
                style={{ 
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                  gap: 6,
                }}
              >
                {!isUser && (
                  <span 
                    className="text-xs font-semibold ml-1 tracking-wide"
                    style={{ color: palette?.dot || '#888' }}
                  >
                    {agent?.name}
                  </span>
                )}
                <div
                  className="relative"
                  style={isUser 
                    ? {
                        background: 'linear-gradient(135deg, #EA7850 0%, #E86848 100%)',
                        color: '#fff',
                        padding: '12px 18px',
                        borderRadius: 20,
                        borderTopRightRadius: 6,
                        fontSize: 14,
                        lineHeight: 1.65,
                        wordBreak: 'break-word',
                        boxShadow: '0 4px 16px rgba(234,120,80,0.25)',
                      }
                    : {
                        background: '#FFFFFF',
                        color: '#2C2A27',
                        padding: '12px 18px',
                        borderRadius: 20,
                        borderTopLeftRadius: 6,
                        fontSize: 14,
                        lineHeight: 1.65,
                        wordBreak: 'break-word',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                        borderLeft: `4px solid ${palette?.dot || '#ccc'}`,
                      }
                  }
                >
                  {isUser ? (
                    <span className="select-text">{msg.content}</span>
                  ) : (
                    <div className="select-text markdown-body">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {stripThinking(msg.content)}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
                <span 
                  className="text-[10px] px-1"
                  style={{ color: 'var(--color-text-subtle)' }}
                >
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        );
      })}

      {isThinking && (
        <div className="flex justify-start animate-fadeIn">
          <div className="flex gap-3 max-w-[70%]">
            {thinkingAgentId && (
              <AgentAvatar 
                agent={getAgent(thinkingAgentId)!} 
                size={36} 
                onClick={() => {}}
              />
            )}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 20,
                borderTopLeftRadius: 6,
                padding: '14px 20px',
                display: 'flex',
                gap: 6,
                alignItems: 'center',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              }}
              role="status"
              aria-label="AI 正在思考"
            >
              {[0, 0.15, 0.3].map((delay) => (
                <div
                  key={delay}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #EA7850 0%, #E86848 100%)',
                    animation: 'bounce 1.2s ease-in-out infinite',
                    animationDelay: `${delay}s`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

interface AgentAvatarProps {
  agent: Agent;
  size?: number;
  className?: string;
  onClick?: () => void;
}

const AgentAvatar: FC<AgentAvatarProps> = ({ agent, size = 40, className = '', onClick }) => {
  const palette = getAgentPalette(agent.id);
  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: palette.bg,
        border: `2px solid ${palette.border}`,
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        transition: 'transform 0.2s ease',
      }}
    >
      <AvatarIcon avatarLabel={agent.avatar} size={size * 0.5} style={{ color: palette.dot }} />
    </div>
  );
};
