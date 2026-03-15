import { useQuery } from '@tanstack/react-query'

export function useProxiedImage(url: string | undefined) {
  return useQuery({
    queryKey: ['proxied-image', url],
    queryFn: () => window.minecraft.fetchImage(url!),
    enabled: !!url,
    staleTime: 10 * 60 * 1000,
  })
}
