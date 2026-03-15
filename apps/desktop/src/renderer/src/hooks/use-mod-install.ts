import { useState, useCallback } from 'react'
import { useInstancesStore } from '@/store/instances.store'
import { useSettingsStore } from '@/store/settings.store'
import { getProjectVersions, getVersion } from '@/lib/modrinth'
import type { ModrinthVersion } from '@/lib/modrinth'
import type { ModEntry, ResourcePackEntry } from '@formallauncher/shared'

function getInstanceModsPath(gameDir: string, instanceId: string): string {
  return `${gameDir}/instances/${instanceId}/mods`
}

function getInstanceResourcePacksPath(gameDir: string, instanceId: string): string {
  return `${gameDir}/instances/${instanceId}/resourcepacks`
}

export function useContentInstall() {
  const [installing, setInstalling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const installMod = useCallback(
    async (
      instanceId: string,
      projectId: string,
      projectName: string,
      versionId?: string,
    ) => {
      setInstalling(true)
      setError(null)
      try {
        const instance = useInstancesStore
          .getState()
          .instances.find((i) => i.id === instanceId)
        if (!instance) throw new Error('Instance not found')

        const gameDir = useSettingsStore.getState().gameDirectory

        let version: ModrinthVersion
        if (versionId) {
          version = await getVersion(versionId)
        } else {
          const loaders =
            instance.modLoader === 'vanilla' ? [] : [instance.modLoader]
          const versions = await getProjectVersions(projectId, {
            game_versions: [instance.minecraftVersion],
            loaders: loaders.length > 0 ? loaders : undefined,
          })
          if (versions.length === 0) throw new Error('No compatible version found')
          version = versions[0]
        }

        const file = version.files.find((f) => f.primary) ?? version.files[0]
        if (!file) throw new Error('No file found for this version')

        const destPath = `${getInstanceModsPath(gameDir, instanceId)}/${file.filename}`
        await window.minecraft.downloadFile(file.url, destPath, file.hashes.sha1)

        const modEntry: ModEntry = {
          projectId,
          versionId: version.id,
          name: projectName,
          fileName: file.filename,
          enabled: true,
        }
        useInstancesStore.getState().addMod(instanceId, modEntry)

        // Handle required dependencies
        for (const dep of version.dependencies) {
          if (dep.dependency_type !== 'required' || !dep.project_id) continue
          const existing = useInstancesStore
            .getState()
            .instances.find((i) => i.id === instanceId)
            ?.mods.find((m) => m.projectId === dep.project_id)
          if (existing) continue

          try {
            const depVersions = await getProjectVersions(dep.project_id, {
              game_versions: [instance.minecraftVersion],
              loaders:
                instance.modLoader === 'vanilla' ? undefined : [instance.modLoader],
            })
            if (depVersions.length > 0) {
              const depVersion = depVersions[0]
              const depFile =
                depVersion.files.find((f) => f.primary) ?? depVersion.files[0]
              if (depFile) {
                const depDest = `${getInstanceModsPath(gameDir, instanceId)}/${depFile.filename}`
                await window.minecraft.downloadFile(
                  depFile.url,
                  depDest,
                  depFile.hashes.sha1,
                )
                useInstancesStore.getState().addMod(instanceId, {
                  projectId: dep.project_id,
                  versionId: depVersion.id,
                  name: depVersion.name,
                  fileName: depFile.filename,
                  enabled: true,
                })
              }
            }
          } catch {
            // Don't fail main install if dep fails
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setInstalling(false)
      }
    },
    [],
  )

  const removeMod = useCallback(async (instanceId: string, mod: ModEntry) => {
    const gameDir = useSettingsStore.getState().gameDirectory
    const fileName = mod.enabled ? mod.fileName : `${mod.fileName}.disabled`
    try {
      await window.minecraft.deleteFile(
        `${getInstanceModsPath(gameDir, instanceId)}/${fileName}`,
      )
    } catch {
      // File may not exist
    }
    useInstancesStore.getState().removeMod(instanceId, mod.projectId)
  }, [])

  const toggleMod = useCallback(async (instanceId: string, mod: ModEntry) => {
    const gameDir = useSettingsStore.getState().gameDirectory
    const modsDir = getInstanceModsPath(gameDir, instanceId)
    if (mod.enabled) {
      await window.minecraft.renameFile(
        `${modsDir}/${mod.fileName}`,
        `${modsDir}/${mod.fileName}.disabled`,
      )
    } else {
      await window.minecraft.renameFile(
        `${modsDir}/${mod.fileName}.disabled`,
        `${modsDir}/${mod.fileName}`,
      )
    }
    useInstancesStore.getState().toggleMod(instanceId, mod.projectId)
  }, [])

  const installResourcePack = useCallback(
    async (
      instanceId: string,
      projectId: string,
      projectName: string,
      versionId?: string,
    ) => {
      setInstalling(true)
      setError(null)
      try {
        const instance = useInstancesStore
          .getState()
          .instances.find((i) => i.id === instanceId)
        if (!instance) throw new Error('Instance not found')

        const gameDir = useSettingsStore.getState().gameDirectory

        let version: ModrinthVersion
        if (versionId) {
          version = await getVersion(versionId)
        } else {
          const versions = await getProjectVersions(projectId, {
            game_versions: [instance.minecraftVersion],
          })
          if (versions.length === 0) throw new Error('No compatible version found')
          version = versions[0]
        }

        const file = version.files.find((f) => f.primary) ?? version.files[0]
        if (!file) throw new Error('No file found for this version')

        const destPath = `${getInstanceResourcePacksPath(gameDir, instanceId)}/${file.filename}`
        await window.minecraft.downloadFile(file.url, destPath, file.hashes.sha1)

        const entry: ResourcePackEntry = {
          projectId,
          versionId: version.id,
          name: projectName,
          fileName: file.filename,
        }
        useInstancesStore.getState().addResourcePack(instanceId, entry)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setInstalling(false)
      }
    },
    [],
  )

  const removeResourcePack = useCallback(
    async (instanceId: string, entry: ResourcePackEntry) => {
      const gameDir = useSettingsStore.getState().gameDirectory
      try {
        await window.minecraft.deleteFile(
          `${getInstanceResourcePacksPath(gameDir, instanceId)}/${entry.fileName}`,
        )
      } catch {
        // File may not exist
      }
      useInstancesStore.getState().removeResourcePack(instanceId, entry.projectId)
    },
    [],
  )

  return {
    installMod,
    removeMod,
    toggleMod,
    installResourcePack,
    removeResourcePack,
    installing,
    error,
  }
}
