import { createElement } from 'react';
import { Bot, BookOpen, Code, FlaskConical, Lightbulb, Palette, Sparkles, Star, User, Wand2 } from 'lucide-react';
import type { ComponentProps } from 'react';

export interface AgentPalette {
  bg: string;
  border: string;
  dot: string;
  text: string;
}

export const AGENT_PALETTES: AgentPalette[] = [
  { bg: '#FFF0ED', border: '#F4A090', dot: '#E8705A', text: '#7A2E1E' },
  { bg: '#EDF4FF', border: '#90B8F4', dot: '#5A8EE8', text: '#1E3A7A' },
  { bg: '#F0FFF0', border: '#90D4A0', dot: '#5AC870', text: '#1E6A2E' },
  { bg: '#FFF8ED', border: '#F4C890', dot: '#E8A85A', text: '#7A4A1E' },
  { bg: '#F5EDFF', border: '#C090F4', dot: '#9A5AE8', text: '#3E1E7A' },
];

interface AvatarIconProps extends ComponentProps<typeof Bot> {
  avatarLabel?: string | null;
}

export function AvatarIcon({ avatarLabel, ...props }: AvatarIconProps) {
  switch (avatarLabel) {
    case 'User':
      return createElement(User, props);
    case 'Sparkles':
      return createElement(Sparkles, props);
    case 'Magic':
      return createElement(Wand2, props);
    case 'Developer':
      return createElement(Code, props);
    case 'Scientist':
      return createElement(FlaskConical, props);
    case 'Artist':
      return createElement(Palette, props);
    case 'Scholar':
      return createElement(BookOpen, props);
    case 'Star':
      return createElement(Star, props);
    case 'Idea':
      return createElement(Lightbulb, props);
    case 'Robot':
    default:
      return createElement(Bot, props);
  }
}

export const getAgentPalette = (id: number | string): AgentPalette => {
  const index = typeof id === 'string' ? parseInt(id) : id;
  return AGENT_PALETTES[index % AGENT_PALETTES.length];
};
