import { z } from 'zod'

export const OVERRIDABLE_FIELDS = ['ramMb', 'jvmArgs', 'javaPath'] as const

export const OverrideFieldSchema = z.string().refine(
  (f) => (OVERRIDABLE_FIELDS as readonly string[]).includes(f) || f.startsWith('mod:'),
  { message: 'Field is not overridable' },
)

export const SharedInstanceSchema = z.object({
  id: z.string().uuid(),
  instanceId: z.string().uuid(),
  ownerId: z.string(),
  ownerUsername: z.string(),
  ownerFriendCode: z.string(),
  instanceName: z.string(),
  minecraftVersion: z.string(),
  modLoader: z.string(),
  createdAt: z.string().datetime(),
})
export type SharedInstance = z.infer<typeof SharedInstanceSchema>

export const SharedByMeInstanceSchema = z.object({
  instanceId: z.string().uuid(),
  instanceName: z.string(),
  sharedWith: z.array(z.object({
    shareId: z.string().uuid(),
    userId: z.string(),
    username: z.string(),
    friendCode: z.string(),
  })),
})
export type SharedByMeInstance = z.infer<typeof SharedByMeInstanceSchema>

export const OverrideSchema = z.object({
  id: z.string().uuid(),
  instanceId: z.string().uuid(),
  field: z.string(),
  value: z.string(),
})
export type Override = z.infer<typeof OverrideSchema>

export const ConflictSchema = z.object({
  id: z.string().uuid(),
  instanceId: z.string().uuid(),
  instanceName: z.string().optional(),
  field: z.string(),
  ownerValue: z.string(),
  localValue: z.string(),
  createdAt: z.string().datetime(),
})
export type Conflict = z.infer<typeof ConflictSchema>

export const ConflictResolutionSchema = z.enum(['keep_mine', 'use_owner'])
export type ConflictResolution = z.infer<typeof ConflictResolutionSchema>

export const ShareInputSchema = z.object({
  instanceId: z.string().uuid(),
  friendId: z.string(),
})

export const SetOverrideInputSchema = z.object({
  instanceId: z.string().uuid(),
  field: OverrideFieldSchema,
  value: z.string(),
})

export const ResolveConflictInputSchema = z.object({
  conflictId: z.string().uuid(),
  resolution: ConflictResolutionSchema,
})
