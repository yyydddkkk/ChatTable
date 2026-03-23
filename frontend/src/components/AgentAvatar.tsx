import { createElement } from 'react';
import type { CSSProperties, FC } from 'react';

import { getAgentPalette, getAvatarIcon } from '../lib/agentPalette';

interface AgentAvatarProps {
  agent: {
    id: number;
    avatar?: string | null;
    name?: string;
  };
  className?: string;
  iconSize?: number;
  size?: number;
  style?: CSSProperties;
}

export const AgentAvatar: FC<AgentAvatarProps> = ({
  agent,
  className = '',
  iconSize,
  size = 40,
  style,
}) => {
  const palette = getAgentPalette(agent.id);
  const avatarIcon = getAvatarIcon(agent.avatar);

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-[18px] border ${className}`}
      style={{
        width: size,
        height: size,
        background: palette.bg,
        borderColor: palette.border,
        boxShadow: '0 10px 24px rgba(8, 11, 26, 0.18)',
        ...style,
      }}
      title={agent.name}
    >
      {createElement(avatarIcon, {
        size: iconSize ?? Math.round(size * 0.48),
        style: { color: palette.dot },
      })}
    </div>
  );
};
