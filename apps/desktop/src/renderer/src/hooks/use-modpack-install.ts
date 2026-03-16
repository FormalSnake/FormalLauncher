import { useState, useCallback } from 'react'
import { useInstancesStore } from '@/store/instances.store'
import { useSettingsStore } from '@/store/settings.store'
import type { ModEntry } from '@formallauncher/shared'

export function useModpackInstall() {
  const [installing, setInstalling] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const installModpack = useCallback(
    async (
      modpackFileUrl: string,
      instanceName: string,
      options?: { modpackProjectId?: string; modpackVersionId?: string },
    ): Promise<string | null> => {
      setInstalling(true)
      setError(null)
      setProgress(null)

      try {
        const gameDir = useSettingsStore.getState().gameDirectory
        const instanceId = crypto.randomUUID()

        // Create instance directories
        await window.minecraft.ensureInstanceDirs(gameDir, instanceId)

        // Download and parse modpack
        const manifest = await window.minecraft.installModpack(
          gameDir,
          instanceId,
          modpackFileUrl,
        )

        const mcVersion = manifest.gameVersion
        if (!mcVersion) throw new Error('Modpack does not specify a Minecraft version')

        // Install Fabric if needed
        let effectiveVersionId: string | undefined
        let modLoader: 'vanilla' | 'fabric' = 'vanilla'
        let modLoaderVersion: string | undefined

        const fabricVersion = manifest.dependencies['fabric-loader']
        if (fabricVersion) {
          modLoader = 'fabric'
          modLoaderVersion = fabricVersion
          effectiveVersionId = await window.minecraft.installFabric(
            gameDir,
            mcVersion,
            fabricVersion,
          )
        }

        // Download all mod files
        const total = manifest.files.length
        setProgress({ current: 0, total })

        const mods: ModEntry[] = []
        for (let i = 0; i < manifest.files.length; i++) {
          const file = manifest.files[i]
          const destPath = `${gameDir}/instances/${instanceId}/${file.path}`
          const downloadUrl = file.downloads[0]
          if (downloadUrl) {
            await window.minecraft.downloadFile(
              downloadUrl,
              destPath,
              file.hashes.sha1,
            )
          }

          // Track mods in the mods directory
          if (file.path.startsWith('mods/')) {
            const fileName = file.path.split('/').pop() ?? file.path
            mods.push({
              projectId: file.hashes.sha1,
              versionId: file.hashes.sha1,
              name: fileName.replace(/\.jar$/, ''),
              fileName,
              enabled: true,
            })
          }

          setProgress({ current: i + 1, total })
        }

        // Apply overrides (configs etc.)
        if (manifest.overridesDir) {
          const instanceDir = `${gameDir}/instances/${instanceId}`
          await window.minecraft.applyModpackOverrides(
            manifest.extractedPath,
            instanceDir,
          )
        }

        // Create instance in store
        useInstancesStore.getState().addInstance({
          id: instanceId,
          name: instanceName,
          minecraftVersion: mcVersion,
          modLoader,
          modLoaderVersion,
          effectiveVersionId,
          mods,
          resourcePacks: [],
          ramMb: 4096,
          modpackProjectId: options?.modpackProjectId,
          modpackVersionId: options?.modpackVersionId,
        })

        setProgress(null)
        return instanceId
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return null
      } finally {
        setInstalling(false)
      }
    },
    [],
  )

  const installModpackFromFile = useCallback(
    async (
      filePath: string,
      instanceName: string,
    ): Promise<string | null> => {
      setInstalling(true)
      setError(null)
      setProgress(null)

      try {
        const gameDir = useSettingsStore.getState().gameDirectory
        const instanceId = crypto.randomUUID()

        await window.minecraft.ensureInstanceDirs(gameDir, instanceId)

        const manifest = await window.minecraft.installModpackFromFile(
          gameDir,
          instanceId,
          filePath,
        )

        const mcVersion = manifest.gameVersion
        if (!mcVersion) throw new Error('Modpack does not specify a Minecraft version')

        let effectiveVersionId: string | undefined
        let modLoader: 'vanilla' | 'fabric' = 'vanilla'
        let modLoaderVersion: string | undefined

        const fabricVersion = manifest.dependencies['fabric-loader']
        if (fabricVersion) {
          modLoader = 'fabric'
          modLoaderVersion = fabricVersion
          effectiveVersionId = await window.minecraft.installFabric(
            gameDir,
            mcVersion,
            fabricVersion,
          )
        }

        const total = manifest.files.length
        setProgress({ current: 0, total })

        const mods: ModEntry[] = []
        for (let i = 0; i < manifest.files.length; i++) {
          const file = manifest.files[i]
          const destPath = `${gameDir}/instances/${instanceId}/${file.path}`
          const downloadUrl = file.downloads[0]
          if (downloadUrl) {
            await window.minecraft.downloadFile(
              downloadUrl,
              destPath,
              file.hashes.sha1,
            )
          }

          if (file.path.startsWith('mods/')) {
            const fileName = file.path.split('/').pop() ?? file.path
            mods.push({
              projectId: file.hashes.sha1,
              versionId: file.hashes.sha1,
              name: fileName.replace(/\.jar$/, ''),
              fileName,
              enabled: true,
            })
          }

          setProgress({ current: i + 1, total })
        }

        if (manifest.overridesDir) {
          const instanceDir = `${gameDir}/instances/${instanceId}`
          await window.minecraft.applyModpackOverrides(
            manifest.extractedPath,
            instanceDir,
          )
        }

        useInstancesStore.getState().addInstance({
          id: instanceId,
          name: instanceName,
          minecraftVersion: mcVersion,
          modLoader,
          modLoaderVersion,
          effectiveVersionId,
          mods,
          resourcePacks: [],
          ramMb: 4096,
        })

        setProgress(null)
        return instanceId
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return null
      } finally {
        setInstalling(false)
      }
    },
    [],
  )

  return { installModpack, installModpackFromFile, installing, progress, error }
}
