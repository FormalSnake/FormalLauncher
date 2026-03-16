import { useState, useCallback } from 'react'
import { useInstancesStore } from '@/store/instances.store'
import { useSettingsStore } from '@/store/settings.store'
import { getProjectVersions } from '@/lib/modrinth'

export interface UpdateInfo {
  type: 'mod' | 'resourcepack' | 'modpack'
  projectId: string
  name: string
  currentVersionId: string
  latestVersionId: string
  latestVersionNumber: string
  latestFileName: string
  latestFileUrl: string
  latestFileSha1: string
}

async function pLimit<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
  const results: T[] = []
  let index = 0

  async function runNext(): Promise<void> {
    while (index < tasks.length) {
      const i = index++
      results[i] = await tasks[i]()
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => runNext())
  await Promise.all(workers)
  return results
}

export function useUpdateCheck(instanceId: string) {
  const [updates, setUpdates] = useState<UpdateInfo[]>([])
  const [checking, setChecking] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [updateProgress, setUpdateProgress] = useState<{ current: number; total: number } | null>(null)

  const checkForUpdates = useCallback(async () => {
    setChecking(true)
    setUpdates([])

    try {
      const instance = useInstancesStore.getState().instances.find((i) => i.id === instanceId)
      if (!instance) return

      const found: UpdateInfo[] = []
      const sha1Pattern = /^[a-f0-9]{40}$/

      const tasks: (() => Promise<void>)[] = []

      // Check mods
      for (const mod of instance.mods ?? []) {
        if (sha1Pattern.test(mod.projectId) || !mod.versionId) continue
        tasks.push(async () => {
          try {
            const loaders = instance.modLoader === 'vanilla' ? undefined : [instance.modLoader]
            const versions = await getProjectVersions(mod.projectId, {
              game_versions: [instance.minecraftVersion],
              loaders,
            })
            if (versions.length > 0 && versions[0].id !== mod.versionId) {
              const file = versions[0].files.find((f) => f.primary) ?? versions[0].files[0]
              if (file) {
                found.push({
                  type: 'mod',
                  projectId: mod.projectId,
                  name: mod.name,
                  currentVersionId: mod.versionId,
                  latestVersionId: versions[0].id,
                  latestVersionNumber: versions[0].version_number,
                  latestFileName: file.filename,
                  latestFileUrl: file.url,
                  latestFileSha1: file.hashes.sha1,
                })
              }
            }
          } catch {
            // Skip items that fail to check
          }
        })
      }

      // Check resource packs
      for (const rp of instance.resourcePacks ?? []) {
        if (sha1Pattern.test(rp.projectId) || !rp.versionId) continue
        tasks.push(async () => {
          try {
            const versions = await getProjectVersions(rp.projectId, {
              game_versions: [instance.minecraftVersion],
            })
            if (versions.length > 0 && versions[0].id !== rp.versionId) {
              const file = versions[0].files.find((f) => f.primary) ?? versions[0].files[0]
              if (file) {
                found.push({
                  type: 'resourcepack',
                  projectId: rp.projectId,
                  name: rp.name,
                  currentVersionId: rp.versionId,
                  latestVersionId: versions[0].id,
                  latestVersionNumber: versions[0].version_number,
                  latestFileName: file.filename,
                  latestFileUrl: file.url,
                  latestFileSha1: file.hashes.sha1,
                })
              }
            }
          } catch {
            // Skip
          }
        })
      }

      // Check modpack
      if (instance.modpackProjectId && instance.modpackVersionId) {
        tasks.push(async () => {
          try {
            const versions = await getProjectVersions(instance.modpackProjectId!, {
              game_versions: [instance.minecraftVersion],
            })
            if (versions.length > 0 && versions[0].id !== instance.modpackVersionId) {
              const file = versions[0].files.find((f) => f.primary) ?? versions[0].files[0]
              if (file) {
                found.push({
                  type: 'modpack',
                  projectId: instance.modpackProjectId!,
                  name: instance.name,
                  currentVersionId: instance.modpackVersionId!,
                  latestVersionId: versions[0].id,
                  latestVersionNumber: versions[0].version_number,
                  latestFileName: file.filename,
                  latestFileUrl: file.url,
                  latestFileSha1: file.hashes.sha1,
                })
              }
            }
          } catch {
            // Skip
          }
        })
      }

      await pLimit(tasks, 5)
      setUpdates(found)
    } finally {
      setChecking(false)
    }
  }, [instanceId])

  const updateItem = useCallback(async (update: UpdateInfo) => {
    setUpdating(true)
    try {
      const gameDir = useSettingsStore.getState().gameDirectory
      const instance = useInstancesStore.getState().instances.find((i) => i.id === instanceId)
      if (!instance) return

      if (update.type === 'mod') {
        const modsDir = `${gameDir}/instances/${instanceId}/mods`
        const oldMod = instance.mods.find((m) => m.projectId === update.projectId)

        // Download new file
        await window.minecraft.downloadFile(
          update.latestFileUrl,
          `${modsDir}/${update.latestFileName}`,
          update.latestFileSha1,
        )

        // Delete old file
        if (oldMod) {
          const oldFileName = oldMod.enabled ? oldMod.fileName : `${oldMod.fileName}.disabled`
          try {
            await window.minecraft.deleteFile(`${modsDir}/${oldFileName}`)
          } catch {
            // Old file may not exist
          }
        }

        // Update store
        useInstancesStore.getState().addMod(instanceId, {
          projectId: update.projectId,
          versionId: update.latestVersionId,
          name: update.name,
          fileName: update.latestFileName,
          enabled: oldMod?.enabled ?? true,
          iconUrl: oldMod?.iconUrl,
        })
      } else if (update.type === 'resourcepack') {
        const rpDir = `${gameDir}/instances/${instanceId}/resourcepacks`
        const oldRp = instance.resourcePacks.find((r) => r.projectId === update.projectId)

        await window.minecraft.downloadFile(
          update.latestFileUrl,
          `${rpDir}/${update.latestFileName}`,
          update.latestFileSha1,
        )

        if (oldRp) {
          try {
            await window.minecraft.deleteFile(`${rpDir}/${oldRp.fileName}`)
          } catch {
            // Old file may not exist
          }
        }

        useInstancesStore.getState().addResourcePack(instanceId, {
          projectId: update.projectId,
          versionId: update.latestVersionId,
          name: update.name,
          fileName: update.latestFileName,
          iconUrl: oldRp?.iconUrl,
        })
      }

      // Remove from updates list
      setUpdates((prev) => prev.filter((u) => u.projectId !== update.projectId || u.type !== update.type))
    } finally {
      setUpdating(false)
    }
  }, [instanceId])

  const updateAll = useCallback(async () => {
    setUpdating(true)
    const nonModpackUpdates = updates.filter((u) => u.type !== 'modpack')
    setUpdateProgress({ current: 0, total: nonModpackUpdates.length })

    for (let i = 0; i < nonModpackUpdates.length; i++) {
      await updateItem(nonModpackUpdates[i])
      setUpdateProgress({ current: i + 1, total: nonModpackUpdates.length })
    }

    setUpdateProgress(null)
    setUpdating(false)
  }, [updates, updateItem])

  return {
    checkForUpdates,
    updates,
    checking,
    updateItem,
    updateAll,
    updating,
    updateProgress,
  }
}
