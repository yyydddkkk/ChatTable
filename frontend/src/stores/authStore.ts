import { create } from 'zustand';

import { API_ENDPOINTS } from '../config/api';
import {
  clearAccessToken,
  getAccessTokenFromStorage,
  persistAccessToken,
} from '../lib/auth';
import { useTenantStore } from './tenantStore';

export interface AuthUser {
  id: number;
  tenant_id: string;
  username: string;
}

interface LoginPayload {
  tenant_id: string;
  username: string;
  password: string;
}

interface RegisterPayload {
  tenant_id: string;
  username: string;
  password: string;
}

interface AuthStore {
  accessToken: string | null;
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  hydrateAuth: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<boolean>;
  logout: () => void;
  register: (payload: RegisterPayload) => Promise<boolean>;
}

function buildAuthHeaders(tenantId: string, token?: string): Headers {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  headers.set('X-Tenant-Id', tenantId);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

export const useAuthStore = create<AuthStore>((set) => ({
  accessToken: getAccessTokenFromStorage(),
  currentUser: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  hydrateAuth: async () => {
    const token = getAccessTokenFromStorage();
    if (!token) {
      set({ accessToken: null, currentUser: null, isAuthenticated: false });
      return;
    }

    const tenantId = useTenantStore.getState().tenantId;
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(API_ENDPOINTS.authMe, {
        headers: buildAuthHeaders(tenantId, token),
      });
      if (!response.ok) {
        throw new Error('Session expired, please login again.');
      }

      const currentUser = (await response.json()) as AuthUser;
      set({
        accessToken: token,
        currentUser,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      clearAccessToken();
      set({
        accessToken: null,
        currentUser: null,
        isAuthenticated: false,
        isLoading: false,
        error: (error as Error).message,
      });
    }
  },

  login: async (payload: LoginPayload) => {
    set({ isLoading: true, error: null });
    useTenantStore.getState().setTenantId(payload.tenant_id);

    try {
      const response = await fetch(API_ENDPOINTS.authLogin, {
        method: 'POST',
        headers: buildAuthHeaders(payload.tenant_id),
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Login failed');
      }

      const data = (await response.json()) as {
        access_token: string;
        tenant_id: string;
        token_type: string;
      };
      const accessToken = persistAccessToken(data.access_token);
      useTenantStore.getState().setTenantId(data.tenant_id || payload.tenant_id);

      const meResponse = await fetch(API_ENDPOINTS.authMe, {
        headers: buildAuthHeaders(
          data.tenant_id || payload.tenant_id,
          accessToken,
        ),
      });
      if (!meResponse.ok) {
        throw new Error('Login succeeded but loading user profile failed');
      }

      const currentUser = (await meResponse.json()) as AuthUser;
      set({
        accessToken,
        currentUser,
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    } catch (error) {
      clearAccessToken();
      set({
        accessToken: null,
        currentUser: null,
        isAuthenticated: false,
        isLoading: false,
        error: (error as Error).message,
      });
      return false;
    }
  },

  logout: () => {
    clearAccessToken();
    set({
      accessToken: null,
      currentUser: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },

  register: async (payload: RegisterPayload) => {
    set({ isLoading: true, error: null });
    useTenantStore.getState().setTenantId(payload.tenant_id);

    try {
      const response = await fetch(API_ENDPOINTS.authRegister, {
        method: 'POST',
        headers: buildAuthHeaders(payload.tenant_id),
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Register failed');
      }

      set({ isLoading: false });
      return true;
    } catch (error) {
      set({ isLoading: false, error: (error as Error).message });
      return false;
    }
  },
}));
