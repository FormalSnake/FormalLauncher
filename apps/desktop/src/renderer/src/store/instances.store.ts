import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Instance } from '@formallauncher/shared'

interface InstancesState {
  instances: Instance[]
  selectedInstanceId: string | null
  searchQuery: string
  addInstance: (instance: Instance) => void
  removeInstance: (id: string) => void
  updateInstance: (id: string, updates: Partial<Instance>) => void
  setSelectedInstanceId: (id: string | null) => void
  setSearchQuery: (query: string) => void
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
    }),
    {
      name: 'formallauncher-instances',
      partialize: (state) => ({
        instances: state.instances,
      }),
    },
  ),
)
