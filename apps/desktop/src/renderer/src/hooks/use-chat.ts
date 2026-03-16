import { useEffect, useCallback } from 'react'
import { trpc } from '@/lib/trpc'
import { useChatStore } from '@/store/chat.store'

export function useChat(conversationId: string | null) {
  const {
    messages,
    addMessage,
    setMessages,
    updateConversationLastMessage,
    decrementUnread,
  } = useChatStore()

  const conversationMessages = conversationId ? messages[conversationId] ?? [] : []

  const messagesQuery = trpc.chat.getMessages.useQuery(
    { conversationId: conversationId! },
    { enabled: !!conversationId },
  )

  const sendMutation = trpc.chat.sendMessage.useMutation()
  const markReadMutation = trpc.chat.markRead.useMutation()

  // Sync fetched messages into store
  useEffect(() => {
    if (messagesQuery.data && conversationId) {
      setMessages(conversationId, messagesQuery.data)
    }
  }, [messagesQuery.data, conversationId, setMessages])

  // Subscribe to new messages
  trpc.chat.onNewMessage.useSubscription(undefined, {
    onData: (event) => {
      const data = event as any
      if (data?.message && data?.conversationId) {
        addMessage(data.conversationId, data.message)
        updateConversationLastMessage(data.conversationId, data.message)
      }
    },
  })

  // Mark as read when viewing
  useEffect(() => {
    if (!conversationId || conversationMessages.length === 0) return
    const lastMessage = conversationMessages[conversationMessages.length - 1]
    if (lastMessage) {
      markReadMutation.mutate({
        conversationId,
        messageId: lastMessage.id,
      })
      decrementUnread(conversationId)
    }
  }, [conversationId, conversationMessages.length])

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId) return
      const message = await sendMutation.mutateAsync({
        conversationId,
        content,
      })
      addMessage(conversationId, message)
      updateConversationLastMessage(conversationId, message)
    },
    [conversationId, sendMutation, addMessage, updateConversationLastMessage],
  )

  return {
    messages: conversationMessages,
    sendMessage,
    isLoading: messagesQuery.isLoading,
    isSending: sendMutation.isPending,
  }
}
