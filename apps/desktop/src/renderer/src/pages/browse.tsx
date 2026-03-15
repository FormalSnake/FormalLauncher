import { useEffect, useState } from 'react'
import { SearchBar } from '@/components/shared/search-bar'
import { ModCard } from '@/components/shared/mod-card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useModrinthSearch } from '@/hooks/use-modrinth'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

type Category = 'mod' | 'resourcepack' | 'modpack'
const LIMIT = 20

export function BrowsePage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [tab, setTab] = useState<Category>('mod')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, tab])

  const offset = (page - 1) * LIMIT
  const { data, isLoading, error } = useModrinthSearch({
    query: debouncedSearch,
    projectType: tab,
    offset,
  })

  const totalPages = data ? Math.ceil(data.total_hits / LIMIT) : 0

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col">
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as Category)}
        className="flex flex-1 flex-col"
      >
        <div className="shrink-0">
          <TabsList className="mb-4">
            <TabsTrigger value="mod">Mods</TabsTrigger>
            <TabsTrigger value="resourcepack">Resource Packs</TabsTrigger>
            <TabsTrigger value="modpack">Modpacks</TabsTrigger>
          </TabsList>

          <div className="mb-4">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder={`Search ${tab}s...`}
            />
          </div>
        </div>

        <TabsContent value={tab} className="mt-0 flex-1 overflow-y-auto min-h-0">
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
              <ModCard key={project.project_id} variant="browse" project={project} />
            ))}
            {data && data.hits.length === 0 && (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No results found.
              </p>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeftIcon className="size-4" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
