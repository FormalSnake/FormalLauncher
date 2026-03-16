import { z } from 'zod'
import { router, protectedProcedure } from '../'
import { instances, instanceConfigs } from '../../db/schema'
import { eq, and, inArray, gt } from 'drizzle-orm'
import {
  InstanceSyncDataSchema,
  SyncPushInputSchema,
  type ConfigFileEntry,
  type InstanceSyncData,
} from '@formallauncher/shared'
import { encryptField, decryptField } from '../../lib/crypto'

const MAX_CONFIG_FILE_SIZE = 256 * 1024 // 256KB
const MAX_CONFIGS_TOTAL_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_ICON_DATA_URI_SIZE = 64 * 1024 // 64KB
const ALLOWED_CONFIG_EXTENSIONS = [
  '.json', '.toml', '.cfg', '.properties', '.yaml', '.yml', '.txt', '.conf', '.ini',
]

function validateConfigs(configs: ConfigFileEntry[]): void {
  let totalSize = 0
  for (const config of configs) {
    if (config.content.length > MAX_CONFIG_FILE_SIZE) {
      throw new Error(`Config file ${config.filePath} exceeds 256KB limit`)
    }
    const ext = config.filePath.slice(config.filePath.lastIndexOf('.'))
    if (!ALLOWED_CONFIG_EXTENSIONS.includes(ext)) {
      throw new Error(`Config file ${config.filePath} has disallowed extension ${ext}`)
    }
    totalSize += config.content.length
  }
  if (totalSize > MAX_CONFIGS_TOTAL_SIZE) {
    throw new Error('Total config size exceeds 5MB limit')
  }
}

function validateIconUrl(iconUrl: string | undefined): void {
  if (!iconUrl) return
  if (iconUrl.startsWith('data:') && iconUrl.length > MAX_ICON_DATA_URI_SIZE) {
    throw new Error('Icon data URI exceeds 64KB limit')
  }
}

async function upsertInstanceWithConfigs(
  db: Parameters<Parameters<typeof protectedProcedure.mutation>[0]>[0]['ctx']['db'],
  userId: string,
  data: InstanceSyncData,
  dek: Buffer,
) {
  validateConfigs(data.configs)
  validateIconUrl(data.iconUrl)

  const instanceData = {
    id: data.id,
    userId,
    name: data.name,
    minecraftVersion: data.minecraftVersion,
    modLoader: data.modLoader,
    modLoaderVersion: data.modLoaderVersion ?? null,
    effectiveVersionId: data.effectiveVersionId ?? null,
    mods: encryptField(JSON.stringify(data.mods), dek),
    resourcePacks: encryptField(JSON.stringify(data.resourcePacks), dek),
    jvmArgs: data.jvmArgs ? encryptField(data.jvmArgs, dek) : null,
    javaPath: data.javaPath ? encryptField(data.javaPath, dek) : null,
    ramMb: data.ramMb ?? null,
    iconUrl: data.iconUrl ? encryptField(data.iconUrl, dek) : null,
    modpackProjectId: data.modpackProjectId ?? null,
    modpackVersionId: data.modpackVersionId ?? null,
    updatedAt: new Date(data.updatedAt),
  }

  await db
    .insert(instances)
    .values(instanceData)
    .onConflictDoUpdate({
      target: instances.id,
      set: {
        ...instanceData,
        id: undefined,
        userId: undefined,
      },
    })

  // Upsert configs: delete all existing, then insert new ones
  await db.delete(instanceConfigs).where(eq(instanceConfigs.instanceId, data.id))

  if (data.configs.length > 0) {
    await db.insert(instanceConfigs).values(
      data.configs.map((c) => ({
        instanceId: data.id,
        filePath: c.filePath,
        content: encryptField(c.content, dek),
        hash: c.hash,
      })),
    )
  }
}

function decryptInstance(
  row: typeof instances.$inferSelect,
  configs: (typeof instanceConfigs.$inferSelect)[],
  dek: Buffer,
): InstanceSyncData {
  return {
    id: row.id,
    name: row.name,
    minecraftVersion: row.minecraftVersion,
    modLoader: row.modLoader as InstanceSyncData['modLoader'],
    modLoaderVersion: row.modLoaderVersion ?? undefined,
    effectiveVersionId: row.effectiveVersionId ?? undefined,
    mods: row.mods ? JSON.parse(decryptField(row.mods, dek)) : [],
    resourcePacks: row.resourcePacks ? JSON.parse(decryptField(row.resourcePacks, dek)) : [],
    jvmArgs: row.jvmArgs ? decryptField(row.jvmArgs, dek) : undefined,
    javaPath: row.javaPath ? decryptField(row.javaPath, dek) : undefined,
    ramMb: row.ramMb ?? undefined,
    iconUrl: row.iconUrl ? decryptField(row.iconUrl, dek) : undefined,
    modpackProjectId: row.modpackProjectId ?? undefined,
    modpackVersionId: row.modpackVersionId ?? undefined,
    updatedAt: row.updatedAt.toISOString(),
    configs: configs.map((c) => ({
      filePath: c.filePath,
      content: decryptField(c.content, dek),
      hash: c.hash,
    })),
  }
}

async function getInstancesWithConfigs(
  db: Parameters<Parameters<typeof protectedProcedure.mutation>[0]>[0]['ctx']['db'],
  userId: string,
  dek: Buffer,
  since?: Date,
): Promise<InstanceSyncData[]> {
  const whereClause = since
    ? and(eq(instances.userId, userId), gt(instances.updatedAt, since))
    : eq(instances.userId, userId)

  const rows = await db.select().from(instances).where(whereClause)

  const result: InstanceSyncData[] = []
  for (const row of rows) {
    const configs = await db
      .select()
      .from(instanceConfigs)
      .where(eq(instanceConfigs.instanceId, row.id))

    result.push(decryptInstance(row, configs, dek))
  }
  return result
}

export const instanceRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.select().from(instances).where(eq(instances.userId, ctx.session.user.id))
    return rows.map((row) => ({
      ...row,
      mods: row.mods ? JSON.parse(decryptField(row.mods, ctx.dek)) : [],
      resourcePacks: row.resourcePacks ? JSON.parse(decryptField(row.resourcePacks, ctx.dek)) : [],
      jvmArgs: row.jvmArgs ? decryptField(row.jvmArgs, ctx.dek) : null,
      javaPath: row.javaPath ? decryptField(row.javaPath, ctx.dek) : null,
      iconUrl: row.iconUrl ? decryptField(row.iconUrl, ctx.dek) : null,
    }))
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [instance] = await ctx.db
        .select()
        .from(instances)
        .where(and(eq(instances.id, input.id), eq(instances.userId, ctx.session.user.id)))

      if (!instance) return null

      const configs = await ctx.db
        .select()
        .from(instanceConfigs)
        .where(eq(instanceConfigs.instanceId, instance.id))

      return {
        ...instance,
        mods: instance.mods ? JSON.parse(decryptField(instance.mods, ctx.dek)) : [],
        resourcePacks: instance.resourcePacks ? JSON.parse(decryptField(instance.resourcePacks, ctx.dek)) : [],
        jvmArgs: instance.jvmArgs ? decryptField(instance.jvmArgs, ctx.dek) : null,
        javaPath: instance.javaPath ? decryptField(instance.javaPath, ctx.dek) : null,
        iconUrl: instance.iconUrl ? decryptField(instance.iconUrl, ctx.dek) : null,
        configs: configs.map((c) => ({
          ...c,
          content: decryptField(c.content, ctx.dek),
        })),
      }
    }),

  upsert: protectedProcedure
    .input(InstanceSyncDataSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify ownership if instance exists
      const [existing] = await ctx.db
        .select({ userId: instances.userId })
        .from(instances)
        .where(eq(instances.id, input.id))

      if (existing && existing.userId !== ctx.session.user.id) {
        throw new Error('Not authorized')
      }

      await upsertInstanceWithConfigs(ctx.db, ctx.session.user.id, input, ctx.dek)
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(instances)
        .where(and(eq(instances.id, input.id), eq(instances.userId, ctx.session.user.id)))
    }),

  push: protectedProcedure
    .input(SyncPushInputSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      // Delete requested instances (verify ownership via where clause)
      if (input.deletedInstanceIds.length > 0) {
        await ctx.db
          .delete(instances)
          .where(
            and(
              inArray(instances.id, input.deletedInstanceIds),
              eq(instances.userId, userId),
            ),
          )
      }

      // Upsert each instance — last-write-wins by updatedAt
      for (const instance of input.instances) {
        const [existing] = await ctx.db
          .select({ userId: instances.userId, updatedAt: instances.updatedAt })
          .from(instances)
          .where(eq(instances.id, instance.id))

        // Skip if server version is newer
        if (existing) {
          if (existing.userId !== userId) continue
          if (existing.updatedAt > new Date(instance.updatedAt)) continue
        }

        await upsertInstanceWithConfigs(ctx.db, userId, instance, ctx.dek)
      }

      // Return authoritative server state
      const serverInstances = await getInstancesWithConfigs(ctx.db, userId, ctx.dek)
      return {
        instances: serverInstances,
        syncedAt: new Date().toISOString(),
      }
    }),

  pull: protectedProcedure
    .input(z.object({ lastSyncedAt: z.string().datetime().optional() }))
    .query(async ({ ctx, input }) => {
      const since = input.lastSyncedAt ? new Date(input.lastSyncedAt) : undefined
      const serverInstances = await getInstancesWithConfigs(ctx.db, ctx.session.user.id, ctx.dek, since)
      return {
        instances: serverInstances,
        syncedAt: new Date().toISOString(),
      }
    }),
})
