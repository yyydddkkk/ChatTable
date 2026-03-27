import { create } from 'zustand';
import { API_ENDPOINTS } from '../config/api';
import { apiFetch } from '../services/http';

export interface Provider {
  id: number;
  name: string;
  api_base: string;
  created_at: string;
  updated_at: string;
}

export interface AppSettings {
  optimizer_provider_id: number | null;
  optimizer_model: string;
}

export interface ProviderValidationResult {
  valid: boolean;
  message: string;
  latency_ms: number | null;
  models: string[];
  error: string | null;
}

interface ProviderStore {
  providers: Provider[];
  settings: AppSettings;
  isLoading: boolean;
  error: string | null;
  validatingProviders: Set<number>;

  fetchProviders: () => Promise<void>;
  createProvider: (data: { name: string; api_key: string; api_base: string }) => Promise<Provider | null>;
  updateProvider: (id: number, data: { name?: string; api_key?: string; api_base?: string }) => Promise<Provider | null>;
  deleteProvider: (id: number) => Promise<boolean>;
  validateProvider: (id: number) => Promise<ProviderValidationResult>;
  fetchSettings: () => Promise<void>;
  updateSettings: (data: Partial<AppSettings>) => Promise<void>;
}

export const useProviderStore = create<ProviderStore>((set) => ({
  providers: [],
  settings: { optimizer_provider_id: null, optimizer_model: 'qwen-plus' },
  isLoading: false,
  error: null,
  validatingProviders: new Set(),

  fetchProviders: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiFetch(API_ENDPOINTS.providers);
      if (!res.ok) throw new Error('Failed to fetch providers');
      const providers = await res.json();
      set({ providers, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  createProvider: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiFetch(API_ENDPOINTS.providers, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create provider');
      const provider = await res.json();
      set((s) => ({ providers: [...s.providers, provider], isLoading: false }));
      return provider;
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
      return null;
    }
  },

  updateProvider: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiFetch(`${API_ENDPOINTS.providers}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update provider');
      const provider = await res.json();
      set((s) => ({
        providers: s.providers.map((p) => (p.id === id ? provider : p)),
        isLoading: false,
      }));
      return provider;
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
      return null;
    }
  },

  deleteProvider: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiFetch(`${API_ENDPOINTS.providers}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete provider');
      set((s) => ({
        providers: s.providers.filter((p) => p.id !== id),
        isLoading: false,
      }));
      return true;
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
      return false;
    }
  },

  validateProvider: async (id) => {
    set((s) => ({ validatingProviders: new Set(s.validatingProviders).add(id) }));
    try {
      const res = await apiFetch(`${API_ENDPOINTS.providers}/${id}/validate`, {
        method: 'POST',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Validation failed');
      }
      const result = await res.json();
      return result;
    } catch (e) {
      return {
        valid: false,
        message: (e as Error).message,
        latency_ms: null,
        models: [],
        error: (e as Error).message,
      };
    } finally {
      set((s) => {
        const newSet = new Set(s.validatingProviders);
        newSet.delete(id);
        return { validatingProviders: newSet };
      });
    }
  },

  fetchSettings: async () => {
    try {
      const res = await apiFetch(API_ENDPOINTS.settings);
      if (!res.ok) return;
      const settings = await res.json();
      set({ settings });
    } catch {
      // ignore
    }
  },

  updateSettings: async (data) => {
    try {
      const res = await apiFetch(API_ENDPOINTS.settings, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) return;
      const settings = await res.json();
      set({ settings });
    } catch {
      // ignore
    }
  },
}));
