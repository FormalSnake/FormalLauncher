import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  gameDirectory: string
  defaultRamMb: number
  defaultJvmArgs: string
  javaPath: string
  initialized: boolean
  initialize: () => Promise<void>
  setGameDirectory: (dir: string) => void
  setDefaultRamMb: (mb: number) => void
  setDefaultJvmArgs: (args: string) => void
  setJavaPath: (path: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      gameDirectory: '',
      defaultRamMb: 4096,
      defaultJvmArgs: '',
      javaPath: 'java',
      initialized: false,

      initialize: async () => {
        if (get().initialized) return
        if (!get().gameDirectory) {
          const dir = await window.minecraft.getDefaultGameDir()
          set({ gameDirectory: dir })
        }
        set({ initialized: true })
      },

      setGameDirectory: (dir) => set({ gameDirectory: dir }),
      setDefaultRamMb: (mb) => set({ defaultRamMb: mb }),
      setDefaultJvmArgs: (args) => set({ defaultJvmArgs: args }),
      setJavaPath: (path) => set({ javaPath: path }),
    }),
    {
      name: 'formallauncher-settings',
      partialize: (state) => ({
        gameDirectory: state.gameDirectory,
        defaultRamMb: state.defaultRamMb,
        defaultJvmArgs: state.defaultJvmArgs,
        javaPath: state.javaPath,
      }),
    },
  ),
)
