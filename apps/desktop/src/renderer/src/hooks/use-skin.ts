import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMinecraftAccountsStore } from '@/store/minecraft-accounts.store'
import { useSettingsStore } from '@/store/settings.store'

async function ensureAccessToken(accountId: string): Promise<string> {
  const { accounts, addAccount } = useMinecraftAccountsStore.getState()
  const account = accounts.find((a) => a.id === accountId)
  if (!account) throw new Error('Account not found')

  if (account.accessToken) return account.accessToken

  const gameDir = useSettingsStore.getState().gameDirectory
  const refreshed = await window.minecraft.authRefresh(`${gameDir}/auth-cache`)
  addAccount(refreshed)
  return refreshed.accessToken
}

export function useSkinProfile(accountId?: string) {
  const accounts = useMinecraftAccountsStore((s) => s.accounts)
  const activeAccountId = useMinecraftAccountsStore((s) => s.activeAccountId)

  const targetId = accountId ?? activeAccountId
  const account = accounts.find((a) => a.id === targetId)

  return useQuery({
    queryKey: ['skin-profile', account?.id],
    queryFn: async () => {
      const token = await ensureAccessToken(account!.id)
      return window.minecraft.getSkinProfile(token)
    },
    enabled: !!account,
    staleTime: 5 * 60 * 1000,
  })
}

export function useUploadSkin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ accountId, variant }: { accountId: string; variant: 'classic' | 'slim' }) => {
      const token = await ensureAccessToken(accountId)
      return window.minecraft.uploadSkin(token, variant)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skin-profile'] })
    },
  })
}

export function useSetSkinVariant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      accountId,
      skinUrl,
      variant,
    }: {
      accountId: string
      skinUrl: string
      variant: 'classic' | 'slim'
    }) => {
      const token = await ensureAccessToken(accountId)
      return window.minecraft.setSkinVariant(token, skinUrl, variant)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skin-profile'] })
    },
  })
}

export function useSetActiveCape() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ accountId, capeId }: { accountId: string; capeId: string | null }) => {
      const token = await ensureAccessToken(accountId)
      return window.minecraft.setActiveCape(token, capeId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skin-profile'] })
    },
  })
}
