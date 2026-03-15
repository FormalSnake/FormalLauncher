import { z } from 'zod'

export const ModLoaderSchema = z.enum(['vanilla', 'fabric', 'forge', 'quilt', 'neoforge'])
export type ModLoader = z.infer<typeof ModLoaderSchema>

export const ModEntrySchema = z.object({
  projectId: z.string(),
  versionId: z.string(),
  name: z.string(),
  fileName: z.string(),
  enabled: z.boolean(),
})
export type ModEntry = z.infer<typeof ModEntrySchema>

export const ResourcePackEntrySchema = z.object({
  projectId: z.string(),
  versionId: z.string(),
  name: z.string(),
  fileName: z.string(),
})
export type ResourcePackEntry = z.infer<typeof ResourcePackEntrySchema>

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
})
export type Instance = z.infer<typeof InstanceSchema>

export const SyncPayloadSchema = z.object({
  instances: z.array(InstanceSchema),
  lastSyncedAt: z.string().datetime(),
})
export type SyncPayload = z.infer<typeof SyncPayloadSchema>
