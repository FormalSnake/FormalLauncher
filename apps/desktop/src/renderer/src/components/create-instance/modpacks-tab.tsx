import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchBar } from '@/components/shared/search-bar'
import { ModCard } from '@/components/shared/mod-card'
import { useModrinthSearch, useModrinthVersions } from '@/hooks/use-modrinth'
import { useModpackInstall } from '@/hooks/use-modpack-install'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeftIcon, LoaderIcon, PackageIcon } from 'lucide-react'
import type { ModrinthSearchHit } from '@/lib/modrinth'

interface ModpacksTabProps {
  onCreated: () => void
}

export function ModpacksTab({ onCreated }: ModpacksTabProps) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<ModrinthSearchHit | null>(null)
  const [name, setName] = useState('')
  const [selectedVersion, setSelectedVersion] = useState('')
  const { installModpack, installing, progress, error } = useModpackInstall()

  const { data: searchData, isLoading: searching } = useModrinthSearch({
    query: search,
    projectType: 'modpack',
    limit: 20,
  })

  const { data: versions, isLoading: versionsLoading } = useModrinthVersions(
    selected?.project_id ?? '',
  )

  const handleSelect = (project: ModrinthSearchHit) => {
    setSelected(project)
    setName(project.title)
    setSelectedVersion('')
  }

  const handleInstall = async () => {
    if (!selected || !name.trim()) return

    const version = versions?.find((v) => v.id === selectedVersion) ?? versions?.[0]
    if (!version) return

    const file = version.files.find((f) => f.primary) ?? version.files[0]
    if (!file) return

    const result = await installModpack(file.url, name.trim(), {
      modpackProjectId: selected.project_id,
      modpackVersionId: version.id,
    })
    if (result) onCreated()
  }

  if (selected) {
    return (
      <div className="grid gap-4 py-4">
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => {
            setSelected(null)
            setSelectedVersion('')
          }}
        >
          <ArrowLeftIcon className="size-3" />
          Back to search
        </button>

        <div className="flex items-center gap-3">
          {selected.icon_url ? (
            <img src={selected.icon_url} alt="" className="size-10 rounded-lg" />
          ) : (
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <PackageIcon className="size-5 text-muted-foreground" />
            </div>
          )}
          <div>
            <p className="font-medium">{selected.title}</p>
            <p className="text-xs text-muted-foreground">by {selected.author}</p>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="modpack-name">Instance Name</Label>
          <Input
            id="modpack-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label>Version</Label>
          <Select
            value={selectedVersion || versions?.[0]?.id || ''}
            onValueChange={(v) => v && setSelectedVersion(v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={versionsLoading ? 'Loading...' : 'Select version'} />
            </SelectTrigger>
            <SelectContent>
              {versionsLoading && (
                <div className="flex items-center justify-center py-2">
                  <LoaderIcon className="size-4 animate-spin" />
                </div>
              )}
              {versions?.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.version_number} ({v.game_versions.join(', ')})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {progress && (
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>Downloading mods...</span>
              <span>{progress.current} / {progress.total}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          onClick={handleInstall}
          disabled={!name.trim() || installing || versionsLoading || !versions?.length}
        >
          {installing ? (
            <>
              <LoaderIcon className="mr-2 size-4 animate-spin" />
              Installing...
            </>
          ) : (
            'Install Modpack'
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-4 py-4">
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search modpacks..."
      />

      <div className="max-h-80 space-y-2 overflow-y-auto">
        {searching && (
          <div className="flex items-center justify-center py-8">
            <LoaderIcon className="size-5 animate-spin" />
          </div>
        )}

        {!searching && searchData?.hits.map((hit) => (
          <div key={hit.project_id} onClick={() => handleSelect(hit)} className="cursor-pointer">
            <ModCard variant="browse" project={hit} projectType="modpack" />
          </div>
        ))}

        {!searching && searchData?.hits.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <PackageIcon className="size-6" />
            <p className="text-sm">No modpacks found</p>
          </div>
        )}
      </div>
    </div>
  )
}
