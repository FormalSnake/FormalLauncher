import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Instance, ModEntry, ResourcePackEntry } from '@formallauncher/shared'

interface InstancesState {
  instances: Instance[]
  selectedInstanceId: string | null
  searchQuery: string
  addInstance: (instance: Instance) => void
  removeInstance: (id: string) => void
  updateInstance: (id: string, updates: Partial<Instance>) => void
  setSelectedInstanceId: (id: string | null) => void
  setSearchQuery: (query: string) => void
  addMod: (instanceId: string, mod: ModEntry) => void
  removeMod: (instanceId: string, projectId: string) => void
  toggleMod: (instanceId: string, projectId: string) => void
  addResourcePack: (instanceId: string, rp: ResourcePackEntry) => void
  removeResourcePack: (instanceId: string, projectId: string) => void
}

export const useInstancesStore = create<InstancesState>()(
  persist(
    (set) => ({
      instances: [],
      selectedInstanceId: null,
      searchQuery: '',

      addInstance: (instance) =>
        set((state) => ({ instances: [...state.instances, instance] })),

      removeInstance: (id) =>
        set((state) => ({
          instances: state.instances.filter((i) => i.id !== id),
          selectedInstanceId:
            state.selectedInstanceId === id ? null : state.selectedInstanceId,
        })),

      updateInstance: (id, updates) =>
        set((state) => ({
          instances: state.instances.map((i) =>
            i.id === id ? { ...i, ...updates } : i,
          ),
        })),

      setSelectedInstanceId: (id) => set({ selectedInstanceId: id }),
      setSearchQuery: (query) => set({ searchQuery: query }),

      addMod: (instanceId, mod) =>
        set((state) => ({
          instances: state.instances.map((i) =>
            i.id === instanceId
              ? { ...i, mods: [...i.mods.filter((m) => m.projectId !== mod.projectId), mod] }
              : i,
          ),
        })),

      removeMod: (instanceId, projectId) =>
        set((state) => ({
          instances: state.instances.map((i) =>
            i.id === instanceId
              ? { ...i, mods: i.mods.filter((m) => m.projectId !== projectId) }
              : i,
          ),
        })),

      toggleMod: (instanceId, projectId) =>
        set((state) => ({
          instances: state.instances.map((i) =>
            i.id === instanceId
              ? {
                  ...i,
                  mods: i.mods.map((m) =>
                    m.projectId === projectId ? { ...m, enabled: !m.enabled } : m,
                  ),
                }
              : i,
          ),
        })),

      addResourcePack: (instanceId, rp) =>
        set((state) => ({
          instances: state.instances.map((i) =>
            i.id === instanceId
              ? {
                  ...i,
                  resourcePacks: [
                    ...i.resourcePacks.filter((r) => r.projectId !== rp.projectId),
                    rp,
                  ],
                }
              : i,
          ),
        })),

      removeResourcePack: (instanceId, projectId) =>
        set((state) => ({
          instances: state.instances.map((i) =>
            i.id === instanceId
              ? {
                  ...i,
                  resourcePacks: i.resourcePacks.filter((r) => r.projectId !== projectId),
                }
              : i,
          ),
        })),
    }),
    {
      name: 'formallauncher-instances',
      partialize: (state) => ({
        instances: state.instances,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<InstancesState> | undefined
        return {
          ...current,
          instances: (p?.instances ?? []).map((i) => ({
            ...i,
            mods: i.mods ?? [],
            resourcePacks: i.resourcePacks ?? [],
          })),
        }
      },
    },
  ),
)
