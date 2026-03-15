import { useEffect, useState } from 'react'
import { SearchBar } from '@/components/shared/search-bar'
import { ModCard } from '@/components/shared/mod-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useModrinthSearch } from '@/hooks/use-modrinth'

type Category = 'mod' | 'resourcepack' | 'modpack'

export function BrowsePage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [tab, setTab] = useState<Category>('mod')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading, error } = useModrinthSearch({
    query: debouncedSearch,
    projectType: tab,
  })

  return (
    <div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as Category)}>
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
              <ModCard key={project.project_id} variant="browse" project={project} />
            ))}
            {data && data.hits.length === 0 && (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No results found.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
