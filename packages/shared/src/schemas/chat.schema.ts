import { z } from 'zod'

export const ConversationTypeSchema = z.enum(['dm', 'instance_group'])
export type ConversationType = z.infer<typeof ConversationTypeSchema>

export const ConversationSchema = z.object({
  id: z.string().uuid(),
  type: ConversationTypeSchema,
  instanceId: z.string().uuid().nullable(),
  name: z.string().optional(),
  lastMessage: z.object({
    content: z.string(),
    senderUsername: z.string().optional(),
    createdAt: z.string().datetime(),
  }).optional(),
  unreadCount: z.number().int().min(0),
  members: z.array(z.object({
    userId: z.string(),
    username: z.string(),
  })),
})
export type Conversation = z.infer<typeof ConversationSchema>

export const MessageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  senderId: z.string().nullable(),
  senderUsername: z.string().optional(),
  content: z.string(),
  createdAt: z.string().datetime(),
})
export type Message = z.infer<typeof MessageSchema>

export const SendMessageInputSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(2000),
})
export type SendMessageInput = z.infer<typeof SendMessageInputSchema>

export const GetMessagesInputSchema = z.object({
  conversationId: z.string().uuid(),
  cursor: z.object({
    createdAt: z.string().datetime(),
    id: z.string().uuid(),
  }).optional(),
  limit: z.number().int().min(1).max(100).default(50),
})

export const StartDmInputSchema = z.object({
  friendId: z.string(),
})

export const MarkReadInputSchema = z.object({
  conversationId: z.string().uuid(),
  messageId: z.string().uuid(),
})

export const NewMessageEventSchema = z.object({
  message: MessageSchema,
  conversationId: z.string().uuid(),
})
export type NewMessageEvent = z.infer<typeof NewMessageEventSchema>
