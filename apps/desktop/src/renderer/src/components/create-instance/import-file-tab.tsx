import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DialogFooter, DialogClose } from '@/components/ui/dialog'
import { useModpackInstall } from '@/hooks/use-modpack-install'
import { FileIcon, LoaderIcon, UploadIcon } from 'lucide-react'

interface ImportFileTabProps {
  onCreated: () => void
}

export function ImportFileTab({ onCreated }: ImportFileTabProps) {
  const [filePath, setFilePath] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const { installModpackFromFile, installing, progress, error } = useModpackInstall()

  const handleFile = useCallback((path: string) => {
    setFilePath(path)
    const baseName = path.split('/').pop()?.split('\\').pop() ?? path
    setFileName(baseName)
    setName(baseName.replace(/\.mrpack$/, ''))
  }, [])

  const handleBrowse = async () => {
    const path = await window.minecraft.selectMrpackFile()
    if (path) handleFile(path)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.mrpack')) {
      // Electron provides the `path` property on File objects
      const electronFile = file as File & { path: string }
      if (electronFile.path) {
        handleFile(electronFile.path)
      }
    }
  }

  const handleInstall = async () => {
    if (!filePath || !name.trim()) return
    const result = await installModpackFromFile(filePath, name.trim())
    if (result) onCreated()
  }

  return (
    <>
      <div className="grid gap-4 py-4">
        {!filePath ? (
          <div
            className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed py-12 transition-colors ${
              dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <UploadIcon className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drag and drop a .mrpack file here
            </p>
            <Button variant="outline" onClick={handleBrowse}>
              Browse...
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 rounded-md border p-3">
              <FileIcon className="size-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{fileName}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilePath(null)
                  setFileName(null)
                  setName('')
                }}
              >
                Change
              </Button>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mrpack-name">Instance Name</Label>
              <Input
                id="mrpack-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Instance name"
              />
            </div>
          </>
        )}

        {progress && (
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>Downloading mods...</span>
              <span>{progress.current} / {progress.total}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>

      {filePath && (
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button
            onClick={handleInstall}
            disabled={!name.trim() || installing}
          >
            {installing ? (
              <>
                <LoaderIcon className="mr-2 size-4 animate-spin" />
                Installing...
              </>
            ) : (
              'Install'
            )}
          </Button>
        </DialogFooter>
      )}
    </>
  )
}
