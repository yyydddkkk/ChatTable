const TOKEN_SEPARATOR = /[\n,?;?]/;

function normalizeTokens(tokens: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const token of tokens) {
    const normalized = token.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

export function parseTokenList(rawValue?: string | null): string[] {
  const raw = rawValue?.trim();
  if (!raw) {
    return [];
  }

  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return normalizeTokens(parsed.map((item) => String(item)));
      }
    } catch {
      // Fall back to plain-text parsing below.
    }
  }

  return normalizeTokens(raw.split(TOKEN_SEPARATOR));
}

export function appendTokenDraft(existingTokens: string[], draft: string): string[] {
  return normalizeTokens([...existingTokens, ...parseTokenList(draft)]);
}

export function serializeTokenList(tokens: string[]): string {
  const normalized = normalizeTokens(tokens);
  return normalized.length > 0 ? JSON.stringify(normalized) : '';
}
