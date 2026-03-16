import { z } from 'zod'
import { router, protectedProcedure, friendEmitter } from '../'
import {
  userProfiles,
  friendships,
  sharedInstances,
  instanceOverrides,
  instanceConflicts,
  conversations,
  conversationMembers,
} from '../../db/schema'
import { eq, and, or, ne, notInArray, ilike, inArray } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { generateConversationDek, wrapConversationDek } from '../../lib/crypto'
import { getOrCreateUserDek } from '../../lib/crypto'

export const friendRouter = router({
  search: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(50) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      // Get IDs of users with existing friendships (any status)
      const existingConnections = await ctx.db
        .select()
        .from(friendships)
        .where(or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId)))

      const excludeIds = new Set<string>([userId])
      for (const f of existingConnections) {
        excludeIds.add(f.requesterId)
        excludeIds.add(f.addresseeId)
      }

      const excludeArray = Array.from(excludeIds)

      const results = await ctx.db
        .select({
          userId: userProfiles.userId,
          username: userProfiles.username,
          friendCode: userProfiles.friendCode,
        })
        .from(userProfiles)
        .where(
          and(
            ilike(userProfiles.username, `%${input.query}%`),
            notInArray(userProfiles.userId, excludeArray),
          ),
        )
        .limit(20)

      return results
    }),

  sendRequest: protectedProcedure
    .input(z.object({ addresseeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      if (input.addresseeId === userId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot send a friend request to yourself' })
      }

      // Check for existing friendship in either direction
      const [existing] = await ctx.db
        .select()
        .from(friendships)
        .where(
          or(
            and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, input.addresseeId)),
            and(eq(friendships.requesterId, input.addresseeId), eq(friendships.addresseeId, userId)),
          ),
        )

      if (existing) {
        if (existing.status === 'blocked') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot send friend request' })
        }
        throw new TRPCError({ code: 'CONFLICT', message: 'A friendship already exists with this user' })
      }

      const [friendship] = await ctx.db
        .insert(friendships)
        .values({
          requesterId: userId,
          addresseeId: input.addresseeId,
          status: 'pending',
        })
        .returning()

      friendEmitter.emit(`friend:${input.addresseeId}`, { type: 'request_received' })

      return friendship
    }),

  acceptRequest: protectedProcedure
    .input(z.object({ friendshipId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      const [friendship] = await ctx.db
        .select()
        .from(friendships)
        .where(eq(friendships.id, input.friendshipId))

      if (!friendship) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Friend request not found' })
      }
      if (friendship.addresseeId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the addressee can accept a friend request' })
      }
      if (friendship.status !== 'pending') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This request is no longer pending' })
      }

      // Update friendship status
      const [updated] = await ctx.db
        .update(friendships)
        .set({ status: 'accepted', updatedAt: new Date() })
        .where(eq(friendships.id, input.friendshipId))
        .returning()

      // Create DM conversation with encrypted DEKs for both users
      const convDek = generateConversationDek()

      const requesterDek = await getOrCreateUserDek(ctx.db, friendship.requesterId)
      const addresseeDek = ctx.dek

      const wrappedForRequester = wrapConversationDek(convDek, requesterDek)
      const wrappedForAddressee = wrapConversationDek(convDek, addresseeDek)

      const [conversation] = await ctx.db
        .insert(conversations)
        .values({ type: 'dm' })
        .returning()

      await ctx.db.insert(conversationMembers).values([
        {
          conversationId: conversation.id,
          userId: friendship.requesterId,
          encryptedConversationDek: wrappedForRequester,
        },
        {
          conversationId: conversation.id,
          userId: friendship.addresseeId,
          encryptedConversationDek: wrappedForAddressee,
        },
      ])

      friendEmitter.emit(`friend:${friendship.requesterId}`, { type: 'request_accepted' })

      // Return in Friend shape for the frontend
      const [requesterProfile] = await ctx.db
        .select({ username: userProfiles.username, friendCode: userProfiles.friendCode })
        .from(userProfiles)
        .where(eq(userProfiles.userId, friendship.requesterId))

      return {
        friendshipId: updated.id,
        userId: friendship.requesterId,
        username: requesterProfile?.username ?? '',
        friendCode: requesterProfile?.friendCode ?? '',
      }
    }),

  rejectRequest: protectedProcedure
    .input(z.object({ friendshipId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      const [friendship] = await ctx.db
        .select()
        .from(friendships)
        .where(eq(friendships.id, input.friendshipId))

      if (!friendship) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Friend request not found' })
      }
      if (friendship.addresseeId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the addressee can reject a friend request' })
      }
      if (friendship.status !== 'pending') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This request is no longer pending' })
      }

      await ctx.db.delete(friendships).where(eq(friendships.id, input.friendshipId))

      return { success: true }
    }),

  remove: protectedProcedure
    .input(z.object({ friendshipId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      const [friendship] = await ctx.db
        .select()
        .from(friendships)
        .where(eq(friendships.id, input.friendshipId))

      if (!friendship) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Friendship not found' })
      }
      if (friendship.requesterId !== userId && friendship.addresseeId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not part of this friendship' })
      }

      const otherId =
        friendship.requesterId === userId ? friendship.addresseeId : friendship.requesterId

      // Clean up shared instances between the two users
      const shared = await ctx.db
        .select({ id: sharedInstances.id, instanceId: sharedInstances.instanceId, sharedWithId: sharedInstances.sharedWithId })
        .from(sharedInstances)
        .where(
          or(
            and(eq(sharedInstances.ownerId, userId), eq(sharedInstances.sharedWithId, otherId)),
            and(eq(sharedInstances.ownerId, otherId), eq(sharedInstances.sharedWithId, userId)),
          ),
        )

      for (const s of shared) {
        await ctx.db.delete(instanceConflicts).where(
          and(eq(instanceConflicts.instanceId, s.instanceId), eq(instanceConflicts.userId, s.sharedWithId)),
        )
        await ctx.db.delete(instanceOverrides).where(
          and(eq(instanceOverrides.instanceId, s.instanceId), eq(instanceOverrides.userId, s.sharedWithId)),
        )
      }
      if (shared.length > 0) {
        await ctx.db.delete(sharedInstances).where(inArray(sharedInstances.id, shared.map((s) => s.id)))
      }

      await ctx.db.delete(friendships).where(eq(friendships.id, input.friendshipId))

      friendEmitter.emit(`friend:${otherId}`, { type: 'friend_removed' })

      return { success: true }
    }),

  block: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const currentUserId = ctx.session.user.id

      if (input.userId === currentUserId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot block yourself' })
      }

      // Clean up shared instances between the two users
      const shared = await ctx.db
        .select({ id: sharedInstances.id, instanceId: sharedInstances.instanceId, sharedWithId: sharedInstances.sharedWithId })
        .from(sharedInstances)
        .where(
          or(
            and(eq(sharedInstances.ownerId, currentUserId), eq(sharedInstances.sharedWithId, input.userId)),
            and(eq(sharedInstances.ownerId, input.userId), eq(sharedInstances.sharedWithId, currentUserId)),
          ),
        )

      for (const s of shared) {
        await ctx.db.delete(instanceConflicts).where(
          and(eq(instanceConflicts.instanceId, s.instanceId), eq(instanceConflicts.userId, s.sharedWithId)),
        )
        await ctx.db.delete(instanceOverrides).where(
          and(eq(instanceOverrides.instanceId, s.instanceId), eq(instanceOverrides.userId, s.sharedWithId)),
        )
      }
      if (shared.length > 0) {
        await ctx.db.delete(sharedInstances).where(inArray(sharedInstances.id, shared.map((s) => s.id)))
      }

      // Check for existing friendship
      const [existing] = await ctx.db
        .select()
        .from(friendships)
        .where(
          or(
            and(eq(friendships.requesterId, currentUserId), eq(friendships.addresseeId, input.userId)),
            and(eq(friendships.requesterId, input.userId), eq(friendships.addresseeId, currentUserId)),
          ),
        )

      if (existing) {
        const [updated] = await ctx.db
          .update(friendships)
          .set({ status: 'blocked', blockedById: currentUserId, updatedAt: new Date() })
          .where(eq(friendships.id, existing.id))
          .returning()
        return updated
      }

      const [friendship] = await ctx.db
        .insert(friendships)
        .values({
          requesterId: currentUserId,
          addresseeId: input.userId,
          status: 'blocked',
          blockedById: currentUserId,
        })
        .returning()

      return friendship
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id

    const accepted = await ctx.db
      .select()
      .from(friendships)
      .where(
        and(
          eq(friendships.status, 'accepted'),
          or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId)),
        ),
      )

    if (accepted.length === 0) return []

    const friendIds = accepted.map((f) =>
      f.requesterId === userId ? f.addresseeId : f.requesterId,
    )

    const profiles = await ctx.db
      .select({
        userId: userProfiles.userId,
        username: userProfiles.username,
        friendCode: userProfiles.friendCode,
      })
      .from(userProfiles)
      .where(inArray(userProfiles.userId, friendIds))

    const profileMap = new Map(profiles.map((p) => [p.userId, p]))

    return accepted.map((f) => {
      const friendId = f.requesterId === userId ? f.addresseeId : f.requesterId
      const profile = profileMap.get(friendId)
      return {
        friendshipId: f.id,
        userId: friendId,
        username: profile?.username ?? '',
        friendCode: profile?.friendCode ?? '',
      }
    })
  }),

  onFriendEvent: protectedProcedure.subscription(async function* ({ ctx, signal }) {
    const userId = ctx.session.user.id
    const queue: any[] = []
    let resolve: (() => void) | null = null

    const onEvent = (data: any) => {
      queue.push(data)
      resolve?.()
    }

    friendEmitter.on(`friend:${userId}`, onEvent)

    const cleanup = () => {
      friendEmitter.off(`friend:${userId}`, onEvent)
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

  pendingRequests: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id

    const pending = await ctx.db
      .select()
      .from(friendships)
      .where(and(eq(friendships.addresseeId, userId), eq(friendships.status, 'pending')))

    if (pending.length === 0) return []

    const requesterIds = pending.map((f) => f.requesterId)

    const profiles = await ctx.db
      .select({
        userId: userProfiles.userId,
        username: userProfiles.username,
        friendCode: userProfiles.friendCode,
      })
      .from(userProfiles)
      .where(inArray(userProfiles.userId, requesterIds))

    const profileMap = new Map(profiles.map((p) => [p.userId, p]))

    return pending.map((f) => {
      const profile = profileMap.get(f.requesterId)
      return {
        friendshipId: f.id,
        requesterId: f.requesterId,
        username: profile?.username ?? '',
        friendCode: profile?.friendCode ?? '',
        createdAt: f.createdAt.toISOString(),
      }
    })
  }),
})
