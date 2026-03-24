import { describe, expect, it } from 'vitest';

import { buildAgentSectionStats } from './agentSectionStats';

describe('buildAgentSectionStats', () => {
  it('computes completion counts for each section', () => {
    const stats = buildAgentSectionStats({
      name: 'Nova',
      avatar: 'Robot',
      description: '',
      model: 'gpt-4o',
      matchedProviderName: null,
      systemPrompt: 'You are helpful.',
      personality: 'warm',
      background: '',
      skills: '["research"]',
      tags: '',
      responseSpeed: 1,
      replyProbability: 0.8,
      defaultLength: 3,
      isPublic: false,
    });

    expect(stats.identity.completed).toBe(2);
    expect(stats.identity.total).toBe(3);
    expect(stats.persona.completed).toBe(2);
    expect(stats.brain.completed).toBe(2);
    expect(stats.behavior.completed).toBe(0);
    expect(stats.preview.completed).toBeGreaterThan(0);
  });

  it('marks a fully configured draft as complete across all sections', () => {
    const stats = buildAgentSectionStats({
      name: 'Nova',
      avatar: 'Robot',
      description: 'A thoughtful research partner.',
      model: 'gpt-4o',
      matchedProviderName: 'OpenAI',
      systemPrompt: 'You are Nova, a helpful research partner.',
      personality: 'warm',
      background: 'Works with notes and archives.',
      skills: '["research","analysis"]',
      tags: '["study"]',
      responseSpeed: 1.4,
      replyProbability: 0.95,
      defaultLength: 4,
      isPublic: true,
    });

    expect(stats.identity.completed).toBe(stats.identity.total);
    expect(stats.persona.completed).toBe(stats.persona.total);
    expect(stats.brain.completed).toBe(stats.brain.total);
    expect(stats.behavior.completed).toBe(stats.behavior.total);
    expect(stats.preview.label).toContain('ready');
  });
});
