import { useNavigate } from 'react-router'
import type { Instance } from '@formallauncher/shared'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LoaderBadge } from '@/components/shared/loader-badge'
import { useInstancesStore } from '@/store/instances.store'
import { useMinecraftAccountsStore } from '@/store/minecraft-accounts.store'
import { useGameStore } from '@/store/game.store'
import { useSettingsStore } from '@/store/settings.store'
import { useLaunch } from '@/hooks/use-launch'
import {
  IconMediaPlay,
  IconMediaStop,
  IconDotsVertical,
  IconTrash,
  IconPencil,
  IconLoader,
  IconFolderOpen,
} from 'nucleo-pixel'

interface InstanceCardProps {
  instance: Instance
}

export function InstanceCard({ instance }: InstanceCardProps) {
  const navigate = useNavigate()
  const gameDirectory = useSettingsStore((s) => s.gameDirectory)
  const removeInstance = useInstancesStore((s) => s.removeInstance)
  const activeAccount = useMinecraftAccountsStore((s) => s.getActiveAccount())
  const { launchingInstanceId, runningInstanceId } = useGameStore()
  const { launch, stop } = useLaunch()

  const isThisLaunching = launchingInstanceId === instance.id
  const isThisRunning = runningInstanceId === instance.id
  const isBusy = !!launchingInstanceId || !!runningInstanceId

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!activeAccount) {
      navigate('/accounts')
      return
    }
    launch(instance.id)
  }

  const handleDelete = () => {
    removeInstance(instance.id)
  }

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-card/80"
      onClick={() => navigate(`/instances/${instance.id}`)}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 truncate">
          {instance.iconUrl && (
            <img src={instance.iconUrl} alt="" className="size-5 rounded-sm" />
          )}
          {instance.name}
        </CardTitle>
        <CardAction>
          <div className="flex items-center gap-1">
            {isThisRunning ? (
              <Button
                size="icon-sm"
                variant="ghost"
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  stop()
                }}
              >
                <IconMediaStop className="size-4" />
              </Button>
            ) : (
              <Button
                size="icon-sm"
                variant="ghost"
                className="text-primary"
                onClick={handlePlay}
                disabled={isBusy}
              >
                {isThisLaunching ? (
                  <IconLoader className="size-4 animate-spin" />
                ) : (
                  <IconMediaPlay className="size-4" />
                )}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={(e) => e.stopPropagation()}
                  />
                }
              >
                <IconDotsVertical className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/instances/${instance.id}`)
                  }}
                >
                  <IconPencil className="size-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    window.minecraft.showInFolder(`${gameDirectory}/instances/${instance.id}`)
                  }}
                >
                  <IconFolderOpen className="size-4" />
                  <span className="whitespace-nowrap">Show in Folder</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete()
                  }}
                >
                  <IconTrash className="size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{instance.minecraftVersion}</Badge>
          <LoaderBadge loader={instance.modLoader} />
          {instance.mods.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {instance.mods.length} mod{instance.mods.length !== 1 ? 's' : ''}
            </span>
          )}
          {isThisRunning && (
            <Badge variant="outline" className="bg-green-500/15 text-green-400">
              Running
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
