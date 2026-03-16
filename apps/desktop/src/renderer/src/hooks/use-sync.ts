import { useState, useCallback, useEffect, useRef } from 'react'
import { authClient } from '@/lib/auth-client'
import { useInstancesStore } from '@/store/instances.store'
import { useSharedInstancesStore } from '@/store/shared-instances.store'
import { useSettingsStore } from '@/store/settings.store'
import { trpc } from '@/lib/trpc'
import type { InstanceSyncData } from '@formallauncher/shared'

const SYNC_DEBOUNCE_MS = 10_000
const LAST_SYNCED_KEY = 'formallauncher-last-synced-at'

export function useSync() {
  const { data: session } = authClient.useSession()
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(
    () => localStorage.getItem(LAST_SYNCED_KEY),
  )
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasSyncedOnMount = useRef(false)

  const pushMutation = trpc.instance.push.useMutation()
  const sharedWithMeQuery = trpc.sharing.listSharedWithMe.useQuery(undefined, { enabled: !!session })
  const conflictsQuery = trpc.sharing.listConflicts.useQuery(undefined, { enabled: !!session })

  const sync = useCallback(async () => {
    if (syncing) return
    setSyncing(true)
    setError(null)

    try {
      const store = useInstancesStore.getState()
      const gameDir = useSettingsStore.getState().gameDirectory

      // Read config files for each instance
      const instancesWithConfigs: InstanceSyncData[] = await Promise.all(
        store.instances.map(async (instance) => {
          let configs: { filePath: string; content: string; hash: string }[] = []
          try {
            configs = await window.minecraft.readInstanceConfigs(gameDir, instance.id)
          } catch {
            // Instance may not have a config dir yet
          }
          return {
            ...instance,
            updatedAt: instance.updatedAt ?? new Date().toISOString(),
            configs,
          }
        }),
      )

      const result = await pushMutation.mutateAsync({
        instances: instancesWithConfigs,
        deletedInstanceIds: store.deletedInstanceIds,
        lastSyncedAt: lastSyncedAt ?? undefined,
      })

      // Write config files for server instances to disk
      for (const serverInstance of result.instances) {
        const localInstance = store.instances.find((i) => i.id === serverInstance.id)
        const isServerNewer =
          !localInstance ||
          !localInstance.updatedAt ||
          localInstance.updatedAt <= serverInstance.updatedAt

        if (isServerNewer && serverInstance.configs.length > 0) {
          try {
            await window.minecraft.writeInstanceConfigs(
              gameDir,
              serverInstance.id,
              serverInstance.configs,
            )
          } catch {
            // Config write failure is non-fatal
          }
        }
      }

      // Merge server state into local store
      useInstancesStore.getState().mergeFromServer(result.instances)
      useInstancesStore.getState().clearDeletedIds()

      const syncedAt = result.syncedAt
      setLastSyncedAt(syncedAt)
      localStorage.setItem(LAST_SYNCED_KEY, syncedAt)

      // Refresh shared instances after sync
      try {
        const sharedWithMe = await sharedWithMeQuery.refetch()
        if (sharedWithMe.data) {
          useSharedInstancesStore.getState().setSharedWithMe(sharedWithMe.data)
        }
        const conflicts = await conflictsQuery.refetch()
        if (conflicts.data) {
          useSharedInstancesStore.getState().setConflicts(conflicts.data)
        }
      } catch {
        // Shared instance refresh failure is non-fatal
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSyncing(false)
    }
  }, [syncing, lastSyncedAt, pushMutation])

  const debouncedSync = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      sync()
    }, SYNC_DEBOUNCE_MS)
  }, [sync])

  // Sync on mount if logged in
  useEffect(() => {
    if (session && !hasSyncedOnMount.current) {
      hasSyncedOnMount.current = true
      sync()
    }
  }, [session, sync])

  // Subscribe to store mutations for debounced sync
  useEffect(() => {
    if (!session) return
    const unsub = useInstancesStore.subscribe(() => {
      debouncedSync()
    })
    return () => {
      unsub()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [session, debouncedSync])

  return { sync, syncing, error, lastSyncedAt }
}
