import { useState, useEffect } from 'react'
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
import { DialogFooter, DialogClose } from '@/components/ui/dialog'
import { useInstancesStore } from '@/store/instances.store'
import { useSettingsStore } from '@/store/settings.store'
import { useVersions } from '@/hooks/use-versions'
import { IconLoader } from 'nucleo-pixel'

type ModLoaderChoice = 'vanilla' | 'fabric'

interface CustomTabProps {
  onCreated: () => void
}

export function CustomTab({ onCreated }: CustomTabProps) {
  const { addInstance } = useInstancesStore()
  const [name, setName] = useState('')
  const [version, setVersion] = useState('')
  const [ramMb, setRamMb] = useState(4096)
  const [modLoader, setModLoader] = useState<ModLoaderChoice>('vanilla')
  const [fabricVersions, setFabricVersions] = useState<{ version: string; stable: boolean }[]>([])
  const [fabricVersion, setFabricVersion] = useState('')
  const [fabricLoading, setFabricLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const { versions, latest, isLoading: versionsLoading } = useVersions('release')

  useEffect(() => {
    if (modLoader !== 'fabric' || !version) {
      setFabricVersions([])
      setFabricVersion('')
      return
    }
    setFabricLoading(true)
    window.minecraft
      .getFabricVersions(version)
      .then((loaders) => {
        setFabricVersions(loaders)
        const stable = loaders.find((l) => l.stable)
        setFabricVersion(stable?.version ?? loaders[0]?.version ?? '')
      })
      .catch(() => setFabricVersions([]))
      .finally(() => setFabricLoading(false))
  }, [modLoader, version])

  const handleCreate = async () => {
    if (!name.trim() || !version) return
    setCreating(true)

    try {
      const gameDir = useSettingsStore.getState().gameDirectory
      const instanceId = crypto.randomUUID()

      await window.minecraft.ensureInstanceDirs(gameDir, instanceId)

      let effectiveVersionId: string | undefined
      let modLoaderVersion: string | undefined

      if (modLoader === 'fabric') {
        effectiveVersionId = await window.minecraft.installFabric(
          gameDir,
          version,
          fabricVersion || undefined,
        )
        modLoaderVersion = fabricVersion
      }

      addInstance({
        id: instanceId,
        name: name.trim(),
        minecraftVersion: version,
        modLoader,
        modLoaderVersion,
        effectiveVersionId,
        mods: [],
        resourcePacks: [],
        ramMb,
      })

      onCreated()
    } catch (err) {
      console.error('Failed to create instance:', err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="custom-name">Name</Label>
          <Input
            id="custom-name"
            placeholder="My Instance"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label>Minecraft Version</Label>
          <Select
            value={version}
            onValueChange={(v) => v && setVersion(v)}
            defaultValue={latest?.release}
          >
            <SelectTrigger>
              <SelectValue placeholder={versionsLoading ? 'Loading...' : 'Select version'} />
            </SelectTrigger>
            <SelectContent>
              {versionsLoading && (
                <div className="flex items-center justify-center py-2">
                  <IconLoader className="size-4 animate-spin" />
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
          <Label>Mod Loader</Label>
          <Select
            value={modLoader}
            onValueChange={(v) => setModLoader(v as ModLoaderChoice)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vanilla">Vanilla</SelectItem>
              <SelectItem value="fabric">Fabric</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {modLoader === 'fabric' && version && (
          <div className="grid gap-2">
            <Label>Fabric Loader Version</Label>
            <Select
              value={fabricVersion}
              onValueChange={(v) => v && setFabricVersion(v)}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={fabricLoading ? 'Loading...' : 'Select version'}
                />
              </SelectTrigger>
              <SelectContent>
                {fabricLoading && (
                  <div className="flex items-center justify-center py-2">
                    <IconLoader className="size-4 animate-spin" />
                  </div>
                )}
                {fabricVersions.map((v) => (
                  <SelectItem key={v.version} value={v.version}>
                    {v.version} {v.stable ? '(stable)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="grid gap-2">
          <Label>RAM (MB)</Label>
          <Slider
            value={[ramMb]}
            onValueChange={(v) => setRamMb(Array.isArray(v) ? v[0] : v)}
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
        <Button
          onClick={handleCreate}
          disabled={!name.trim() || !version || creating}
        >
          {creating ? (
            <>
              <IconLoader className="mr-2 size-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create'
          )}
        </Button>
      </DialogFooter>
    </>
  )
}
