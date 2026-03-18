import { useState } from 'react'
import { toast } from 'sonner'
import { useInstancesStore } from '@/store/instances.store'
import { getVersionFilesByHash } from '@/lib/modrinth'

export function useBulkLinkMods(instanceId: string) {
  const [isLinking, setIsLinking] = useState(false)

  const linkAll = async () => {
    const instance = useInstancesStore.getState().instances.find((i) => i.id === instanceId)
    if (!instance) return

    const unlinkedMods = (instance.mods ?? []).filter((m) => /^[a-f0-9]{40}$/.test(m.projectId))
    if (unlinkedMods.length === 0) return

    setIsLinking(true)
    try {
      const hashes = unlinkedMods.map((m) => m.projectId)
      const result = await getVersionFilesByHash(hashes, 'sha1')

      const notFoundNames: string[] = []

      for (const mod of unlinkedMods) {
        const version = result[mod.projectId]
        if (version) {
          useInstancesStore.getState().removeMod(instanceId, mod.projectId)
          useInstancesStore.getState().addMod(instanceId, {
            ...mod,
            projectId: version.project_id,
            versionId: version.id,
            versionNumber: version.version_number,
          })
        } else {
          notFoundNames.push(mod.name)
        }
      }

      const linkedCount = unlinkedMods.length - notFoundNames.length

      if (notFoundNames.length === 0) {
        toast.success('All mods linked to Modrinth')
      } else if (linkedCount === 0) {
        toast.error('No mods found on Modrinth', {
          description: notFoundNames.join(', '),
        })
      } else {
        toast.warning('Some mods not found on Modrinth', {
          description: notFoundNames.join(', '),
        })
      }
    } catch {
      toast.error('Failed to link mods to Modrinth')
    } finally {
      setIsLinking(false)
    }
  }

  return { linkAll, isLinking }
}
