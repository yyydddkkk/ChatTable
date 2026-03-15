import { create } from 'zustand';

import {
  getTenantIdFromStorage,
  normalizeTenantId,
  persistTenantId,
  tenantConstants,
} from '../lib/tenant';

interface TenantStore {
  tenantId: string;
  setTenantId: (tenantId: string) => void;
  resetTenantId: () => void;
}

export const useTenantStore = create<TenantStore>((set) => ({
  tenantId: getTenantIdFromStorage(),

  setTenantId: (tenantId: string) => {
    const normalized = persistTenantId(tenantId);
    set({ tenantId: normalized });
  },

  resetTenantId: () => {
    const normalized = persistTenantId(tenantConstants.defaultTenantId);
    set({ tenantId: normalizeTenantId(normalized) });
  },
}));
