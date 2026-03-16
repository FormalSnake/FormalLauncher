import { useState } from 'react'
import { InstanceCard } from '@/components/shared/instance-card'
import { SearchBar } from '@/components/shared/search-bar'
import { Button } from '@/components/ui/button'
import { CreateInstanceDialog } from '@/components/create-instance/create-instance-dialog'
import { useInstancesStore } from '@/store/instances.store'
import { PlusIcon } from 'lucide-react'

export function InstancesPage() {
  const { instances } = useInstancesStore()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)

  const filtered = instances.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button className="gap-2" onClick={() => setOpen(true)}>
          <PlusIcon className="size-4" />
          New Instance
        </Button>
        <CreateInstanceDialog open={open} onOpenChange={setOpen} />
      </div>

      <div className="mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search instances..."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((instance) => (
          <InstanceCard key={instance.id} instance={instance} />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-sm text-muted-foreground">
            {instances.length === 0
              ? 'No instances yet. Create your first one!'
              : 'No instances found.'}
          </p>
        )}
      </div>
    </div>
  )
}
