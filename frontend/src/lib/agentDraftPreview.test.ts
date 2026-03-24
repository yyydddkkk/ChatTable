import { describe, expect, it } from 'vitest';

import { buildAgentDraftPreview } from './agentDraftPreview';

describe('buildAgentDraftPreview', () => {
  it('flags missing core setup and provider availability', () => {
    const preview = buildAgentDraftPreview({
      name: '',
      description: '',
      personality: '',
      background: '',
      skills: '',
      tags: '',
      systemPrompt: 'You are helpful.',
      model: 'gpt-4o',
      matchedProviderName: null,
      responseSpeed: 1,
      replyProbability: 0.8,
      defaultLength: 3,
      isPublic: false,
    });

    expect(preview.completionScore).toBeLessThan(50);
    expect(preview.warnings).toContain('Add an agent name.');
    expect(preview.warnings).toContain('Connect a provider for the selected model.');
  });

  it('builds readable highlights and response summary for a complete draft', () => {
    const preview = buildAgentDraftPreview({
      name: 'Nova',
      description: 'A calm research partner.',
      personality: 'patient, curious',
      background: 'Worked on archives and note taking.',
      skills: '["research","summaries"]',
      tags: '["study","writing"]',
      systemPrompt: 'You are Nova, an insightful research partner.',
      model: 'gpt-4o',
      matchedProviderName: 'OpenAI',
      responseSpeed: 1.6,
      replyProbability: 0.9,
      defaultLength: 4,
      isPublic: true,
    });

    expect(preview.completionScore).toBe(100);
    expect(preview.highlights).toEqual(['research', 'summaries', 'study']);
    expect(preview.visibilityLabel).toBe('Public profile');
    expect(preview.responseSummary).toContain('fast');
    expect(preview.responseSummary).toContain('90%');
    expect(preview.warnings).toEqual([]);
  });
});
