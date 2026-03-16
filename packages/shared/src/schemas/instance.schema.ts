import { z } from 'zod'

export const ModLoaderSchema = z.enum(['vanilla', 'fabric', 'forge', 'quilt', 'neoforge'])
export type ModLoader = z.infer<typeof ModLoaderSchema>

export const ModEntrySchema = z.object({
  projectId: z.string(),
  versionId: z.string(),
  name: z.string(),
  fileName: z.string(),
  enabled: z.boolean(),
  iconUrl: z.string().optional(),
  versionNumber: z.string().optional(),
})
export type ModEntry = z.infer<typeof ModEntrySchema>

export const ResourcePackEntrySchema = z.object({
  projectId: z.string(),
  versionId: z.string(),
  name: z.string(),
  fileName: z.string(),
  iconUrl: z.string().optional(),
  versionNumber: z.string().optional(),
})
export type ResourcePackEntry = z.infer<typeof ResourcePackEntrySchema>

export const ConfigFileEntrySchema = z.object({
  filePath: z.string(),
  content: z.string(),
  hash: z.string(),
})
export type ConfigFileEntry = z.infer<typeof ConfigFileEntrySchema>

export const InstanceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  minecraftVersion: z.string(),
  modLoader: ModLoaderSchema,
  modLoaderVersion: z.string().optional(),
  effectiveVersionId: z.string().optional(),
  mods: z.array(ModEntrySchema).default([]),
  resourcePacks: z.array(ResourcePackEntrySchema).default([]),
  javaPath: z.string().optional(),
  jvmArgs: z.string().optional(),
  ramMb: z.number().int().positive().optional(),
  iconUrl: z.string().optional(),
  modpackProjectId: z.string().optional(),
  modpackVersionId: z.string().optional(),
  updatedAt: z.string().datetime().optional(),
})
export type Instance = z.infer<typeof InstanceSchema>

export const InstanceSyncDataSchema = InstanceSchema.extend({
  updatedAt: z.string().datetime(),
  configs: z.array(ConfigFileEntrySchema).default([]),
})
export type InstanceSyncData = z.infer<typeof InstanceSyncDataSchema>

export const SyncPayloadSchema = z.object({
  instances: z.array(InstanceSyncDataSchema),
  lastSyncedAt: z.string().datetime(),
})
export type SyncPayload = z.infer<typeof SyncPayloadSchema>

export const SyncPushInputSchema = z.object({
  instances: z.array(InstanceSyncDataSchema),
  deletedInstanceIds: z.array(z.string().uuid()).default([]),
  lastSyncedAt: z.string().datetime().optional(),
})
export type SyncPushInput = z.infer<typeof SyncPushInputSchema>

export const SyncPullResponseSchema = z.object({
  instances: z.array(InstanceSyncDataSchema),
  syncedAt: z.string().datetime(),
})
export type SyncPullResponse = z.infer<typeof SyncPullResponseSchema>
