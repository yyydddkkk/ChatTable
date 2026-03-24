import { describe, expect, it } from 'vitest';

import { appendTokenDraft, parseTokenList, serializeTokenList } from './agentConfig';

describe('agentConfig helpers', () => {
  it('parses JSON arrays into trimmed unique tokens', () => {
    expect(parseTokenList('[" writing ", "coding", "writing"]')).toEqual([
      'writing',
      'coding',
    ]);
  });

  it('falls back to comma and newline separated text', () => {
    expect(parseTokenList(`writing, coding
research`)).toEqual([
      'writing',
      'coding',
      'research',
    ]);
  });

  it('appends unique tokens from draft text', () => {
    expect(appendTokenDraft(['writing'], 'coding, writing, research')).toEqual([
      'writing',
      'coding',
      'research',
    ]);
  });

  it('serializes cleaned tokens back to JSON arrays', () => {
    expect(serializeTokenList([' writing ', '', 'coding'])).toBe('["writing","coding"]');
  });
});
