export const API_CONFIG = {
  baseUrl: '',
  apiVersion: 'v1',
  wsBaseUrl: 'ws://localhost:8000',
} as const;

export const API_ENDPOINTS = {
  agents: `/api/${API_CONFIG.apiVersion}/agents`,
  authLogin: `/api/${API_CONFIG.apiVersion}/auth/login`,
  authMe: `/api/${API_CONFIG.apiVersion}/auth/me`,
  authRegister: `/api/${API_CONFIG.apiVersion}/auth/register`,
  generatePersona: `/api/${API_CONFIG.apiVersion}/agents/generate`,
  conversations: `/api/${API_CONFIG.apiVersion}/conversations`,
  optimizePrompt: `/api/${API_CONFIG.apiVersion}/agents/optimize-prompt`,
  providers: `/api/${API_CONFIG.apiVersion}/providers`,
  settings: `/api/${API_CONFIG.apiVersion}/settings`,
} as const;

export const WS_ENDPOINTS = {
  conversation: (
    conversationId: number | string,
    tenantId?: string,
    accessToken?: string,
  ) => {
    const base = `${API_CONFIG.wsBaseUrl}/ws/${conversationId}`;
    if (!tenantId && !accessToken) {
      return base;
    }

    const params = new URLSearchParams();
    if (tenantId) {
      params.set('tenant_id', tenantId);
    }
    if (accessToken) {
      params.set('access_token', accessToken);
    }
    return `${base}?${params.toString()}`;
  },
} as const;
