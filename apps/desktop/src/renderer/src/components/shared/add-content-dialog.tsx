import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useModrinthSearch, useModrinthVersions } from '@/hooks/use-modrinth'
import { useContentInstall } from '@/hooks/use-mod-install'
import type { Instance } from '@formallauncher/shared'
import {
  LoaderIcon,
  CheckIcon,
  PackageIcon,
  DownloadIcon,
  SearchIcon,
} from 'lucide-react'

interface AddContentDialogProps {
  instance: Instance
  contentType: 'mod' | 'resourcepack'
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddContentDialog({
  instance,
  contentType,
  open,
  onOpenChange,
}: AddContentDialogProps) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [installingId, setInstallingId] = useState<string | null>(null)
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set())
  const { installMod, installResourcePack } = useContentInstall()

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading } = useModrinthSearch({
    query: debouncedSearch,
    projectType: contentType,
  })

  const alreadyInstalled = new Set(
    contentType === 'mod'
      ? instance.mods.map((m) => m.projectId)
      : instance.resourcePacks.map((r) => r.projectId),
  )

  const handleInstall = async (projectId: string, projectName: string) => {
    setInstallingId(projectId)
    if (contentType === 'mod') {
      await installMod(instance.id, projectId, projectName)
    } else {
      await installResourcePack(instance.id, projectId, projectName)
    }
    setInstallingId(null)
    setInstalledIds((prev) => new Set(prev).add(projectId))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Add {contentType === 'mod' ? 'Mods' : 'Resource Packs'}
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={`Search ${contentType}s...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="max-h-[50vh] space-y-1 overflow-y-auto">
          {isLoading && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading...
            </p>
          )}
          {data?.hits.map((project) => {
            const isInstalled =
              alreadyInstalled.has(project.project_id) ||
              installedIds.has(project.project_id)
            const isCurrentlyInstalling = installingId === project.project_id

            return (
              <div
                key={project.project_id}
                className="flex items-center gap-3 rounded-md p-2 hover:bg-accent/50"
              >
                {project.icon_url ? (
                  <img
                    src={project.icon_url}
                    alt={project.title}
                    className="size-8 shrink-0 rounded-md"
                  />
                ) : (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <PackageIcon className="size-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{project.title}</div>
                  <p className="truncate text-xs text-muted-foreground">
                    {project.description}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={isInstalled ? 'outline' : 'default'}
                  disabled={isInstalled || isCurrentlyInstalling}
                  onClick={() =>
                    handleInstall(project.project_id, project.title)
                  }
                >
                  {isCurrentlyInstalling ? (
                    <LoaderIcon className="size-4 animate-spin" />
                  ) : isInstalled ? (
                    <CheckIcon className="size-4" />
                  ) : (
                    <DownloadIcon className="size-4" />
                  )}
                </Button>
              </div>
            )
          })}
          {data && data.hits.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No results found.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
