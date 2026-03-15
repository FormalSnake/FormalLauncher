import { useQuery } from '@tanstack/react-query'
import { searchProjects, getProject, getProjects, getProjectVersions, getVersion } from '@/lib/modrinth'

export function useModrinthSearch(params: {
  query: string
  projectType: 'mod' | 'resourcepack' | 'modpack'
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: ['modrinth', 'search', params],
    queryFn: () =>
      searchProjects({
        query: params.query || undefined,
        facets: [['project_type:' + params.projectType]],
        limit: params.limit ?? 20,
        offset: params.offset,
      }),
  })
}

export function useModrinthProject(idOrSlug: string) {
  return useQuery({
    queryKey: ['modrinth', 'project', idOrSlug],
    queryFn: () => getProject(idOrSlug),
    enabled: !!idOrSlug,
  })
}

export function useModrinthVersions(
  projectId: string,
  params?: { gameVersions?: string[]; loaders?: string[] },
) {
  return useQuery({
    queryKey: ['modrinth', 'versions', projectId, params],
    queryFn: () =>
      getProjectVersions(projectId, {
        game_versions: params?.gameVersions,
        loaders: params?.loaders,
      }),
    enabled: !!projectId,
  })
}

export function useModrinthProjects(ids: string[]) {
  const sortedIds = [...ids].sort()
  return useQuery({
    queryKey: ['modrinth', 'projects', sortedIds],
    queryFn: () => getProjects(sortedIds),
    enabled: sortedIds.length > 0,
  })
}

export function useModrinthVersion(versionId: string) {
  return useQuery({
    queryKey: ['modrinth', 'version', versionId],
    queryFn: () => getVersion(versionId),
    enabled: !!versionId,
  })
}
