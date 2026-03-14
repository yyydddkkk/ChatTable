import { create } from 'zustand';
import type { Conversation, Message } from '../types';
import { API_ENDPOINTS } from '../config/api';

interface ConversationStore {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;

  fetchConversations: () => Promise<Conversation[]>;
  createConversation: (data: { type: 'private' | 'group'; name: string; members: string }) => Promise<Conversation | null>;
  setCurrentConversation: (conversation: Conversation | null) => void;
  fetchMessages: (conversationId: number) => Promise<void>;
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  clearError: () => void;
}

const API_BASE = API_ENDPOINTS.conversations;

export const useConversationStore = create<ConversationStore>((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  isLoading: false,
  error: null,

  fetchConversations: async () => {
    set({ isLoading: true, error: null });
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(API_BASE, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error('Failed to fetch conversations');
      const conversations = await response.json();
      set({ conversations, isLoading: false });
      return conversations;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      return [];
    }
  },

  createConversation: async (data: { type: 'private' | 'group'; name: string; members: string }) => {
    set({ isLoading: true, error: null });
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error('Failed to create conversation');
      const conversation = await response.json();
      set((state) => ({
        conversations: [...state.conversations, conversation],
        isLoading: false
      }));
      return conversation;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      return null;
    }
  },

  setCurrentConversation: (conversation: Conversation | null) => {
    set({ currentConversation: conversation, messages: [] });
    if (conversation) {
      get().fetchMessages(conversation.id);
    }
  },

  fetchMessages: async (conversationId: number) => {
    set({ isLoading: true, error: null });
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${API_BASE}/${conversationId}/messages`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error('Failed to fetch messages');
      const messages = await response.json();
      set({ messages, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addMessage: (message: Message) => {
    set((state) => ({ messages: [...state.messages, message] }));
  },

  clearMessages: () => {
    set({ messages: [] });
  },

  clearError: () => {
    set({ error: null });
  },
}));
