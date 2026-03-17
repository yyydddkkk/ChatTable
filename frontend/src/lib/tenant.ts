const TENANT_STORAGE_KEY = 'chattable.tenant-id';
const DEFAULT_TENANT_ID = 'local';

export function normalizeTenantId(tenantId: string | null | undefined): string {
  const normalized = (tenantId ?? '').trim();
  return normalized.length > 0 ? normalized : DEFAULT_TENANT_ID;
}

export function getTenantIdFromStorage(): string {
  if (typeof window === 'undefined') {
    return DEFAULT_TENANT_ID;
  }

  return normalizeTenantId(window.localStorage.getItem(TENANT_STORAGE_KEY));
}

export function persistTenantId(tenantId: string): string {
  const normalized = normalizeTenantId(tenantId);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(TENANT_STORAGE_KEY, normalized);
  }
  return normalized;
}

export const tenantConstants = {
  defaultTenantId: DEFAULT_TENANT_ID,
  storageKey: TENANT_STORAGE_KEY,
} as const;
