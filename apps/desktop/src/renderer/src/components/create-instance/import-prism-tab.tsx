import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DialogFooter, DialogClose } from '@/components/ui/dialog'
import { useInstancesStore } from '@/store/instances.store'
import { useSettingsStore } from '@/store/settings.store'
import { LoaderIcon, FolderOpenIcon } from 'lucide-react'

type PrismScanResult = Awaited<ReturnType<typeof window.minecraft.scanPrismInstances>>
type PrismInstanceInfo = PrismScanResult['instances'][number]

interface ImportPrismTabProps {
  onCreated: () => void
}

export function ImportPrismTab({ onCreated }: ImportPrismTabProps) {
  const { addInstance } = useInstancesStore()
  const [scanning, setScanning] = useState(false)
  const [scanned, setScanned] = useState(false)
  const [prismInstances, setPrismInstances] = useState<PrismInstanceInfo[]>([])
  const [prismPath, setPrismPath] = useState<string | null>(null)
  const [selectedImports, setSelectedImports] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<string | null>(null)

  const handleScan = async () => {
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
      setScanned(true)
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
      setScanned(true)
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
    onCreated()
  }

  if (!scanned && !scanning) {
    return (
      <div className="flex flex-col items-center gap-4 py-10">
        <p className="text-sm text-muted-foreground">
          Scan for Prism Launcher instances to import.
        </p>
        <div className="flex gap-2">
          <Button onClick={handleScan}>
            Scan Default Location
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleBrowsePrism}>
            <FolderOpenIcon className="size-4" />
            Browse...
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      {scanning && (
        <div className="flex items-center justify-center py-8">
          <LoaderIcon className="size-5 animate-spin" />
          <span className="ml-2 text-sm text-muted-foreground">Scanning for instances...</span>
        </div>
      )}

      {!scanning && prismInstances.length === 0 && (
        <div className="py-6 text-center">
          <p className="mb-4 text-sm text-muted-foreground">
            No Prism Launcher instances found.
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
        </>
      )}
    </>
  )
}
