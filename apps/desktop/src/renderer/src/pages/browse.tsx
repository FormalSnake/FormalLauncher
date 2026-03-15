import { useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { SearchBar } from '@/components/shared/search-bar'
import { ModCard } from '@/components/shared/mod-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { mockModrinthResults } from '@/data/mock'

type Category = 'mod' | 'resourcepack' | 'modpack'

export function BrowsePage() {
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<Category>('mod')

  const filtered = mockModrinthResults.filter(
    (p) =>
      p.category === tab &&
      p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <PageHeader title="Browse" description="Discover mods, resource packs, and modpacks from Modrinth" />

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
            {filtered.map((project) => (
              <ModCard key={project.id} variant="browse" project={project} />
            ))}
            {filtered.length === 0 && (
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
