import { useState } from 'react'
import type { ModEntry } from '@formallauncher/shared'
import type { ModrinthSearchHit } from '@/lib/modrinth'
import { useNavigate } from 'react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { InstallDialog } from '@/components/shared/install-dialog'
import { IconDownload, IconCube, IconTrash2 } from 'nucleo-pixel'

function formatDownloads(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toString()
}

interface InstalledModCardProps {
  variant: 'installed'
  mod: ModEntry
  onToggle?: () => void
  onRemove?: () => void
}

interface BrowseModCardProps {
  variant: 'browse'
  project: ModrinthSearchHit
  projectType?: 'mod' | 'resourcepack' | 'modpack'
}

type ModCardProps = InstalledModCardProps | BrowseModCardProps

export function ModCard(props: ModCardProps) {
  if (props.variant === 'installed') {
    return (
      <Card size="sm">
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <IconCube className="size-5 text-muted-foreground" />
            <span
              className={`text-sm font-medium ${!props.mod.enabled ? 'text-muted-foreground line-through' : ''}`}
            >
              {props.mod.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {props.onRemove && (
              <Button
                variant="ghost"
                size="sm"
                className="size-8 p-0 text-muted-foreground hover:text-destructive"
                onClick={props.onRemove}
              >
                <IconTrash2 className="size-4" />
              </Button>
            )}
            <Switch
              checked={props.mod.enabled}
              onCheckedChange={props.onToggle}
            />
          </div>
        </CardContent>
      </Card>
    )
  }

  return <BrowseCard {...props} />
}

function BrowseCard({
  project,
  projectType,
}: BrowseModCardProps) {
  const navigate = useNavigate()
  const [installOpen, setInstallOpen] = useState(false)
  const type = projectType ?? (project.project_type as 'mod' | 'resourcepack' | 'modpack')

  return (
    <>
      <Card
        size="sm"
        className="cursor-pointer transition-colors hover:bg-accent/50"
        onClick={() => navigate(`/browse/${project.slug}`)}
      >
        <CardContent className="flex items-center gap-4">
          {project.icon_url ? (
            <img
              src={project.icon_url}
              alt={project.title}
              className="size-10 shrink-0 rounded-lg"
            />
          ) : (
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <IconCube className="size-5 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{project.title}</span>
              <span className="text-xs text-muted-foreground">
                by {project.author}
              </span>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {project.description}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <IconDownload className="size-3" />
              {formatDownloads(project.downloads)}
            </span>
            {type !== 'modpack' && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setInstallOpen(true)
                }}
              >
                Install
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {type !== 'modpack' && (
        <InstallDialog
          projectId={project.project_id}
          projectName={project.title}
          projectType={type === 'resourcepack' ? 'resourcepack' : 'mod'}
          iconUrl={project.icon_url}
          open={installOpen}
          onOpenChange={setInstallOpen}
        />
      )}
    </>
  )
}
