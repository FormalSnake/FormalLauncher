import { useQuery } from '@tanstack/react-query'
import { searchProjects } from '@/lib/modrinth'

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
