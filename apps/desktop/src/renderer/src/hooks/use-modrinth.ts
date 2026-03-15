import { useQuery } from '@tanstack/react-query'
import { searchProjects, getProject } from '@/lib/modrinth'

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
