import type { Agent } from '../stores/agentStore';

interface GroupAvatarProps {
  agents: Agent[];
  size?: 'sm' | 'md' | 'lg';
}

export default function GroupAvatar({ agents, size = 'md' }: GroupAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  const displayAgents = agents.slice(0, 4);
  const remaining = agents.length - 4;

  if (displayAgents.length <= 2) {
    return (
      <div className={`flex -space-x-2 ${sizeClasses[size]}`}>
        {displayAgents.map((agent, idx) => (
          <div
            key={agent.id}
            className={`${sizeClasses[size]} rounded-full bg-primary/10 flex items-center justify-center border-2 border-surface overflow-hidden`}
            style={{ zIndex: displayAgents.length - idx }}
          >
            <span>{agent.avatar || agent.name.charAt(0)}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 gap-0.5 ${sizeClasses[size]}`}>
      {displayAgents.map((agent) => (
        <div
          key={agent.id}
          className={`${sizeClasses[size]} rounded-full bg-primary/10 flex items-center justify-center overflow-hidden`}
        >
          <span>{agent.avatar || agent.name.charAt(0)}</span>
        </div>
      ))}
      {remaining > 0 && (
        <div className={`${sizeClasses[size]} rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium`}>
          +{remaining}
        </div>
      )}
    </div>
  );
}
