import type { FC } from 'react';
import type { Agent } from '../stores/agentStore';
import { AvatarIcon, getAgentPalette } from '../lib/agentPalette';

interface GroupAvatarProps {
  agents: Agent[];
  size?: number | 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 32,
  md: 40,
  lg: 48,
};

export const GroupAvatar: FC<GroupAvatarProps> = ({ agents, size = 40 }) => {
  const sizeValue = typeof size === 'number' ? size : sizeMap[size];
  
  return (
    <div
      style={{
        width: sizeValue,
        height: sizeValue,
        borderRadius: sizeValue * 0.28,
        background: '#EBE8E2',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 1.5,
        padding: 3,
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {agents.slice(0, 4).map((agent) => {
        const palette = getAgentPalette(agent.id);
        return (
          <div
            key={agent.id}
            style={{
              background: palette.bg,
              borderRadius: 3,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AvatarIcon avatarLabel={agent.avatar} size={sizeValue * 0.22} style={{ color: palette.dot }} />
          </div>
        );
      })}
    </div>
  );
};
