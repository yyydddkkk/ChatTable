export const API_CONFIG = {
  baseUrl: 'http://localhost:8000',
  apiVersion: 'v1',
  wsProtocol: 'ws',
} as const;

export const API_ENDPOINTS = {
  agents: `${API_CONFIG.baseUrl}/api/${API_CONFIG.apiVersion}/agents`,
  conversations: `${API_CONFIG.baseUrl}/api/${API_CONFIG.apiVersion}/conversations`,
} as const;

export const WS_ENDPOINTS = {
  conversation: (conversationId: number | string) =>
    `${API_CONFIG.wsProtocol}://localhost:8000/ws/${conversationId}`,
} as const;
