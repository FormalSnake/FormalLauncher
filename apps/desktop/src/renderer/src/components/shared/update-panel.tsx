import { Button } from '@/components/ui/button'
import { useUpdateCheck } from '@/hooks/use-update-check'
import type { UpdateInfo } from '@/hooks/use-update-check'
import {
  IconArrowRotateClockwise,
  IconLoader,
  IconCircleArrowUp,
  IconTriangleWarning,
  IconCube,
  IconImage,
  IconBox2,
} from 'nucleo-pixel'

interface UpdatePanelProps {
  instanceId: string
}

function TypeIcon({ type }: { type: UpdateInfo['type'] }) {
  if (type === 'mod') return <IconCube className="size-4 text-muted-foreground" />
  if (type === 'resourcepack') return <IconImage className="size-4 text-muted-foreground" />
  return <IconBox2 className="size-4 text-muted-foreground" />
}

export function UpdatePanel({ instanceId }: UpdatePanelProps) {
  const {
    checkForUpdates,
    updates,
    checking,
    updateItem,
    updateAll,
    updating,
    updateProgress,
  } = useUpdateCheck(instanceId)

  return (
    <div className="rounded-md border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Updates</h3>
        <div className="flex items-center gap-2">
          {updates.length > 1 && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={updateAll}
              disabled={updating || checking}
            >
              <IconCircleArrowUp className="size-4" />
              Update All ({updates.filter((u) => u.type !== 'modpack').length})
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={checkForUpdates}
            disabled={checking || updating}
          >
            {checking ? (
              <IconLoader className="size-4 animate-spin" />
            ) : (
              <IconArrowRotateClockwise className="size-4" />
            )}
            {checking ? 'Checking...' : 'Check for Updates'}
          </Button>
        </div>
      </div>

      {updateProgress && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Updating...</span>
            <span>{updateProgress.current} / {updateProgress.total}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(updateProgress.current / updateProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {updates.length > 0 && (
        <div className="mt-3 space-y-2">
          {updates.some((u) => u.type === 'modpack') && (
            <div className="flex items-center gap-2 rounded-md bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
              <IconTriangleWarning className="size-4 shrink-0" />
              Modpack updates will replace all mods in this instance.
            </div>
          )}
          {updates.map((update) => (
            <div
              key={`${update.type}-${update.projectId}`}
              className="flex items-center gap-3 rounded-md border p-2"
            >
              <TypeIcon type={update.type} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{update.name}</p>
                <p className="text-xs text-muted-foreground">
                  {update.latestVersionNumber}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateItem(update)}
                disabled={updating}
              >
                Update
              </Button>
            </div>
          ))}
        </div>
      )}

      {!checking && updates.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Click "Check for Updates" to scan for newer versions.
        </p>
      )}
    </div>
  )
}
