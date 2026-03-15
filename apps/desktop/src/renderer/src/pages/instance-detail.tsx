import { useParams, useNavigate } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoaderBadge } from '@/components/shared/loader-badge'
import { ModCard } from '@/components/shared/mod-card'
import { mockInstances, mockMods } from '@/data/mock'
import { ArrowLeftIcon, PlayIcon, PlusIcon, PackageIcon } from 'lucide-react'

const mockResourcePacks = [
  { projectId: 'rp1', versionId: 'v1.0', name: 'Faithful 32x', enabled: true },
  { projectId: 'rp2', versionId: 'v2.1', name: 'Stay True', enabled: true },
  { projectId: 'rp3', versionId: 'v1.3', name: 'Default Dark Mode', enabled: false },
]

export function InstanceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const instance = mockInstances.find((i) => i.id === id)

  if (!instance) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Instance not found.</p>
        <Button variant="outline" onClick={() => navigate('/instances')}>
          Back to Instances
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 gap-1"
          onClick={() => navigate('/instances')}
        >
          <ArrowLeftIcon className="size-4" />
          Back
        </Button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {instance.name}
            </h1>
            <Badge variant="secondary">{instance.minecraftVersion}</Badge>
            <LoaderBadge loader={instance.modLoader} />
          </div>
          <Button className="gap-2">
            <PlayIcon className="size-4" />
            Play
          </Button>
        </div>
      </div>

      <Tabs defaultValue="mods">
        <TabsList>
          <TabsTrigger value="mods">Mods</TabsTrigger>
          <TabsTrigger value="resourcepacks">Resource Packs</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="mods" className="mt-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {instance.mods.length} mod{instance.mods.length !== 1 ? 's' : ''} installed
            </span>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => navigate('/browse')}>
              <PlusIcon className="size-4" />
              Add Mods
            </Button>
          </div>
          <div className="grid gap-2">
            {instance.mods.map((mod) => (
              <ModCard key={mod.projectId} variant="installed" mod={mod} />
            ))}
            {instance.mods.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <PackageIcon className="size-8" />
                <p className="text-sm">No mods installed.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="resourcepacks" className="mt-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {mockResourcePacks.length} resource packs
            </span>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => navigate('/browse')}>
              <PlusIcon className="size-4" />
              Add Resource Packs
            </Button>
          </div>
          <div className="grid gap-2">
            {mockResourcePacks.map((rp) => (
              <ModCard key={rp.projectId} variant="installed" mod={rp} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <div className="max-w-md space-y-6">
            <div className="grid gap-2">
              <Label>RAM Allocation (MB)</Label>
              <Slider
                defaultValue={[instance.ramMb ?? 4096]}
                min={1024}
                max={16384}
                step={512}
              />
              <span className="text-xs text-muted-foreground">
                {instance.ramMb ?? 4096} MB
              </span>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="jvm-args">JVM Arguments</Label>
              <Input
                id="jvm-args"
                defaultValue={instance.jvmArgs ?? ''}
                placeholder="-XX:+UseG1GC"
              />
            </div>
            <div className="grid gap-2">
              <Label>Minecraft Version</Label>
              <Select defaultValue={instance.minecraftVersion}>
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
            <Button>Save Settings</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
