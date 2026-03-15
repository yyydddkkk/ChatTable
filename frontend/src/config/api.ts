export const API_CONFIG = {
  baseUrl: '',
  apiVersion: 'v1',
  wsBaseUrl: 'ws://localhost:8000',
} as const;

export const API_ENDPOINTS = {
  agents: `/api/${API_CONFIG.apiVersion}/agents`,
  generatePersona: `/api/${API_CONFIG.apiVersion}/agents/generate`,
  conversations: `/api/${API_CONFIG.apiVersion}/conversations`,
  optimizePrompt: `/api/${API_CONFIG.apiVersion}/agents/optimize-prompt`,
  providers: `/api/${API_CONFIG.apiVersion}/providers`,
  settings: `/api/${API_CONFIG.apiVersion}/settings`,
} as const;

export const WS_ENDPOINTS = {
  conversation: (conversationId: number | string, tenantId?: string) => {
    const base = `${API_CONFIG.wsBaseUrl}/ws/${conversationId}`;
    if (!tenantId) {
      return base;
    }

    const params = new URLSearchParams({ tenant_id: tenantId });
    return `${base}?${params.toString()}`;
  },
} as const;
