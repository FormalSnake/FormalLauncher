import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { eq, and, or, desc, lt, sql, inArray, count } from 'drizzle-orm'
import { router, protectedProcedure, messageEmitter } from '../'
import {
  conversations,
  conversationMembers,
  messages,
  conversationReadCursors,
  userProfiles,
  friendships,
} from '../../db/schema'
import {
  encryptField,
  decryptField,
  unwrapConversationDek,
  generateConversationDek,
  wrapConversationDek,
  getOrCreateUserDek,
} from '../../lib/crypto'

async function getMembershipAndDek(
  db: any,
  conversationId: string,
  userId: string,
  userDek: Buffer,
) {
  const [membership] = await db
    .select()
    .from(conversationMembers)
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        eq(conversationMembers.userId, userId),
      ),
    )

  if (!membership) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not a member of this conversation' })
  }

  const convDek = unwrapConversationDek(membership.encryptedConversationDek, userDek)
  return { membership, convDek }
}

export const chatRouter = router({
  listConversations: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id

    // Get all conversations where user is a member
    const userMemberships = await ctx.db
      .select()
      .from(conversationMembers)
      .where(eq(conversationMembers.userId, userId))

    if (userMemberships.length === 0) return []

    const conversationIds = userMemberships.map((m) => m.conversationId)
    const membershipMap = new Map(userMemberships.map((m) => [m.conversationId, m]))

    // Get conversations
    const convos = await ctx.db
      .select()
      .from(conversations)
      .where(inArray(conversations.id, conversationIds))

    // Get all members for these conversations with profiles
    const allMembers = await ctx.db
      .select({
        conversationId: conversationMembers.conversationId,
        userId: conversationMembers.userId,
        username: userProfiles.username,
      })
      .from(conversationMembers)
      .leftJoin(userProfiles, eq(conversationMembers.userId, userProfiles.userId))
      .where(inArray(conversationMembers.conversationId, conversationIds))

    // Get last message for each conversation
    const lastMessages = await ctx.db
      .select()
      .from(messages)
      .where(inArray(messages.conversationId, conversationIds))
      .orderBy(desc(messages.createdAt))

    // Group last messages by conversation (take first per conversation)
    const lastMessageMap = new Map<string, typeof lastMessages[0]>()
    for (const msg of lastMessages) {
      if (!lastMessageMap.has(msg.conversationId)) {
        lastMessageMap.set(msg.conversationId, msg)
      }
    }

    // Get read cursors
    const readCursors = await ctx.db
      .select()
      .from(conversationReadCursors)
      .where(
        and(
          eq(conversationReadCursors.userId, userId),
          inArray(conversationReadCursors.conversationId, conversationIds),
        ),
      )

    const cursorMap = new Map(readCursors.map((c) => [c.conversationId, c]))

    // Build result
    const result = await Promise.all(
      convos.map(async (convo) => {
        const membership = membershipMap.get(convo.id)!
        const convDek = unwrapConversationDek(membership.encryptedConversationDek, ctx.dek)
        const lastMsg = lastMessageMap.get(convo.id)
        const cursor = cursorMap.get(convo.id)

        // Decrypt last message
        let lastMessage: {
          content: string
          senderUsername?: string
          createdAt: string
        } | undefined = undefined

        if (lastMsg) {
          const senderProfile = allMembers.find((m) => m.userId === lastMsg.senderId && m.conversationId === convo.id)
          lastMessage = {
            content: decryptField(lastMsg.content, convDek),
            senderUsername: senderProfile?.username ?? undefined,
            createdAt: lastMsg.createdAt.toISOString(),
          }
        }

        // Calculate unread count
        let unreadCount = 0
        if (cursor?.lastReadMessageId) {
          // Get the createdAt of the last read message
          const [lastReadMsg] = await ctx.db
            .select({ createdAt: messages.createdAt })
            .from(messages)
            .where(eq(messages.id, cursor.lastReadMessageId))

          if (lastReadMsg) {
            const [unreadResult] = await ctx.db
              .select({ count: count() })
              .from(messages)
              .where(
                and(
                  eq(messages.conversationId, convo.id),
                  sql`${messages.createdAt} > ${lastReadMsg.createdAt}`,
                ),
              )
            unreadCount = unreadResult.count
          }
        } else {
          // No cursor = all messages are unread
          const [unreadResult] = await ctx.db
            .select({ count: count() })
            .from(messages)
            .where(eq(messages.conversationId, convo.id))
          unreadCount = unreadResult.count
        }

        // Members with usernames
        const members = allMembers
          .filter((m) => m.conversationId === convo.id)
          .map((m) => ({
            userId: m.userId,
            username: m.username ?? '',
          }))

        return {
          id: convo.id,
          type: convo.type,
          instanceId: convo.instanceId,
          createdAt: convo.createdAt,
          updatedAt: convo.updatedAt,
          lastMessage,
          unreadCount,
          members,
        }
      }),
    )

    // Sort by last message time desc (conversations with no messages go last)
    result.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0
      const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0
      return bTime - aTime
    })

    return result
  }),

  getMessages: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        cursor: z
          .object({
            createdAt: z.coerce.date(),
            id: z.string().uuid(),
          })
          .optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const { convDek } = await getMembershipAndDek(ctx.db, input.conversationId, userId, ctx.dek)

      // Build query conditions
      const conditions = [eq(messages.conversationId, input.conversationId)]

      if (input.cursor) {
        conditions.push(
          sql`(${messages.createdAt}, ${messages.id}) < (${input.cursor.createdAt}, ${input.cursor.id})`,
        )
      }

      const rows = await ctx.db
        .select({
          id: messages.id,
          conversationId: messages.conversationId,
          senderId: messages.senderId,
          content: messages.content,
          createdAt: messages.createdAt,
          senderUsername: userProfiles.username,
        })
        .from(messages)
        .leftJoin(userProfiles, eq(messages.senderId, userProfiles.userId))
        .where(and(...conditions))
        .orderBy(desc(messages.createdAt), desc(messages.id))
        .limit(input.limit)

      return rows.reverse().map((row) => ({
        id: row.id,
        conversationId: row.conversationId,
        senderId: row.senderId,
        senderUsername: row.senderUsername ?? '',
        content: decryptField(row.content, convDek),
        createdAt: row.createdAt.toISOString(),
      }))
    }),

  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        content: z.string().min(1).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id
      const { convDek } = await getMembershipAndDek(ctx.db, input.conversationId, userId, ctx.dek)

      // Encrypt and insert
      const encrypted = encryptField(input.content, convDek)
      const [message] = await ctx.db
        .insert(messages)
        .values({
          conversationId: input.conversationId,
          senderId: userId,
          content: encrypted,
        })
        .returning()

      // Get sender profile
      const [senderProfile] = await ctx.db
        .select({ username: userProfiles.username })
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))

      const decryptedMessage = {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        senderUsername: senderProfile?.username ?? '',
        content: input.content,
        createdAt: message.createdAt.toISOString(),
      }

      // Emit to all members except sender
      const members = await ctx.db
        .select({ userId: conversationMembers.userId })
        .from(conversationMembers)
        .where(eq(conversationMembers.conversationId, input.conversationId))

      for (const member of members) {
        if (member.userId !== userId) {
          messageEmitter.emit(`message:${member.userId}`, {
            message: decryptedMessage,
            conversationId: input.conversationId,
          })
        }
      }

      return decryptedMessage
    }),

  startDm: protectedProcedure
    .input(z.object({ friendId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      if (input.friendId === userId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot start a DM with yourself' })
      }

      // Validate accepted friendship exists
      const [friendship] = await ctx.db
        .select()
        .from(friendships)
        .where(
          and(
            eq(friendships.status, 'accepted'),
            or(
              and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, input.friendId)),
              and(eq(friendships.requesterId, input.friendId), eq(friendships.addresseeId, userId)),
            ),
          ),
        )

      if (!friendship) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You must be friends to start a DM' })
      }

      // Check if DM already exists between the two users
      const userConvos = await ctx.db
        .select({ conversationId: conversationMembers.conversationId })
        .from(conversationMembers)
        .where(eq(conversationMembers.userId, userId))

      if (userConvos.length > 0) {
        const userConvoIds = userConvos.map((c) => c.conversationId)

        // Find DM conversations that the friend is also a member of
        const sharedDms = await ctx.db
          .select({ conversationId: conversationMembers.conversationId })
          .from(conversationMembers)
          .innerJoin(conversations, eq(conversationMembers.conversationId, conversations.id))
          .where(
            and(
              eq(conversationMembers.userId, input.friendId),
              eq(conversations.type, 'dm'),
              inArray(conversationMembers.conversationId, userConvoIds),
            ),
          )

        if (sharedDms.length > 0) {
          // Return existing DM conversation
          const [existing] = await ctx.db
            .select()
            .from(conversations)
            .where(eq(conversations.id, sharedDms[0].conversationId))

          return existing
        }
      }

      // Create new DM conversation
      const convDek = generateConversationDek()

      const friendDek = await getOrCreateUserDek(ctx.db, input.friendId)
      const wrappedForUser = wrapConversationDek(convDek, ctx.dek)
      const wrappedForFriend = wrapConversationDek(convDek, friendDek)

      const [conversation] = await ctx.db
        .insert(conversations)
        .values({ type: 'dm' })
        .returning()

      await ctx.db.insert(conversationMembers).values([
        {
          conversationId: conversation.id,
          userId,
          encryptedConversationDek: wrappedForUser,
        },
        {
          conversationId: conversation.id,
          userId: input.friendId,
          encryptedConversationDek: wrappedForFriend,
        },
      ])

      return conversation
    }),

  onNewMessage: protectedProcedure.subscription(async function* ({ ctx, signal }) {
    const userId = ctx.session.user.id
    const queue: any[] = []
    let resolve: (() => void) | null = null

    const onMessage = (data: any) => {
      queue.push(data)
      resolve?.()
    }

    messageEmitter.on(`message:${userId}`, onMessage)

    const cleanup = () => {
      messageEmitter.off(`message:${userId}`, onMessage)
    }

    signal?.addEventListener('abort', cleanup)

    try {
      while (true) {
        if (queue.length === 0) {
          await new Promise<void>((r) => { resolve = r })
        }
        while (queue.length > 0) {
          yield queue.shift()
        }
      }
    } finally {
      cleanup()
    }
  }),

  markRead: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        messageId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      // Validate membership
      await getMembershipAndDek(ctx.db, input.conversationId, userId, ctx.dek)

      // Upsert read cursor
      await ctx.db
        .insert(conversationReadCursors)
        .values({
          conversationId: input.conversationId,
          userId,
          lastReadMessageId: input.messageId,
        })
        .onConflictDoUpdate({
          target: [conversationReadCursors.conversationId, conversationReadCursors.userId],
          set: {
            lastReadMessageId: input.messageId,
            updatedAt: new Date(),
          },
        })

      return { success: true }
    }),
})
