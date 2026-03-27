import { Bot, User, Sparkles, Wand2, Code, FlaskConical, Palette, BookOpen, Star, Lightbulb } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

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

const AVATAR_ICON_MAP: Record<string, LucideIcon> = {
  Robot: Bot,
  User: User,
  Sparkles: Sparkles,
  Magic: Wand2,
  Developer: Code,
  Scientist: FlaskConical,
  Artist: Palette,
  Scholar: BookOpen,
  Star: Star,
  Idea: Lightbulb,
};

export const getAvatarIcon = (avatarLabel?: string | null): LucideIcon => {
  if (avatarLabel && AVATAR_ICON_MAP[avatarLabel]) {
    return AVATAR_ICON_MAP[avatarLabel];
  }
  return Bot;
};

export const getAgentPalette = (id: number | string): AgentPalette => {
  const index = typeof id === 'string' ? parseInt(id) : id;
  return AGENT_PALETTES[index % AGENT_PALETTES.length];
};
