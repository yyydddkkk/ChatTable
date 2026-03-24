import { parseTokenList, serializeTokenList } from './agentConfig';

export interface AgentQuickFillDraft {
  name: string;
  description: string;
  personality: string;
  background: string;
  skills: string;
  tags: string;
  system_prompt: string;
  response_speed: number;
  reply_probability: number;
  default_length: number;
}

export interface AgentQuickFillPreset {
  id: string;
  label: string;
  accent: string;
  helper: string;
  description: string;
  personality: string;
  background: string;
  systemPrompt: string;
  skills: string[];
  tags: string[];
  responseSpeed: number;
  replyProbability: number;
  defaultLength: number;
}

export const DEFAULT_AGENT_SYSTEM_PROMPT = 'You are a helpful AI assistant.';
export const DEFAULT_RESPONSE_SPEED = 1.0;
export const DEFAULT_REPLY_PROBABILITY = 0.8;
export const DEFAULT_DEFAULT_LENGTH = 3;

export const AGENT_QUICK_FILL_PRESETS: AgentQuickFillPreset[] = [
  {
    id: 'researcher',
    label: 'Researcher',
    accent: 'bg-sky-50 text-sky-700',
    helper: 'Structured, evidence-first, and calm.',
    description: 'A calm research partner who turns questions into grounded notes.',
    personality: 'Curious, methodical, and patient.',
    background: 'Experienced in collecting sources, comparing viewpoints, and organizing findings.',
    systemPrompt: 'You are a rigorous research partner. Clarify goals, compare evidence, and answer with grounded reasoning.',
    skills: ['research', 'analysis'],
    tags: ['study', 'evidence'],
    responseSpeed: 1.0,
    replyProbability: 0.8,
    defaultLength: 4,
  },
  {
    id: 'tutor',
    label: 'Tutor',
    accent: 'bg-emerald-50 text-emerald-700',
    helper: 'Explains step by step with friendly pacing.',
    description: 'A supportive tutor who explains complex ideas in clear steps.',
    personality: 'Encouraging, clear, and attentive.',
    background: 'Used to breaking down concepts, checking understanding, and guiding practice.',
    systemPrompt: 'You are a patient tutor. Explain ideas step by step, check understanding, and keep examples practical.',
    skills: ['teaching', 'examples'],
    tags: ['learning', 'clarity'],
    responseSpeed: 0.9,
    replyProbability: 0.85,
    defaultLength: 4,
  },
  {
    id: 'companion',
    label: 'Companion',
    accent: 'bg-rose-50 text-rose-700',
    helper: 'Warm, reassuring, and conversational.',
    description: 'A warm companion who keeps conversations calm and supportive.',
    personality: 'Empathetic, steady, and kind.',
    background: 'Focused on reflective conversations, check-ins, and emotional support.',
    systemPrompt: 'You are a thoughtful companion. Be warm, attentive, and emotionally aware while staying practical.',
    skills: ['empathy', 'check-ins'],
    tags: ['warm', 'support'],
    responseSpeed: 1.1,
    replyProbability: 0.9,
    defaultLength: 3,
  },
];

function keepExistingOrPreset(currentValue: string, presetValue: string): string {
  return currentValue.trim() ? currentValue : presetValue;
}


function mergeTokens(existingValue: string, presetTokens: string[]): string {
  return serializeTokenList([...parseTokenList(existingValue), ...presetTokens]);
}

export function applyAgentQuickFill(
  draft: AgentQuickFillDraft,
  preset: AgentQuickFillPreset,
): AgentQuickFillDraft {
  const shouldReplacePrompt = !draft.system_prompt.trim() || draft.system_prompt === DEFAULT_AGENT_SYSTEM_PROMPT;

  return {
    ...draft,
    description: keepExistingOrPreset(draft.description, preset.description),
    personality: keepExistingOrPreset(draft.personality, preset.personality),
    background: keepExistingOrPreset(draft.background, preset.background),
    skills: mergeTokens(draft.skills, preset.skills),
    tags: mergeTokens(draft.tags, preset.tags),
    system_prompt: shouldReplacePrompt ? preset.systemPrompt : draft.system_prompt,
    response_speed: draft.response_speed === DEFAULT_RESPONSE_SPEED ? preset.responseSpeed : draft.response_speed,
    reply_probability: draft.reply_probability === DEFAULT_REPLY_PROBABILITY ? preset.replyProbability : draft.reply_probability,
    default_length: draft.default_length === DEFAULT_DEFAULT_LENGTH ? preset.defaultLength : draft.default_length,
  };
}
