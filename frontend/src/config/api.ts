export const API_CONFIG = {
  baseUrl: '',
  apiVersion: 'v1',
  wsProtocol: 'ws',
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
  conversation: (conversationId: number | string) =>
    `${API_CONFIG.wsProtocol}://localhost:8000/ws/${conversationId}`,
} as const;
