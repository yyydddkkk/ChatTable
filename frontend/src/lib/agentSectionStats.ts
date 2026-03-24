import { buildAgentDraftPreview, type AgentDraftPreviewInput } from './agentDraftPreview';
import { parseTokenList } from './agentConfig';
import {
  DEFAULT_DEFAULT_LENGTH,
  DEFAULT_REPLY_PROBABILITY,
  DEFAULT_RESPONSE_SPEED,
} from './agentQuickFill';

export interface AgentSectionStat {
  completed: number;
  total: number;
  label: string;
}

export interface AgentSectionStatsInput extends AgentDraftPreviewInput {
  avatar: string;
}

export interface AgentSectionStats {
  identity: AgentSectionStat;
  persona: AgentSectionStat;
  brain: AgentSectionStat;
  behavior: AgentSectionStat;
  preview: AgentSectionStat;
}

function buildStat(completed: number, total: number): AgentSectionStat {
  return {
    completed,
    total,
    label: `${completed}/${total}`,
  };
}

export function buildAgentSectionStats(input: AgentSectionStatsInput): AgentSectionStats {
  const skills = parseTokenList(input.skills);
  const tags = parseTokenList(input.tags);
  const preview = buildAgentDraftPreview(input);

  const identityCompleted = [input.name.trim(), input.avatar.trim(), input.description.trim()].filter(Boolean).length;
  const personaCompleted = [input.personality.trim(), input.background.trim(), skills.length + tags.length > 0 ? 'tokens' : '']
    .filter(Boolean)
    .length;
  const brainCompleted = [input.model.trim(), input.matchedProviderName ?? '', input.systemPrompt.trim()].filter(Boolean).length;
  const behaviorCompleted = [
    input.responseSpeed !== DEFAULT_RESPONSE_SPEED,
    input.replyProbability !== DEFAULT_REPLY_PROBABILITY,
    input.defaultLength !== DEFAULT_DEFAULT_LENGTH,
    input.isPublic,
  ].filter(Boolean).length;

  return {
    identity: buildStat(identityCompleted, 3),
    persona: buildStat(personaCompleted, 3),
    brain: buildStat(brainCompleted, 3),
    behavior: buildStat(behaviorCompleted, 4),
    preview: {
      completed: preview.completionScore,
      total: 100,
      label: `${preview.completionScore}% ready`,
    },
  };
}
