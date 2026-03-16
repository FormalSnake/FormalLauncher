import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/lib/trpc'
import { useChatStore } from '@/store/chat.store'
import { useChat } from '@/hooks/use-chat'
import { cn } from '@/lib/utils'
import { authClient } from '@/lib/auth-client'
import { IconPaperPlane2 } from 'nucleo-pixel'

export function ChatPage() {
  const { conversationId } = useParams()
  const navigate = useNavigate()
  const { data: session } = authClient.useSession()
  const {
    conversations,
    setConversations,
    activeConversationId,
    setActiveConversationId,
  } = useChatStore()

  const [messageInput, setMessageInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const conversationsQuery = trpc.chat.listConversations.useQuery()

  useEffect(() => {
    if (conversationsQuery.data) setConversations(conversationsQuery.data as any)
  }, [conversationsQuery.data, setConversations])

  const activeId = conversationId ?? activeConversationId
  const { messages, sendMessage, isSending } = useChat(activeId ?? null)

  useEffect(() => {
    if (conversationId) {
      setActiveConversationId(conversationId)
    }
  }, [conversationId, setActiveConversationId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = async () => {
    if (!messageInput.trim()) return
    const content = messageInput.trim()
    setMessageInput('')
    await sendMessage(content)
  }

  const displayConversations = (conversationsQuery.data as typeof conversations | undefined) ?? conversations

  const getConversationName = (conv: typeof displayConversations[0]) => {
    if (conv.type === 'instance_group') {
      return conv.name ?? 'Group Chat'
    }
    const otherMember = conv.members.find((m) => m.userId !== session?.user.id)
    return otherMember?.username ?? 'Direct Message'
  }

  return (
    <div className="flex h-[calc(100svh-8rem)] gap-4">
      {/* Conversation list */}
      <div className="w-64 shrink-0 overflow-hidden rounded-lg border">
        <div className="border-b p-3">
          <h2 className="font-semibold">Messages</h2>
        </div>
        <ScrollArea className="h-[calc(100%-3rem)]">
          <div className="p-1">
            {displayConversations.map((conv) => (
              <button
                key={conv.id}
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
                  activeId === conv.id && 'bg-accent',
                )}
                onClick={() => navigate(`/chat/${conv.id}`)}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{getConversationName(conv)}</div>
                  {conv.lastMessage && (
                    <div className="truncate text-xs text-muted-foreground">
                      {conv.lastMessage.content}
                    </div>
                  )}
                </div>
                {conv.unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2 shrink-0">
                    {conv.unreadCount}
                  </Badge>
                )}
              </button>
            ))}
            {displayConversations.length === 0 && (
              <p className="px-3 py-8 text-center text-xs text-muted-foreground">
                No conversations yet
              </p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Message area */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border">
        {activeId ? (
          <>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {messages.map((msg) => {
                  const isOwn = msg.senderId === session?.user.id
                  return (
                    <div
                      key={msg.id}
                      className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[70%] rounded-lg px-3 py-2 text-sm',
                          isOwn
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted',
                        )}
                      >
                        {!isOwn && msg.senderUsername && (
                          <div className="mb-1 text-xs font-medium opacity-70">
                            {msg.senderUsername}
                          </div>
                        )}
                        <p className="break-words">{msg.content}</p>
                        <div
                          className={cn(
                            'mt-1 text-xs opacity-50',
                            isOwn ? 'text-right' : 'text-left',
                          )}
                        >
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            <div className="border-t p-3">
              <div className="flex gap-2">
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type a message..."
                  maxLength={2000}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                />
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!messageInput.trim() || isSending}
                >
                  <IconPaperPlane2 className="size-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Select a conversation to start chatting
          </div>
        )}
      </div>
    </div>
  )
}
