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
import { PlayIcon, MoreVerticalIcon, CopyIcon, TrashIcon, PencilIcon } from 'lucide-react'

interface InstanceCardProps {
  instance: Instance
}

export function InstanceCard({ instance }: InstanceCardProps) {
  const navigate = useNavigate()

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-card/80"
      onClick={() => navigate(`/instances/${instance.id}`)}
    >
      <CardHeader>
        <CardTitle className="truncate">{instance.name}</CardTitle>
        <CardAction>
          <div className="flex items-center gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-primary"
              onClick={(e) => {
                e.stopPropagation()
              }}
            >
              <PlayIcon className="size-4" />
            </Button>
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
                <MoreVerticalIcon className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <PencilIcon className="size-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <CopyIcon className="size-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  <TrashIcon className="size-4" />
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
          <span className="text-xs text-muted-foreground">
            {instance.mods.length} mod{instance.mods.length !== 1 ? 's' : ''}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
