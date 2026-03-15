import { useState } from 'react'
import { InstanceCard } from '@/components/shared/instance-card'
import { SearchBar } from '@/components/shared/search-bar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { useInstancesStore } from '@/store/instances.store'
import { useVersions } from '@/hooks/use-versions'
import { PlusIcon, LoaderIcon } from 'lucide-react'

export function InstancesPage() {
  const { instances, addInstance } = useInstancesStore()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [version, setVersion] = useState('')
  const [ramMb, setRamMb] = useState(4096)
  const { versions, latest, isLoading: versionsLoading } = useVersions('release')

  const filtered = instances.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  )

  const handleCreate = () => {
    if (!name.trim() || !version) return
    addInstance({
      id: crypto.randomUUID(),
      name: name.trim(),
      minecraftVersion: version,
      modLoader: 'vanilla',
      mods: [],
      ramMb,
    })
    setOpen(false)
    setName('')
    setVersion('')
    setRamMb(4096)
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="gap-2" />}>
            <PlusIcon className="size-4" />
            New Instance
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Instance</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="My Instance"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Minecraft Version</Label>
                <Select
                  value={version}
                  onValueChange={setVersion}
                  defaultValue={latest?.release}
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
                    {versions.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>RAM (MB)</Label>
                <Slider
                  value={[ramMb]}
                  onValueChange={(v) => setRamMb(v[0])}
                  min={1024}
                  max={16384}
                  step={512}
                />
                <span className="text-xs text-muted-foreground">{ramMb} MB</span>
              </div>
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Cancel
              </DialogClose>
              <Button onClick={handleCreate} disabled={!name.trim() || !version}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search instances..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
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
