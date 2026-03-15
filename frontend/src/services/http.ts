import { authConstants, clearAccessToken, getAccessTokenFromStorage } from '../lib/auth';
import { getTenantIdFromStorage } from '../lib/tenant';

export interface ApiRequestOptions extends RequestInit {
  handleUnauthorized?: boolean;
  skipAuthHeader?: boolean;
  skipTenantHeader?: boolean;
}

export async function apiFetch(
  input: RequestInfo | URL,
  options: ApiRequestOptions = {},
): Promise<Response> {
  const {
    handleUnauthorized = true,
    skipAuthHeader = false,
    skipTenantHeader = false,
    headers,
    ...rest
  } = options;
  const resolvedHeaders = new Headers(headers ?? {});

  if (!skipTenantHeader) {
    resolvedHeaders.set('X-Tenant-Id', getTenantIdFromStorage());
  }

  if (!skipAuthHeader) {
    const accessToken = getAccessTokenFromStorage();
    if (accessToken) {
      resolvedHeaders.set('Authorization', `Bearer ${accessToken}`);
    }
  }

  const response = await fetch(input, {
    ...rest,
    headers: resolvedHeaders,
  });

  if (handleUnauthorized && response.status === 401) {
    clearAccessToken();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(authConstants.unauthorizedEventName));
    }
  }

  return response;
}
