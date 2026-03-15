import { useState, useEffect } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { useInstancesStore } from '@/store/instances.store'
import { useSettingsStore } from '@/store/settings.store'
import { useVersions } from '@/hooks/use-versions'
import { PlusIcon, LoaderIcon, ImportIcon, FolderOpenIcon } from 'lucide-react'

type ModLoaderChoice = 'vanilla' | 'fabric'
type PrismScanResult = Awaited<ReturnType<typeof window.minecraft.scanPrismInstances>>
type PrismInstanceInfo = PrismScanResult['instances'][number]

export function InstancesPage() {
  const { instances, addInstance } = useInstancesStore()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [version, setVersion] = useState('')
  const [ramMb, setRamMb] = useState(4096)
  const [modLoader, setModLoader] = useState<ModLoaderChoice>('vanilla')
  const [fabricVersions, setFabricVersions] = useState<{ version: string; stable: boolean }[]>([])
  const [fabricVersion, setFabricVersion] = useState('')
  const [fabricLoading, setFabricLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const { versions, latest, isLoading: versionsLoading } = useVersions('release')

  // Prism import state
  const [importOpen, setImportOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [prismInstances, setPrismInstances] = useState<PrismInstanceInfo[]>([])
  const [prismPath, setPrismPath] = useState<string | null>(null)
  const [selectedImports, setSelectedImports] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<string | null>(null)

  const handleOpenImport = async () => {
    setImportOpen(true)
    setScanning(true)
    setPrismInstances([])
    setSelectedImports(new Set())
    setImportStatus(null)
    try {
      const result = await window.minecraft.scanPrismInstances()
      setPrismInstances(result.instances)
      setPrismPath(result.path)
      if (result.found) {
        setSelectedImports(new Set(result.instances.map((i) => i.dirName)))
      }
    } catch (err) {
      console.error('Failed to scan Prism instances:', err)
    } finally {
      setScanning(false)
    }
  }

  const handleBrowsePrism = async () => {
    setScanning(true)
    try {
      const result = await window.minecraft.selectPrismDirectory()
      setPrismInstances(result.instances)
      setPrismPath(result.path)
      if (result.found) {
        setSelectedImports(new Set(result.instances.map((i) => i.dirName)))
      }
    } catch (err) {
      console.error('Failed to browse Prism directory:', err)
    } finally {
      setScanning(false)
    }
  }

  const toggleImportSelection = (dirName: string) => {
    setSelectedImports((prev) => {
      const next = new Set(prev)
      if (next.has(dirName)) next.delete(dirName)
      else next.add(dirName)
      return next
    })
  }

  const toggleAllImports = () => {
    if (selectedImports.size === prismInstances.length) {
      setSelectedImports(new Set())
    } else {
      setSelectedImports(new Set(prismInstances.map((i) => i.dirName)))
    }
  }

  const handleImport = async () => {
    if (!prismPath || selectedImports.size === 0) return
    setImporting(true)
    const gameDir = useSettingsStore.getState().gameDirectory
    const selected = prismInstances.filter((i) => selectedImports.has(i.dirName))

    for (let idx = 0; idx < selected.length; idx++) {
      const inst = selected[idx]
      setImportStatus(`Importing ${inst.name} (${idx + 1}/${selected.length})...`)
      try {
        const imported = await window.minecraft.importPrismInstance(prismPath, inst.dirName, gameDir)
        addInstance(imported)
      } catch (err) {
        console.error(`Failed to import ${inst.name}:`, err)
      }
    }

    setImporting(false)
    setImportStatus(null)
    setImportOpen(false)
  }

  const filtered = instances.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  )

  // Fetch Fabric loader versions when mod loader or MC version changes
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

      // Create instance directories
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

      setOpen(false)
      setName('')
      setVersion('')
      setRamMb(4096)
      setModLoader('vanilla')
      setFabricVersion('')
    } catch (err) {
      console.error('Failed to create instance:', err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
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
                  onValueChange={(v) => v && setVersion(v)}
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
                          <LoaderIcon className="size-4 animate-spin" />
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
                    <LoaderIcon className="mr-2 size-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button variant="outline" className="gap-2" onClick={handleOpenImport}>
          <ImportIcon className="size-4" />
          Import from Prism
        </Button>

        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Import from Prism Launcher</DialogTitle>
            </DialogHeader>

            {scanning && (
              <div className="flex items-center justify-center py-8">
                <LoaderIcon className="size-5 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">Scanning for instances...</span>
              </div>
            )}

            {!scanning && prismInstances.length === 0 && (
              <div className="py-6 text-center">
                <p className="mb-4 text-sm text-muted-foreground">
                  No Prism Launcher instances found at the default location.
                </p>
                <Button variant="outline" className="gap-2" onClick={handleBrowsePrism}>
                  <FolderOpenIcon className="size-4" />
                  Browse...
                </Button>
              </div>
            )}

            {!scanning && prismInstances.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={toggleAllImports}
                  >
                    {selectedImports.size === prismInstances.length ? 'Deselect all' : 'Select all'}
                  </button>
                  <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={handleBrowsePrism}>
                    <FolderOpenIcon className="size-3" />
                    Change folder
                  </Button>
                </div>
                <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
                  {prismInstances.map((inst) => (
                    <label
                      key={inst.dirName}
                      className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={selectedImports.has(inst.dirName)}
                        onCheckedChange={() => toggleImportSelection(inst.dirName)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{inst.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {inst.minecraftVersion}
                          {inst.modLoader !== 'vanilla' && ` · ${inst.modLoader}${inst.modLoaderVersion ? ` ${inst.modLoaderVersion}` : ''}`}
                          {inst.modCount > 0 && ` · ${inst.modCount} mod${inst.modCount !== 1 ? 's' : ''}`}
                          {inst.resourcePackCount > 0 && ` · ${inst.resourcePackCount} pack${inst.resourcePackCount !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </>
            )}

            {importing && importStatus && (
              <div className="flex items-center gap-2 py-2">
                <LoaderIcon className="size-4 animate-spin" />
                <span className="text-sm text-muted-foreground">{importStatus}</span>
              </div>
            )}

            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Cancel
              </DialogClose>
              <Button
                onClick={handleImport}
                disabled={selectedImports.size === 0 || importing || scanning}
              >
                {importing ? (
                  <>
                    <LoaderIcon className="mr-2 size-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  `Import Selected (${selectedImports.size})`
                )}
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
