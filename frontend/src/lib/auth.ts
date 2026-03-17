const ACCESS_TOKEN_STORAGE_KEY = 'chattable.access-token';

export function getAccessTokenFromStorage(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const token = window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  return token && token.trim().length > 0 ? token : null;
}

export function persistAccessToken(token: string): string {
  const normalized = token.trim();
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, normalized);
  }
  return normalized;
}

export function clearAccessToken(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  }
}

export const authConstants = {
  storageKey: ACCESS_TOKEN_STORAGE_KEY,
  unauthorizedEventName: 'chattable:unauthorized',
} as const;
