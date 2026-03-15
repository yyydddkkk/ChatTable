import { getTenantIdFromStorage } from '../lib/tenant';

export interface ApiRequestOptions extends RequestInit {
  skipTenantHeader?: boolean;
}

export async function apiFetch(
  input: RequestInfo | URL,
  options: ApiRequestOptions = {},
): Promise<Response> {
  const { skipTenantHeader = false, headers, ...rest } = options;
  const resolvedHeaders = new Headers(headers ?? {});

  if (!skipTenantHeader) {
    resolvedHeaders.set('X-Tenant-Id', getTenantIdFromStorage());
  }

  return fetch(input, {
    ...rest,
    headers: resolvedHeaders,
  });
}
