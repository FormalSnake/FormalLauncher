import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMinecraftAccountsStore } from '@/store/minecraft-accounts.store'

export function useSkinProfile(accountId?: string) {
  const getActiveAccount = useMinecraftAccountsStore((s) => s.getActiveAccount)
  const accounts = useMinecraftAccountsStore((s) => s.accounts)
  const activeAccountId = useMinecraftAccountsStore((s) => s.activeAccountId)

  const targetId = accountId ?? activeAccountId
  const account = accounts.find((a) => a.id === targetId) ?? getActiveAccount()

  return useQuery({
    queryKey: ['skin-profile', account?.id],
    queryFn: () => window.minecraft.getSkinProfile(account!.accessToken),
    enabled: !!account?.accessToken,
    staleTime: 5 * 60 * 1000,
  })
}

export function useUploadSkin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      accessToken,
      variant,
    }: {
      accessToken: string
      variant: 'classic' | 'slim'
    }) => window.minecraft.uploadSkin(accessToken, variant),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skin-profile'] })
    },
  })
}

export function useSetActiveCape() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      accessToken,
      capeId,
    }: {
      accessToken: string
      capeId: string | null
    }) => window.minecraft.setActiveCape(accessToken, capeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skin-profile'] })
    },
  })
}
