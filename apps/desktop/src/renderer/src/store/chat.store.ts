import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Message } from '@formallauncher/shared'

interface Conversation {
  id: string
  type: string
  instanceId: string | null
  name?: string
  lastMessage?: {
    content: string
    senderUsername?: string
    createdAt: string
  }
  unreadCount: number
  members: { userId: string; username: string }[]
}

export type { Conversation }

interface ChatState {
  conversations: Conversation[]
  activeConversationId: string | null
  messages: Record<string, Message[]>
  setConversations: (conversations: Conversation[]) => void
  setActiveConversationId: (id: string | null) => void
  setMessages: (conversationId: string, messages: Message[]) => void
  addMessage: (conversationId: string, message: Message) => void
  updateConversationLastMessage: (conversationId: string, message: Message) => void
  decrementUnread: (conversationId: string) => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      conversations: [],
      activeConversationId: null,
      messages: {},

      setConversations: (conversations) => set({ conversations }),

      setActiveConversationId: (id) => set({ activeConversationId: id }),

      setMessages: (conversationId, messages) =>
        set((state) => ({
          messages: { ...state.messages, [conversationId]: messages },
        })),

      addMessage: (conversationId, message) =>
        set((state) => {
          const existing = state.messages[conversationId] ?? []
          if (existing.some((m) => m.id === message.id)) return state
          return {
            messages: {
              ...state.messages,
              [conversationId]: [...existing, message],
            },
          }
        }),

      updateConversationLastMessage: (conversationId, message) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  lastMessage: {
                    content: message.content,
                    senderUsername: message.senderUsername,
                    createdAt: message.createdAt,
                  },
                  unreadCount: c.id === state.activeConversationId
                    ? c.unreadCount
                    : c.unreadCount + 1,
                }
              : c,
          ),
        })),

      decrementUnread: (conversationId) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId ? { ...c, unreadCount: 0 } : c,
          ),
        })),
    }),
    {
      name: 'formallauncher-chat',
      partialize: (state) => ({
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
      }),
    },
  ),
)
