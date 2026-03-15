const BASE_URL = 'https://api.modrinth.com/v2'
const HEADERS = { 'User-Agent': 'formallauncher/1.0.0 (github.com/formallauncher)' }

export interface ModrinthSearchHit {
  project_id: string
  project_type: string
  slug: string
  author: string
  title: string
  description: string
  categories: string[]
  display_categories: string[]
  versions: string[]
  downloads: number
  follows: number
  icon_url: string
  date_created: string
  date_modified: string
  latest_version: string
  license: string
  client_side: string
  server_side: string
  gallery: string[]
  featured_gallery: string | null
  color: number | null
}

export interface ModrinthProject {
  id: string
  slug: string
  project_type: string
  team: string
  title: string
  description: string
  body: string
  icon_url: string
  downloads: number
  followers: number
  categories: string[]
  versions: string[]
  license: { id: string; name: string; url: string | null }
  client_side: string
  server_side: string
  gallery: {
    url: string
    featured: boolean
    title: string | null
    description: string | null
    ordering: number
  }[]
  published: string
  updated: string
  source_url: string | null
  issues_url: string | null
  wiki_url: string | null
  discord_url: string | null
  donation_urls: { id: string; platform: string; url: string }[]
}

export interface ModrinthSearchResponse {
  hits: ModrinthSearchHit[]
  offset: number
  limit: number
  total_hits: number
}

export async function searchProjects(params: {
  query?: string
  facets?: string[][]
  index?: 'relevance' | 'downloads' | 'follows' | 'newest' | 'updated'
  limit?: number
  offset?: number
}): Promise<ModrinthSearchResponse> {
  const url = new URL(`${BASE_URL}/search`)

  if (params.query) url.searchParams.set('query', params.query)
  if (params.facets) url.searchParams.set('facets', JSON.stringify(params.facets))
  if (params.index) url.searchParams.set('index', params.index)
  if (params.limit !== undefined) url.searchParams.set('limit', String(params.limit))
  if (params.offset !== undefined) url.searchParams.set('offset', String(params.offset))

  const res = await fetch(url.toString(), { headers: HEADERS })
  if (!res.ok) throw new Error(`Modrinth API error: ${res.status}`)
  return res.json()
}

export async function getProject(idOrSlug: string): Promise<ModrinthProject> {
  const res = await fetch(`${BASE_URL}/project/${encodeURIComponent(idOrSlug)}`, {
    headers: HEADERS,
  })
  if (!res.ok) throw new Error(`Modrinth API error: ${res.status}`)
  return res.json()
}
