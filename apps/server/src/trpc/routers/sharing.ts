import { z } from 'zod'
import { router, protectedProcedure } from '../'
import { TRPCError } from '@trpc/server'
import { eq, and, or, isNull } from 'drizzle-orm'
import {
  instances,
  sharedInstances,
  instanceOverrides,
  instanceConflicts,
  friendships,
  userProfiles,
  conversations,
  conversationMembers,
} from '../../db/schema'
import {
  encryptField,
  decryptField,
  getOrCreateUserDek,
  generateConversationDek,
  wrapConversationDek,
  unwrapConversationDek,
} from '../../lib/crypto'

const OVERRIDABLE_FIELDS = ['ramMb', 'jvmArgs', 'javaPath']

function isOverridableField(field: string): boolean {
  return OVERRIDABLE_FIELDS.includes(field) || field.startsWith('mod:')
}

export const sharingRouter = router({
  share: protectedProcedure
    .input(z.object({ instanceId: z.string().uuid(), friendId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      // Validate user owns the instance
      const [instance] = await ctx.db
        .select({ id: instances.id })
        .from(instances)
        .where(and(eq(instances.id, input.instanceId), eq(instances.userId, userId)))

      if (!instance) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Instance not found or not owned by you' })
      }

      // Validate accepted friendship exists
      const [friendship] = await ctx.db
        .select({ id: friendships.id })
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
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No accepted friendship with this user' })
      }

      // Check not already shared
      const [existing] = await ctx.db
        .select({ id: sharedInstances.id })
        .from(sharedInstances)
        .where(
          and(
            eq(sharedInstances.instanceId, input.instanceId),
            eq(sharedInstances.sharedWithId, input.friendId),
          ),
        )

      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Instance already shared with this user' })
      }

      // Create share
      await ctx.db.insert(sharedInstances).values({
        instanceId: input.instanceId,
        ownerId: userId,
        sharedWithId: input.friendId,
      })

      // Handle instance_group conversation
      const [existingConvo] = await ctx.db
        .select({ id: conversations.id })
        .from(conversations)
        .where(
          and(
            eq(conversations.type, 'instance_group'),
            eq(conversations.instanceId, input.instanceId),
          ),
        )

      if (existingConvo) {
        // Unwrap conversation DEK from owner's membership
        const [ownerMembership] = await ctx.db
          .select({ encryptedConversationDek: conversationMembers.encryptedConversationDek })
          .from(conversationMembers)
          .where(
            and(
              eq(conversationMembers.conversationId, existingConvo.id),
              eq(conversationMembers.userId, userId),
            ),
          )

        if (ownerMembership) {
          const convDek = unwrapConversationDek(ownerMembership.encryptedConversationDek, ctx.dek)
          const friendDek = await getOrCreateUserDek(ctx.db, input.friendId)
          const wrappedForFriend = wrapConversationDek(convDek, friendDek)

          await ctx.db.insert(conversationMembers).values({
            conversationId: existingConvo.id,
            userId: input.friendId,
            encryptedConversationDek: wrappedForFriend,
          })
        }
      } else {
        // Create new conversation
        const convDek = generateConversationDek()
        const wrappedForOwner = wrapConversationDek(convDek, ctx.dek)
        const friendDek = await getOrCreateUserDek(ctx.db, input.friendId)
        const wrappedForFriend = wrapConversationDek(convDek, friendDek)

        const [newConvo] = await ctx.db
          .insert(conversations)
          .values({
            type: 'instance_group',
            instanceId: input.instanceId,
          })
          .returning({ id: conversations.id })

        await ctx.db.insert(conversationMembers).values([
          {
            conversationId: newConvo.id,
            userId,
            encryptedConversationDek: wrappedForOwner,
          },
          {
            conversationId: newConvo.id,
            userId: input.friendId,
            encryptedConversationDek: wrappedForFriend,
          },
        ])
      }

      return { success: true }
    }),

  unshare: protectedProcedure
    .input(z.object({ instanceId: z.string().uuid(), friendId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      // Validate user owns the instance
      const [instance] = await ctx.db
        .select({ id: instances.id })
        .from(instances)
        .where(and(eq(instances.id, input.instanceId), eq(instances.userId, userId)))

      if (!instance) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Instance not found or not owned by you' })
      }

      // Delete share
      await ctx.db
        .delete(sharedInstances)
        .where(
          and(
            eq(sharedInstances.instanceId, input.instanceId),
            eq(sharedInstances.sharedWithId, input.friendId),
          ),
        )

      // Delete overrides for that friend on this instance
      await ctx.db
        .delete(instanceOverrides)
        .where(
          and(
            eq(instanceOverrides.instanceId, input.instanceId),
            eq(instanceOverrides.userId, input.friendId),
          ),
        )

      // Delete conflicts for that friend on this instance
      await ctx.db
        .delete(instanceConflicts)
        .where(
          and(
            eq(instanceConflicts.instanceId, input.instanceId),
            eq(instanceConflicts.userId, input.friendId),
          ),
        )

      // Remove friend from instance_group conversation
      const [convo] = await ctx.db
        .select({ id: conversations.id })
        .from(conversations)
        .where(
          and(
            eq(conversations.type, 'instance_group'),
            eq(conversations.instanceId, input.instanceId),
          ),
        )

      if (convo) {
        await ctx.db
          .delete(conversationMembers)
          .where(
            and(
              eq(conversationMembers.conversationId, convo.id),
              eq(conversationMembers.userId, input.friendId),
            ),
          )
      }

      return { success: true }
    }),

  listSharedWithMe: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id

    const rows = await ctx.db
      .select({
        id: sharedInstances.id,
        instanceId: sharedInstances.instanceId,
        ownerId: sharedInstances.ownerId,
        ownerUsername: userProfiles.username,
        ownerFriendCode: userProfiles.friendCode,
        instanceName: instances.name,
        minecraftVersion: instances.minecraftVersion,
        modLoader: instances.modLoader,
        createdAt: sharedInstances.createdAt,
      })
      .from(sharedInstances)
      .innerJoin(instances, eq(instances.id, sharedInstances.instanceId))
      .innerJoin(userProfiles, eq(userProfiles.userId, sharedInstances.ownerId))
      .where(eq(sharedInstances.sharedWithId, userId))

    return rows
  }),

  listSharedByMe: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id

    const rows = await ctx.db
      .select({
        shareId: sharedInstances.id,
        instanceId: sharedInstances.instanceId,
        instanceName: instances.name,
        sharedWithId: sharedInstances.sharedWithId,
        username: userProfiles.username,
        friendCode: userProfiles.friendCode,
      })
      .from(sharedInstances)
      .innerJoin(instances, eq(instances.id, sharedInstances.instanceId))
      .innerJoin(userProfiles, eq(userProfiles.userId, sharedInstances.sharedWithId))
      .where(eq(sharedInstances.ownerId, userId))

    // Group by instanceId
    const grouped = new Map<
      string,
      {
        instanceId: string
        instanceName: string
        sharedWith: { shareId: string; userId: string; username: string; friendCode: string }[]
      }
    >()

    for (const row of rows) {
      let entry = grouped.get(row.instanceId)
      if (!entry) {
        entry = {
          instanceId: row.instanceId,
          instanceName: row.instanceName,
          sharedWith: [],
        }
        grouped.set(row.instanceId, entry)
      }
      entry.sharedWith.push({
        shareId: row.shareId,
        userId: row.sharedWithId,
        username: row.username,
        friendCode: row.friendCode,
      })
    }

    return Array.from(grouped.values())
  }),

  pullShared: protectedProcedure
    .input(z.object({ instanceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      // Validate instance is shared with current user
      const [share] = await ctx.db
        .select({ ownerId: sharedInstances.ownerId })
        .from(sharedInstances)
        .where(
          and(
            eq(sharedInstances.instanceId, input.instanceId),
            eq(sharedInstances.sharedWithId, userId),
          ),
        )

      if (!share) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Instance not shared with you' })
      }

      // Get owner's instance data
      const [instance] = await ctx.db
        .select()
        .from(instances)
        .where(eq(instances.id, input.instanceId))

      if (!instance) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Instance not found' })
      }

      // Decrypt using owner's DEK
      const ownerDek = await getOrCreateUserDek(ctx.db, share.ownerId)

      const decryptedInstance = {
        id: instance.id,
        name: instance.name,
        minecraftVersion: instance.minecraftVersion,
        modLoader: instance.modLoader,
        modLoaderVersion: instance.modLoaderVersion,
        effectiveVersionId: instance.effectiveVersionId,
        mods: instance.mods ? decryptField(instance.mods, ownerDek) : null,
        resourcePacks: instance.resourcePacks ? decryptField(instance.resourcePacks, ownerDek) : null,
        jvmArgs: instance.jvmArgs,
        javaPath: instance.javaPath,
        ramMb: instance.ramMb,
        iconUrl: instance.iconUrl,
        modpackProjectId: instance.modpackProjectId,
        modpackVersionId: instance.modpackVersionId,
        updatedAt: instance.updatedAt,
      }

      // Get user's overrides, decrypt with user's DEK
      const overrideRows = await ctx.db
        .select()
        .from(instanceOverrides)
        .where(
          and(
            eq(instanceOverrides.instanceId, input.instanceId),
            eq(instanceOverrides.userId, userId),
          ),
        )

      const overrides = overrideRows.map((row) => ({
        id: row.id,
        field: row.field,
        value: decryptField(row.value, ctx.dek),
        updatedAt: row.updatedAt,
      }))

      // Get unresolved conflicts
      const conflictRows = await ctx.db
        .select()
        .from(instanceConflicts)
        .where(
          and(
            eq(instanceConflicts.instanceId, input.instanceId),
            eq(instanceConflicts.userId, userId),
            isNull(instanceConflicts.resolvedAt),
          ),
        )

      const conflicts = conflictRows.map((row) => ({
        id: row.id,
        field: row.field,
        ownerValue: decryptField(row.ownerValue, ownerDek),
        localValue: decryptField(row.localValue, ctx.dek),
        createdAt: row.createdAt,
      }))

      return { instance: decryptedInstance, overrides, conflicts }
    }),

  setOverride: protectedProcedure
    .input(z.object({ instanceId: z.string().uuid(), field: z.string(), value: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      // Validate instance is shared with user
      const [share] = await ctx.db
        .select({ id: sharedInstances.id })
        .from(sharedInstances)
        .where(
          and(
            eq(sharedInstances.instanceId, input.instanceId),
            eq(sharedInstances.sharedWithId, userId),
          ),
        )

      if (!share) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Instance not shared with you' })
      }

      // Validate field is overridable
      if (!isOverridableField(input.field)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Field is not overridable' })
      }

      const encryptedValue = encryptField(input.value, ctx.dek)

      // Upsert override
      await ctx.db
        .insert(instanceOverrides)
        .values({
          instanceId: input.instanceId,
          userId,
          field: input.field,
          value: encryptedValue,
        })
        .onConflictDoUpdate({
          target: [instanceOverrides.instanceId, instanceOverrides.userId, instanceOverrides.field],
          set: { value: encryptedValue },
        })

      return { success: true }
    }),

  removeOverride: protectedProcedure
    .input(z.object({ instanceId: z.string().uuid(), field: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      await ctx.db
        .delete(instanceOverrides)
        .where(
          and(
            eq(instanceOverrides.instanceId, input.instanceId),
            eq(instanceOverrides.userId, userId),
            eq(instanceOverrides.field, input.field),
          ),
        )

      return { success: true }
    }),

  getOverrides: protectedProcedure
    .input(z.object({ instanceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      const rows = await ctx.db
        .select()
        .from(instanceOverrides)
        .where(
          and(
            eq(instanceOverrides.instanceId, input.instanceId),
            eq(instanceOverrides.userId, userId),
          ),
        )

      return rows.map((row) => ({
        id: row.id,
        field: row.field,
        value: decryptField(row.value, ctx.dek),
        updatedAt: row.updatedAt,
      }))
    }),

  resolveConflict: protectedProcedure
    .input(
      z.object({
        conflictId: z.string().uuid(),
        resolution: z.enum(['keep_mine', 'use_owner']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      // Get the conflict
      const [conflict] = await ctx.db
        .select()
        .from(instanceConflicts)
        .where(
          and(
            eq(instanceConflicts.id, input.conflictId),
            eq(instanceConflicts.userId, userId),
            isNull(instanceConflicts.resolvedAt),
          ),
        )

      if (!conflict) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Conflict not found or already resolved' })
      }

      // Mark conflict as resolved
      await ctx.db
        .update(instanceConflicts)
        .set({ resolvedAt: new Date() })
        .where(eq(instanceConflicts.id, input.conflictId))

      if (input.resolution === 'use_owner') {
        // Delete the override for that field
        await ctx.db
          .delete(instanceOverrides)
          .where(
            and(
              eq(instanceOverrides.instanceId, conflict.instanceId),
              eq(instanceOverrides.userId, userId),
              eq(instanceOverrides.field, conflict.field),
            ),
          )
      }

      return { success: true }
    }),

  listConflicts: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id

    const rows = await ctx.db
      .select({
        id: instanceConflicts.id,
        instanceId: instanceConflicts.instanceId,
        instanceName: instances.name,
        field: instanceConflicts.field,
        ownerValue: instanceConflicts.ownerValue,
        localValue: instanceConflicts.localValue,
        createdAt: instanceConflicts.createdAt,
        ownerId: sharedInstances.ownerId,
      })
      .from(instanceConflicts)
      .innerJoin(instances, eq(instances.id, instanceConflicts.instanceId))
      .innerJoin(
        sharedInstances,
        and(
          eq(sharedInstances.instanceId, instanceConflicts.instanceId),
          eq(sharedInstances.sharedWithId, userId),
        ),
      )
      .where(
        and(
          eq(instanceConflicts.userId, userId),
          isNull(instanceConflicts.resolvedAt),
        ),
      )

    // Collect unique owner IDs and fetch their DEKs
    const ownerIds = [...new Set(rows.map((r) => r.ownerId))]
    const ownerDeks = new Map<string, Buffer>()
    await Promise.all(
      ownerIds.map(async (ownerId) => {
        const dek = await getOrCreateUserDek(ctx.db, ownerId)
        ownerDeks.set(ownerId, dek)
      }),
    )

    return rows.map((row) => ({
      id: row.id,
      instanceId: row.instanceId,
      instanceName: row.instanceName,
      field: row.field,
      ownerValue: decryptField(row.ownerValue, ownerDeks.get(row.ownerId)!),
      localValue: decryptField(row.localValue, ctx.dek),
      createdAt: row.createdAt.toISOString(),
    }))
  }),
})
