import { create } from 'zustand';
import { API_ENDPOINTS } from '../config/api';
import { apiFetch } from '../services/http';

export interface Agent {
  id: number;
  name: string;
  avatar?: string;
  description?: string;
  model: string;
  provider_id?: number;
  system_prompt: string;
  personality?: string;
  background?: string;
  skills?: string;
  tags?: string;
  response_speed: number;
  reply_probability: number;
  default_length: number;
  is_active: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface AgentStore {
  agents: Agent[];
  selectedAgent: Agent | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchAgents: () => Promise<void>;
  createAgent: (data: Partial<Agent>) => Promise<Agent | null>;
  updateAgent: (id: number, data: Partial<Agent>) => Promise<Agent | null>;
  deleteAgent: (id: number) => Promise<boolean>;
  selectAgent: (agent: Agent | null) => void;
  toggleActive: (id: number) => Promise<Agent | null>;
  clearError: () => void;
}

const API_BASE = API_ENDPOINTS.agents;

export const useAgentStore = create<AgentStore>((set) => ({
  agents: [],
  selectedAgent: null,
  isLoading: false,
  error: null,

  fetchAgents: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiFetch(API_BASE);
      if (!response.ok) {
        throw new Error('Failed to fetch agents');
      }
      const agents = await response.json();
      set({ agents, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createAgent: async (data: Partial<Agent>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiFetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create agent');
      }
      const agent = await response.json();
      set((state) => ({ 
        agents: [...state.agents, agent], 
        isLoading: false 
      }));
      return agent;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      return null;
    }
  },

  updateAgent: async (id: number, data: Partial<Agent>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiFetch(`${API_BASE}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update agent');
      }
      const agent = await response.json();
      set((state) => ({
        agents: state.agents.map((a) => (a.id === id ? agent : a)),
        selectedAgent: state.selectedAgent?.id === id ? agent : state.selectedAgent,
        isLoading: false,
      }));
      return agent;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      return null;
    }
  },

  deleteAgent: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiFetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete agent');
      }
      set((state) => ({
        agents: state.agents.filter((a) => a.id !== id),
        selectedAgent: state.selectedAgent?.id === id ? null : state.selectedAgent,
        isLoading: false,
      }));
      return true;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      return false;
    }
  },

  selectAgent: (agent: Agent | null) => {
    set({ selectedAgent: agent });
  },

  toggleActive: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiFetch(`${API_BASE}/${id}/toggle-active`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to toggle agent status');
      }
      const agent = await response.json();
      set((state) => ({
        agents: state.agents.map((a) => (a.id === id ? agent : a)),
        selectedAgent: state.selectedAgent?.id === id ? agent : state.selectedAgent,
        isLoading: false,
      }));
      return agent;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      return null;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
