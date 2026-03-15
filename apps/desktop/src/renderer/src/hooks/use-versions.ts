import { useQuery } from '@tanstack/react-query'
import type { VersionManifestEntry } from '@/types/minecraft'

export function useVersions(filter: 'release' | 'snapshot' | 'all' = 'release') {
  const query = useQuery({
    queryKey: ['minecraft-versions'],
    queryFn: () => window.minecraft.getVersions(),
    staleTime: 5 * 60 * 1000,
  })

  const versions: VersionManifestEntry[] =
    query.data?.versions.filter((v) =>
      filter === 'all' ? true : v.type === filter,
    ) ?? []

  return {
    versions,
    latest: query.data?.latest ?? null,
    isLoading: query.isLoading,
    error: query.error,
  }
}
