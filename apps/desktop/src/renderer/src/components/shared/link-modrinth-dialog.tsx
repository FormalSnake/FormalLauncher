import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useInstancesStore } from '@/store/instances.store'
import { useModrinthSearch } from '@/hooks/use-modrinth'
import {
  getVersionFilesByHash,
  getProject,
  getProjectVersions,
} from '@/lib/modrinth'
import type { ModrinthSearchHit, ModrinthVersion } from '@/lib/modrinth'
import type { ModEntry, ResourcePackEntry } from '@formallauncher/shared'
import { IconLoader, IconCheck, IconMagnifier, IconCube, IconImage } from 'nucleo-pixel'

interface LinkModrinthDialogProps {
  instanceId: string
  item: ModEntry | ResourcePackEntry
  contentType: 'mod' | 'resourcepack'
  open: boolean
  onOpenChange: (open: boolean) => void
}

type LinkState =
  | { status: 'loading' }
  | { status: 'found'; projectName: string; projectIcon?: string; projectId: string; versionId: string; versionNumber: string }
  | { status: 'not-found' }
  | { status: 'linking' }
  | { status: 'linked' }

export function LinkModrinthDialog({
  instanceId,
  item,
  contentType,
  open,
  onOpenChange,
}: LinkModrinthDialogProps) {
  const [state, setState] = useState<LinkState>({ status: 'loading' })
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [selectedHit, setSelectedHit] = useState<ModrinthSearchHit | null>(null)
  const [matchingVersion, setMatchingVersion] = useState<ModrinthVersion | null>(null)
  const [loadingVersion, setLoadingVersion] = useState(false)

  const instance = useInstancesStore((s) => s.instances.find((i) => i.id === instanceId))

  const { data: searchResults, isLoading: searching } = useModrinthSearch({
    query: activeSearch,
    projectType: contentType === 'mod' ? 'mod' : 'resourcepack',
    limit: 10,
  })

  // Auto-detect on open via SHA1 hash lookup
  useEffect(() => {
    if (!open) return
    setState({ status: 'loading' })
    setSearchQuery('')
    setActiveSearch('')
    setSelectedHit(null)
    setMatchingVersion(null)

    const hash = item.projectId
    if (!/^[a-f0-9]{40}$/.test(hash)) {
      setState({ status: 'not-found' })
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const result = await getVersionFilesByHash([hash], 'sha1')
        if (cancelled) return
        const version = result[hash]
        if (version) {
          const project = await getProject(version.project_id)
          if (cancelled) return
          setState({
            status: 'found',
            projectName: project.title,
            projectIcon: project.icon_url,
            projectId: project.id,
            versionId: version.id,
            versionNumber: version.version_number,
          })
        } else {
          setState({ status: 'not-found' })
        }
      } catch {
        if (!cancelled) setState({ status: 'not-found' })
      }
    })()

    return () => { cancelled = true }
  }, [open, item.projectId])

  // When a search hit is selected, find the best compatible version
  useEffect(() => {
    if (!selectedHit || !instance) return
    setLoadingVersion(true)
    setMatchingVersion(null)

    let cancelled = false
    ;(async () => {
      try {
        const loaders = instance.modLoader === 'vanilla' ? undefined : [instance.modLoader]
        const versions = await getProjectVersions(selectedHit.project_id, {
          game_versions: [instance.minecraftVersion],
          loaders,
        })
        if (cancelled) return
        setMatchingVersion(versions.length > 0 ? versions[0] : null)
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingVersion(false)
      }
    })()

    return () => { cancelled = true }
  }, [selectedHit, instance])

  const handleLink = async (projectId: string, versionId: string, versionNumber: string, iconUrl?: string) => {
    setState({ status: 'linking' })
    const updatedEntry = {
      ...item,
      projectId,
      versionId,
      versionNumber,
      iconUrl: iconUrl || item.iconUrl,
    }

    if (contentType === 'mod') {
      // Remove old entry by hash, add new one with proper projectId
      useInstancesStore.getState().removeMod(instanceId, item.projectId)
      useInstancesStore.getState().addMod(instanceId, updatedEntry as ModEntry)
    } else {
      useInstancesStore.getState().removeResourcePack(instanceId, item.projectId)
      useInstancesStore.getState().addResourcePack(instanceId, updatedEntry as ResourcePackEntry)
    }

    setState({ status: 'linked' })
    setTimeout(() => onOpenChange(false), 1000)
  }

  const handleSearch = () => {
    setActiveSearch(searchQuery)
    setSelectedHit(null)
  }

  const FallbackIcon = contentType === 'mod' ? IconCube : IconImage

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link to Modrinth</DialogTitle>
        </DialogHeader>

        {state.status === 'loading' && (
          <div className="flex items-center justify-center py-8">
            <IconLoader className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {state.status === 'found' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Found a match on Modrinth for <span className="font-medium text-foreground">{item.name}</span>:
            </p>
            <div className="flex items-center gap-3 rounded-md border p-3">
              {state.projectIcon ? (
                <img src={state.projectIcon} alt="" className="size-10 rounded-md" />
              ) : (
                <div className="flex size-10 items-center justify-center rounded-md bg-muted">
                  <FallbackIcon className="size-5 text-muted-foreground" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium">{state.projectName}</p>
                <p className="text-xs text-muted-foreground">{state.versionNumber}</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => handleLink(state.projectId, state.versionId, state.versionNumber, state.projectIcon)}>
                Link
              </Button>
            </DialogFooter>
          </div>
        )}

        {state.status === 'not-found' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Could not auto-detect <span className="font-medium text-foreground">{item.name}</span> on Modrinth. Search manually:
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Search Modrinth..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button size="icon" variant="outline" onClick={handleSearch} disabled={!searchQuery}>
                <IconMagnifier className="size-4" />
              </Button>
            </div>

            {searching && (
              <div className="flex items-center justify-center py-4">
                <IconLoader className="size-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {searchResults && searchResults.hits.length > 0 && (
              <div className="max-h-60 space-y-1 overflow-y-auto">
                {searchResults.hits.map((hit) => (
                  <button
                    key={hit.project_id}
                    type="button"
                    className={`flex w-full items-center gap-3 rounded-md border p-2 text-left transition-colors hover:bg-accent ${
                      selectedHit?.project_id === hit.project_id ? 'border-primary bg-accent' : ''
                    }`}
                    onClick={() => setSelectedHit(hit)}
                  >
                    {hit.icon_url ? (
                      <img src={hit.icon_url} alt="" className="size-8 rounded-md" />
                    ) : (
                      <div className="flex size-8 items-center justify-center rounded-md bg-muted">
                        <FallbackIcon className="size-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{hit.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{hit.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchResults && searchResults.hits.length === 0 && activeSearch && (
              <p className="py-2 text-center text-sm text-muted-foreground">No results found.</p>
            )}

            {selectedHit && (
              <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={loadingVersion || !matchingVersion}
                  onClick={() => {
                    if (matchingVersion) {
                      handleLink(
                        selectedHit.project_id,
                        matchingVersion.id,
                        matchingVersion.version_number,
                        selectedHit.icon_url,
                      )
                    }
                  }}
                >
                  {loadingVersion ? (
                    <>
                      <IconLoader className="mr-2 size-4 animate-spin" />
                      Finding version...
                    </>
                  ) : matchingVersion ? (
                    'Link'
                  ) : (
                    'No compatible version'
                  )}
                </Button>
              </DialogFooter>
            )}
          </div>
        )}

        {state.status === 'linking' && (
          <div className="flex items-center justify-center py-8">
            <IconLoader className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {state.status === 'linked' && (
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            <IconCheck className="size-6 text-green-500" />
            <p className="text-sm font-medium">Linked successfully</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
