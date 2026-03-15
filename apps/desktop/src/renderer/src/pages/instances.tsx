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
import { mockInstances } from '@/data/mock'
import { PlusIcon } from 'lucide-react'

export function InstancesPage() {
  const [search, setSearch] = useState('')

  const filtered = mockInstances.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <Dialog>
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
                <Input id="name" placeholder="My Instance" />
              </div>
              <div className="grid gap-2">
                <Label>Minecraft Version</Label>
                <Select defaultValue="1.21.4">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1.21.4">1.21.4</SelectItem>
                    <SelectItem value="1.21.3">1.21.3</SelectItem>
                    <SelectItem value="1.20.4">1.20.4</SelectItem>
                    <SelectItem value="1.20.1">1.20.1</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Mod Loader</Label>
                <Select defaultValue="fabric">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fabric">Fabric</SelectItem>
                    <SelectItem value="forge">Forge</SelectItem>
                    <SelectItem value="quilt">Quilt</SelectItem>
                    <SelectItem value="neoforge">NeoForge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>RAM (MB)</Label>
                <Slider defaultValue={[4096]} min={1024} max={16384} step={512} />
                <span className="text-xs text-muted-foreground">4096 MB</span>
              </div>
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Cancel
              </DialogClose>
              <Button>Create</Button>
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
            No instances found.
          </p>
        )}
      </div>
    </div>
  )
}
