import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SharedInstance, SharedByMeInstance, Override, Conflict } from '@formallauncher/shared'

interface SharedInstancesState {
  sharedWithMe: SharedInstance[]
  sharedByMe: SharedByMeInstance[]
  overrides: Record<string, Override[]>
  conflicts: Conflict[]
  setSharedWithMe: (instances: SharedInstance[]) => void
  setSharedByMe: (instances: SharedByMeInstance[]) => void
  setOverrides: (instanceId: string, overrides: Override[]) => void
  setConflicts: (conflicts: Conflict[]) => void
  removeConflict: (conflictId: string) => void
}

export const useSharedInstancesStore = create<SharedInstancesState>()(
  persist(
    (set) => ({
      sharedWithMe: [],
      sharedByMe: [],
      overrides: {},
      conflicts: [],

      setSharedWithMe: (instances) => set({ sharedWithMe: instances }),
      setSharedByMe: (instances) => set({ sharedByMe: instances }),

      setOverrides: (instanceId, overrides) =>
        set((state) => ({
          overrides: { ...state.overrides, [instanceId]: overrides },
        })),

      setConflicts: (conflicts) => set({ conflicts }),

      removeConflict: (conflictId) =>
        set((state) => ({
          conflicts: state.conflicts.filter((c) => c.id !== conflictId),
        })),
    }),
    {
      name: 'formallauncher-shared-instances',
      partialize: (state) => ({
        sharedWithMe: state.sharedWithMe,
        sharedByMe: state.sharedByMe,
      }),
    },
  ),
)
