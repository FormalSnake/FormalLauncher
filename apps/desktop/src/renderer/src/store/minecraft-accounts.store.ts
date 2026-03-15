import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MinecraftAccount } from '@/types/minecraft'

interface MinecraftAccountsState {
  accounts: MinecraftAccount[]
  activeAccountId: string | null
  addAccount: (account: MinecraftAccount) => void
  removeAccount: (id: string) => void
  setActiveAccount: (id: string) => void
  getActiveAccount: () => MinecraftAccount | null
}

export const useMinecraftAccountsStore = create<MinecraftAccountsState>()(
  persist(
    (set, get) => ({
      accounts: [],
      activeAccountId: null,

      addAccount: (account) =>
        set((state) => {
          const existing = state.accounts.findIndex((a) => a.id === account.id)
          const accounts =
            existing >= 0
              ? state.accounts.map((a) => (a.id === account.id ? account : a))
              : [...state.accounts, account]
          return {
            accounts,
            activeAccountId: state.activeAccountId ?? account.id,
          }
        }),

      removeAccount: (id) =>
        set((state) => {
          const accounts = state.accounts.filter((a) => a.id !== id)
          const activeAccountId =
            state.activeAccountId === id
              ? (accounts[0]?.id ?? null)
              : state.activeAccountId
          return { accounts, activeAccountId }
        }),

      setActiveAccount: (id) => set({ activeAccountId: id }),

      getActiveAccount: () => {
        const { accounts, activeAccountId } = get()
        return accounts.find((a) => a.id === activeAccountId) ?? null
      },
    }),
    {
      name: 'formallauncher-minecraft-accounts',
      partialize: (state) => ({
        accounts: state.accounts.map(({ id, name }) => ({
          id,
          name,
          accessToken: '',
        })),
        activeAccountId: state.activeAccountId,
      }),
    },
  ),
)
