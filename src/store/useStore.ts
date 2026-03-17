import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const generateId = () => {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export type Role = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface Model {
  id: string;
  name: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
}

interface AppState {
  apiKey: string;
  setApiKey: (key: string) => void;
  
  models: Model[];
  setModels: (models: Model[]) => void;
  selectedModel: string;
  setSelectedModel: (modelId: string) => void;
  recentModels: string[];
  addRecentModel: (modelId: string) => void;

  conversations: Conversation[];
  currentConversationId: string | null;
  
  createConversation: () => void;
  setCurrentConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  clearMessages: (conversationId: string) => void;
  
  addMessage: (conversationId: string, message: Omit<Message, 'id' | 'createdAt'>) => void;
  updateMessage: (conversationId: string, messageId: string, content: string) => void;
  
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;

  isSettingsOpen: boolean;
  setSettingsOpen: (isOpen: boolean) => void;

  isPreviewOpen: boolean;
  setPreviewOpen: (isOpen: boolean) => void;

  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;

  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  
  useStreaming: boolean;
  setUseStreaming: (useStreaming: boolean) => void;

  apiMode: 'cloud' | 'local';
  setApiMode: (mode: 'cloud' | 'local') => void;
  localEndpoint: string;
  setLocalEndpoint: (endpoint: string) => void;
  
  temperature: number;
  setTemperature: (temp: number) => void;
  topP: number;
  setTopP: (topP: number) => void;
  maxTokens: number | undefined;
  setMaxTokens: (tokens: number | undefined) => void;

  isDarkMode: boolean;
  setIsDarkMode: (isDark: boolean) => void;

  isOffline: boolean;
  setIsOffline: (isOffline: boolean) => void;
  ollamaStatus: 'online' | 'offline' | 'checking';
  setOllamaStatus: (status: 'online' | 'offline' | 'checking') => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      apiKey: '',
      setApiKey: (apiKey) => set({ apiKey }),

      models: [
        {
          id: 'openrouter/auto',
          name: 'Auto (Best available)',
          context_length: 8192,
          pricing: { prompt: '0', completion: '0' }
        }
      ],
      setModels: (models) => set({ models }),
      selectedModel: 'openrouter/auto',
      setSelectedModel: (selectedModel) => set((state) => {
        const newRecent = state.recentModels ? [selectedModel, ...state.recentModels.filter(m => m !== selectedModel)].slice(0, 5) : [selectedModel];
        return { selectedModel, recentModels: newRecent };
      }),
      recentModels: ['openrouter/auto'],
      addRecentModel: (modelId) => set((state) => {
        const newRecent = state.recentModels ? [modelId, ...state.recentModels.filter(m => m !== modelId)].slice(0, 5) : [modelId];
        return { recentModels: newRecent };
      }),

      conversations: [],
      currentConversationId: null,

      createConversation: () => {
        const newConversation: Conversation = {
          id: generateId(),
          title: 'New Chat',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          currentConversationId: newConversation.id,
          isSidebarOpen: false,
        }));
      },

      setCurrentConversation: (id) => set({ currentConversationId: id, isSidebarOpen: false }),

      deleteConversation: (id) => {
        set((state) => {
          const newConversations = state.conversations.filter((c) => c.id !== id);
          return {
            conversations: newConversations,
            currentConversationId:
              state.currentConversationId === id
                ? newConversations.length > 0
                  ? newConversations[0].id
                  : null
                : state.currentConversationId,
          };
        });
      },

      addMessage: (conversationId, message) => {
        const newMessage: Message = {
          ...message,
          id: generateId(),
          createdAt: Date.now(),
        };

        set((state) => {
          const conversations = state.conversations.map((conv) => {
            if (conv.id === conversationId) {
              // Update title if it's the first user message
              let title = conv.title;
              if (conv.messages.length === 0 && message.role === 'user') {
                title = message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '');
              }
              return {
                ...conv,
                title,
                messages: [...conv.messages, newMessage],
                updatedAt: Date.now(),
              };
            }
            return conv;
          });
          return { conversations };
        });
      },

      updateMessage: (conversationId, messageId, content) => {
        set((state) => ({
          conversations: state.conversations.map((conv) => {
            if (conv.id === conversationId) {
              return {
                ...conv,
                messages: conv.messages.map((msg) =>
                  msg.id === messageId ? { ...msg, content } : msg
                ),
                updatedAt: Date.now(),
              };
            }
            return conv;
          }),
        }));
      },

      isSidebarOpen: false,
      setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),

      isSettingsOpen: false,
      setSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
      
      isPreviewOpen: false,
      setPreviewOpen: (isPreviewOpen) => set({ isPreviewOpen }),

      systemPrompt: 'You are a helpful AI assistant.',
      setSystemPrompt: (systemPrompt) => set({ systemPrompt }),

      isLoading: false,
      setIsLoading: (isLoading) => set({ isLoading }),

      useStreaming: false,
      setUseStreaming: (useStreaming) => set({ useStreaming }),

      clearMessages: (conversationId) => {
        set((state) => ({
          conversations: state.conversations.map((conv) => {
            if (conv.id === conversationId) {
              return { ...conv, messages: [], updatedAt: Date.now() };
            }
            return conv;
          }),
        }));
      },

      apiMode: 'cloud',
      setApiMode: (apiMode) => set({ apiMode }),
      
      localEndpoint: 'http://127.0.0.1:11434',
      setLocalEndpoint: (localEndpoint) => set({ localEndpoint }),

      temperature: 1,
      setTemperature: (temperature) => set({ temperature }),

      topP: 1,
      setTopP: (topP) => set({ topP }),

      maxTokens: undefined,
      setMaxTokens: (maxTokens) => set({ maxTokens }),

      isDarkMode: true,
      setIsDarkMode: (isDarkMode) => set({ isDarkMode }),

      isOffline: !navigator.onLine,
      setIsOffline: (isOffline) => set({ isOffline }),
      
      ollamaStatus: 'checking',
      setOllamaStatus: (ollamaStatus) => set({ ollamaStatus }),
    }),
    {
      name: 'openrouter-chat-storage',
      partialize: (state) => ({
        apiKey: state.apiKey,
        selectedModel: state.selectedModel,
        recentModels: state.recentModels,
        conversations: state.conversations,
        currentConversationId: state.currentConversationId,
        systemPrompt: state.systemPrompt,
        useStreaming: state.useStreaming,
        apiMode: state.apiMode,
        localEndpoint: state.localEndpoint,
        temperature: state.temperature,
        topP: state.topP,
        maxTokens: state.maxTokens,
        isDarkMode: state.isDarkMode,
      }),
    }
  )
);