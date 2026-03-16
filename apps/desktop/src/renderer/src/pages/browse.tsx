import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router'
import { SearchBar } from '@/components/shared/search-bar'
import { ModCard } from '@/components/shared/mod-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Pagination } from '@/components/shared/pagination'
import { useModrinthSearch } from '@/hooks/use-modrinth'

type Category = 'mod' | 'resourcepack' | 'modpack'
const LIMIT = 20
const validTabs: Category[] = ['mod', 'resourcepack', 'modpack']

export function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (validTabs.includes(searchParams.get('tab') as Category)
    ? searchParams.get('tab')
    : 'mod') as Category
  const page = Math.max(1, Number(searchParams.get('page')) || 1)

  const setTab = useCallback(
    (t: Category) => setSearchParams({ tab: t, page: '1' }, { replace: true }),
    [setSearchParams],
  )
  const setPage = useCallback(
    (p: number | ((prev: number) => number)) => {
      const next = typeof p === 'function' ? p(page) : p
      setSearchParams({ tab, page: String(next) }, { replace: true })
    },
    [setSearchParams, tab, page],
  )

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const offset = (page - 1) * LIMIT
  const { data, isLoading, error } = useModrinthSearch({
    query: debouncedSearch,
    projectType: tab,
    offset,
  })

  const totalPages = data ? Math.ceil(data.total_hits / LIMIT) : 0

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v as Category)}
    >
      <div className="sticky top-0 z-10 -mx-6 -mt-6 bg-background px-6 pt-6 pb-4">
        <TabsList className="mb-4">
          <TabsTrigger value="mod">Mods</TabsTrigger>
          <TabsTrigger value="resourcepack">Resource Packs</TabsTrigger>
          <TabsTrigger value="modpack">Modpacks</TabsTrigger>
        </TabsList>

        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={`Search ${tab}s...`}
        />
      </div>

      <TabsContent value={tab} className="mt-0">
        <div className="grid gap-2">
          {isLoading && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Loading...
            </p>
          )}
          {error && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Failed to load results. Please try again.
            </p>
          )}
          {data?.hits.map((project) => (
            <ModCard key={project.project_id} variant="browse" project={project} projectType={tab} />
          ))}
          {data && data.hits.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No results found.
            </p>
          )}
        </div>

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </TabsContent>
    </Tabs>
  )
}
