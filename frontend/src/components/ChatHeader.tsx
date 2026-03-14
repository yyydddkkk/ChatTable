import type { FC } from 'react';
import { MoreHorizontal, Zap } from 'lucide-react';
import type { Agent } from '../stores/agentStore';
import { GroupAvatar } from './GroupAvatar';
import { getAgentPalette, getAvatarIcon } from '../lib/agentPalette';

interface ChatHeaderProps {
  agent?: Agent | null;
  agents?: Agent[];
  isGroup?: boolean;
  onMoreClick?: () => void;
}

export const ChatHeader: FC<ChatHeaderProps> = ({ agent, agents = [], isGroup = false, onMoreClick }) => {
  return (
    <header 
      className="h-[64px] flex items-center justify-between px-5 shrink-0 z-5"
      style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
      }}
    >
      <div className="flex items-center gap-3">
        {isGroup ? (
          <GroupAvatar agents={agents} size={38} />
        ) : agent && (() => {
          const AvatarIcon = getAvatarIcon(agent.avatar);
          return (
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 38 * 0.28,
              background: getAgentPalette(agent.id).bg,
              border: `2px solid ${getAgentPalette(agent.id).border}`,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            <AvatarIcon size={20} style={{ color: getAgentPalette(agent.id).dot }} />
          </div>
          );
        })()}
        <div>
          <div className="text-[16px] font-bold text-[--color-text]">
            {isGroup ? agents.map(a => a.name).join(', ') : agent?.name}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span 
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #4CAF80 0%, #45A070 100%)',
                display: 'inline-block',
                boxShadow: '0 0 6px rgba(76,175,128,0.5)',
              }}
            />
            <span className="text-[11px] text-[--color-primary] font-medium">
              {isGroup ? `${agents.length} 个成员在线` : '在线 · 随时回复'}
            </span>
            <Zap size={10} className="text-[--color-primary] ml-0.5" />
          </div>
        </div>
      </div>
      <button
        onClick={onMoreClick}
        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:bg-black/5"
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-muted)',
        }}
        aria-label="更多选项"
      >
        <MoreHorizontal size={20} />
      </button>
    </header>
  );
};
