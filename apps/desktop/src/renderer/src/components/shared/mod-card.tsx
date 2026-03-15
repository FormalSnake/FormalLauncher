import type { ModEntry } from '@formallauncher/shared'
import type { ModrinthSearchHit } from '@/lib/modrinth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { DownloadIcon, PackageIcon } from 'lucide-react'

function formatDownloads(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toString()
}

interface InstalledModCardProps {
  variant: 'installed'
  mod: ModEntry
}

interface BrowseModCardProps {
  variant: 'browse'
  project: ModrinthSearchHit
}

type ModCardProps = InstalledModCardProps | BrowseModCardProps

export function ModCard(props: ModCardProps) {
  if (props.variant === 'installed') {
    return (
      <Card size="sm">
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PackageIcon className="size-5 text-muted-foreground" />
            <span className="text-sm font-medium">{props.mod.name}</span>
          </div>
          <Switch checked={props.mod.enabled} />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-4">
        {props.project.icon_url ? (
          <img
            src={props.project.icon_url}
            alt={props.project.title}
            className="size-10 shrink-0 rounded-lg"
          />
        ) : (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <PackageIcon className="size-5 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{props.project.title}</span>
            <span className="text-xs text-muted-foreground">
              by {props.project.author}
            </span>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {props.project.description}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <DownloadIcon className="size-3" />
            {formatDownloads(props.project.downloads)}
          </span>
          <Button size="sm">Install</Button>
        </div>
      </CardContent>
    </Card>
  )
}
