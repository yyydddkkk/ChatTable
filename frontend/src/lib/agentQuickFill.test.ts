import { describe, expect, it } from 'vitest';

import { AGENT_QUICK_FILL_PRESETS, applyAgentQuickFill } from './agentQuickFill';

describe('applyAgentQuickFill', () => {
  it('fills blank fields from the selected preset and appends unique tags', () => {
    const preset = AGENT_QUICK_FILL_PRESETS.find((item) => item.id === 'researcher');
    if (!preset) {
      throw new Error('researcher preset missing');
    }

    const nextDraft = applyAgentQuickFill(
      {
        name: '',
        description: '',
        personality: '',
        background: '',
        skills: '["writing"]',
        tags: '',
        system_prompt: 'You are a helpful AI assistant.',
        response_speed: 1,
        reply_probability: 0.8,
        default_length: 3,
      },
      preset,
    );

    expect(nextDraft.description).toBe(preset.description);
    expect(nextDraft.personality).toBe(preset.personality);
    expect(nextDraft.background).toBe(preset.background);
    expect(nextDraft.system_prompt).toBe(preset.systemPrompt);
    expect(nextDraft.skills).toBe('["writing","research","analysis"]');
    expect(nextDraft.tags).toBe('["study","evidence"]');
    expect(nextDraft.response_speed).toBe(preset.responseSpeed);
  });

  it('preserves customized fields while still appending preset tokens', () => {
    const preset = AGENT_QUICK_FILL_PRESETS.find((item) => item.id === 'companion');
    if (!preset) {
      throw new Error('companion preset missing');
    }

    const nextDraft = applyAgentQuickFill(
      {
        name: 'Nova',
        description: 'Custom description',
        personality: 'already set',
        background: 'custom background',
        skills: '["reflection"]',
        tags: '["support"]',
        system_prompt: 'Custom prompt',
        response_speed: 1.4,
        reply_probability: 0.95,
        default_length: 5,
      },
      preset,
    );

    expect(nextDraft.description).toBe('Custom description');
    expect(nextDraft.personality).toBe('already set');
    expect(nextDraft.background).toBe('custom background');
    expect(nextDraft.system_prompt).toBe('Custom prompt');
    expect(nextDraft.skills).toBe('["reflection","empathy","check-ins"]');
    expect(nextDraft.tags).toBe('["support","warm"]');
    expect(nextDraft.reply_probability).toBe(0.95);
    expect(nextDraft.default_length).toBe(5);
  });
});
