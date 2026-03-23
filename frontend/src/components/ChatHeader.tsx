import type { FC } from 'react';
import { Info, Search, Sparkles } from 'lucide-react';

import type { Agent } from '../stores/agentStore';
import type { Conversation } from '../types';
import { AgentAvatar } from './AgentAvatar';
import { GroupAvatar } from './GroupAvatar';

interface ChatHeaderProps {
  agent?: Agent | null;
  agents?: Agent[];
  conversation?: Conversation | null;
  isGroup?: boolean;
  onMoreClick?: () => void;
}

export const ChatHeader: FC<ChatHeaderProps> = ({
  agent,
  agents = [],
  conversation,
  isGroup = false,
  onMoreClick,
}) => {
  const title = conversation?.name || (isGroup ? '群聊' : agent?.name) || 'Pluto';
  const subtitle = isGroup ? `${agents.length} 位成员` : '在线';

  return (
    <header className="pluto-chat-header flex h-[72px] shrink-0 items-center justify-between px-6">
      <div className="flex min-w-0 items-center gap-4">
        {isGroup ? (
          <GroupAvatar agents={agents} size={44} />
        ) : agent ? (
          <AgentAvatar agent={agent} size={44} iconSize={20} />
        ) : (
          <div className="pluto-chat-header-fallback flex h-[44px] w-[44px] items-center justify-center rounded-[16px] text-[--color-secondary]">
            <Sparkles size={18} />
          </div>
        )}

        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-semibold text-[--color-text]">{title}</h1>
          <p className="truncate text-sm text-[--color-text-muted]">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="pluto-chat-header-action flex h-9 w-9 items-center justify-center rounded-full text-[--color-text-muted] transition hover:text-[--color-text]"
          aria-label="搜索消息"
        >
          <Search size={17} />
        </button>
        <button
          type="button"
          onClick={onMoreClick}
          className="pluto-chat-header-action flex h-9 w-9 items-center justify-center rounded-full text-[--color-text-muted] transition hover:text-[--color-text]"
          aria-label="查看会话信息"
        >
          <Info size={17} />
        </button>
      </div>
    </header>
  );
};

