import { parseTokenList } from './agentConfig';

export interface AgentDraftPreviewInput {
  name: string;
  description: string;
  personality: string;
  background: string;
  skills: string;
  tags: string;
  systemPrompt: string;
  model: string;
  matchedProviderName: string | null;
  responseSpeed: number;
  replyProbability: number;
  defaultLength: number;
  isPublic: boolean;
}

export interface AgentDraftPreview {
  completionScore: number;
  highlights: string[];
  responseSummary: string;
  visibilityLabel: string;
  warnings: string[];
}

const LENGTH_LABELS: Record<number, string> = {
  1: 'very short',
  2: 'short',
  3: 'balanced',
  4: 'detailed',
  5: 'very detailed',
};

function getSpeedLabel(responseSpeed: number): string {
  if (responseSpeed >= 1.4) {
    return 'fast';
  }
  if (responseSpeed <= 0.8) {
    return 'steady';
  }
  return 'balanced';
}

export function buildAgentDraftPreview(input: AgentDraftPreviewInput): AgentDraftPreview {
  const skills = parseTokenList(input.skills);
  const tags = parseTokenList(input.tags);

  const checks = [
    input.name.trim().length > 0,
    input.description.trim().length > 0,
    input.personality.trim().length > 0,
    input.background.trim().length > 0,
    input.systemPrompt.trim().length > 0,
    input.matchedProviderName !== null,
    skills.length + tags.length > 0,
  ];

  const completionScore = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  const warnings: string[] = [];

  if (!input.name.trim()) {
    warnings.push('Add an agent name.');
  }
  if (!input.description.trim()) {
    warnings.push('Add a short description so the profile is scannable.');
  }
  if (!input.matchedProviderName) {
    warnings.push('Connect a provider for the selected model.');
  }
  if (!input.systemPrompt.trim()) {
    warnings.push('Add a system prompt before saving.');
  }

  const highlights = [...skills, ...tags].slice(0, 3);
  const responseSummary = `${getSpeedLabel(input.responseSpeed)} replies ? ${Math.round(input.replyProbability * 100)}% reply rate ? ${LENGTH_LABELS[input.defaultLength] ?? 'balanced'} length`;

  return {
    completionScore,
    highlights,
    responseSummary,
    visibilityLabel: input.isPublic ? 'Public profile' : 'Private profile',
    warnings,
  };
}
