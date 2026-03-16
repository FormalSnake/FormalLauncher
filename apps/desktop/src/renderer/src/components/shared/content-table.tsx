import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import type { ModEntry, ResourcePackEntry } from '@formallauncher/shared'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { PackageIcon, ImageIcon, Trash2Icon, ArrowUpDownIcon } from 'lucide-react'

type ContentItem = ModEntry | ResourcePackEntry

interface ContentTableProps {
  items: ContentItem[]
  contentType: 'mod' | 'resourcepack'
  iconMap: Record<string, string>
  onToggle?: (item: ModEntry) => void
  onRemove: (item: ContentItem) => void
  onItemClick?: (item: ContentItem) => void
}

export function ContentTable({
  items,
  contentType,
  iconMap,
  onToggle,
  onRemove,
  onItemClick,
}: ContentTableProps) {
  const columns = useMemo<ColumnDef<ContentItem, unknown>[]>(() => {
    const FallbackIcon = contentType === 'mod' ? PackageIcon : ImageIcon

    const cols: ColumnDef<ContentItem, unknown>[] = [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Name
            <ArrowUpDownIcon className="ml-2 size-3.5" />
          </Button>
        ),
        cell: ({ row }) => {
          const item = row.original
          const iconUrl = item.iconUrl || iconMap[item.projectId]
          const isMod = 'enabled' in item
          return (
            <div className="flex items-center gap-3">
              {iconUrl ? (
                <img
                  src={iconUrl}
                  alt={item.name}
                  className="size-8 shrink-0 rounded-md"
                />
              ) : (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                  <FallbackIcon className="size-4 text-muted-foreground" />
                </div>
              )}
              <span
                className={`text-sm font-medium ${isMod && !(item as ModEntry).enabled ? 'text-muted-foreground line-through' : ''}`}
              >
                {item.name}
              </span>
            </div>
          )
        },
      },
    ]

    if (contentType === 'mod') {
      cols.push({
        id: 'enabled',
        header: 'Enabled',
        cell: ({ row }) => {
          const mod = row.original as ModEntry
          return (
            <Switch
              checked={mod.enabled}
              onCheckedChange={() => onToggle?.(mod)}
              onClick={(e) => e.stopPropagation()}
            />
          )
        },
        size: 80,
      })
    }

    cols.push({
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="size-8 p-0 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              onRemove(row.original)
            }}
          >
            <Trash2Icon className="size-4" />
          </Button>
        </div>
      ),
      size: 50,
    })

    return cols
  }, [contentType, iconMap, onToggle, onRemove])

  return <DataTable columns={columns} data={items} onRowClick={onItemClick} />
}
