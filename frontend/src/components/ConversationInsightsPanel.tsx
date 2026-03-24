import type { FC } from 'react';
import { Bell, Clock3, HeartHandshake, Sparkles, Stars } from 'lucide-react';

import type { Agent } from '../stores/agentStore';
import type { Conversation } from '../types';
import { AgentAvatar } from './AgentAvatar';
import { GroupAvatar } from './GroupAvatar';

interface ConversationInsightsPanelProps {
  agent?: Agent | null;
  agents?: Agent[];
  conversation?: Conversation | null;
  isGroup?: boolean;
}

function parseTagList(raw?: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string');
    }
  } catch {
    return raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

const placeholderModules = [
  { icon: HeartHandshake, title: '关系', description: '等待后端接入关系强度。' },
  { icon: Sparkles, title: '记忆', description: '等待后端接入长期记忆。' },
  { icon: Bell, title: '提醒', description: '等待后端接入通知设置。' },
];

export const ConversationInsightsPanel: FC<ConversationInsightsPanelProps> = ({
  agent,
  agents = [],
  conversation,
  isGroup = false,
}) => {
  const activeTags = isGroup ? ['群聊', '多 Agent'] : parseTagList(agent?.tags).slice(0, 2);

  return (
    <aside className="pluto-insights-drawer flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div className="pluto-insights-header shrink-0 px-5 py-4">
        <div className="pluto-insights-hero rounded-[24px] px-4 py-4">
          <div className="flex items-center gap-3">
            {isGroup ? (
              <GroupAvatar agents={agents} size={46} />
            ) : agent ? (
              <AgentAvatar agent={agent} size={46} iconSize={21} />
            ) : (
              <div className="pluto-chat-header-fallback flex h-[46px] w-[46px] items-center justify-center rounded-[16px] text-[--color-primary]">
                <Stars size={18} />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-[--color-text-subtle]">
                会话信息
              </p>
              <h2 className="mt-1 truncate text-[17px] font-semibold text-[--color-text]">
                {conversation?.name || agent?.name || '未选择会话'}
              </h2>
            </div>
          </div>

          {activeTags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {activeTags.map((tag) => (
                <span key={tag} className="pluto-inline-tag rounded-full px-3 py-1 text-xs">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4">
        <section className="pluto-ios-group p-4">
          <div className="mb-3 flex items-center gap-2 text-[13px] font-medium text-[--color-text]">
            <Clock3 size={15} className="text-[--color-text-subtle]" />状态
          </div>
          <div className="space-y-3 text-sm text-[--color-text-muted]">
            <div className="flex items-center justify-between">
              <span>活跃状态</span>
              <span className="text-[--color-text]">刚刚活跃</span>
            </div>
            <div className="flex items-center justify-between">
              <span>会话类型</span>
              <span>{isGroup ? '群聊' : '私聊'}</span>
            </div>
          </div>
        </section>

        {placeholderModules.map(({ icon: Icon, title, description }) => (
          <section key={title} className="pluto-ios-group p-4">
            <div className="mb-2 flex items-center gap-2 text-[13px] font-medium text-[--color-text]">
              <Icon size={15} className="text-[--color-text-subtle]" />
              {title}
            </div>
            <p className="text-[13px] leading-6 text-[--color-text-muted]">{description}</p>
          </section>
        ))}
      </div>
    </aside>
  );
};
