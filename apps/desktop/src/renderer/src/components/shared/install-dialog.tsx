import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useInstancesStore } from '@/store/instances.store'
import { useModrinthVersions } from '@/hooks/use-modrinth'
import { useContentInstall } from '@/hooks/use-mod-install'
import { IconLoader, IconCheck, IconCircleWarning } from 'nucleo-pixel'

interface InstallDialogProps {
  projectId: string
  projectName: string
  projectType: 'mod' | 'resourcepack'
  iconUrl?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InstallDialog({
  projectId,
  projectName,
  projectType,
  iconUrl,
  open,
  onOpenChange,
}: InstallDialogProps) {
  const instances = useInstancesStore((s) => s.instances)
  const [selectedInstance, setSelectedInstance] = useState('')
  const [selectedVersion, setSelectedVersion] = useState('')
  const [success, setSuccess] = useState(false)
  const { installMod, installResourcePack, installing, error } = useContentInstall()

  const instance = instances.find((i) => i.id === selectedInstance)

  const { data: compatibleVersions, isLoading: compatibleLoading } = useModrinthVersions(
    projectId,
    instance
      ? {
          gameVersions: [instance.minecraftVersion],
          loaders:
            instance.modLoader !== 'vanilla' ? [instance.modLoader] : undefined,
        }
      : undefined,
  )

  const { data: allVersions, isLoading: allVersionsLoading } = useModrinthVersions(
    projectId,
    instance ? {} : undefined,
  )

  const hasNoCompatible = !compatibleLoading && compatibleVersions?.length === 0
  const versions = hasNoCompatible ? allVersions : compatibleVersions
  const versionsLoading = hasNoCompatible ? allVersionsLoading : compatibleLoading

  const handleInstall = async () => {
    if (!selectedInstance) return
    setSuccess(false)

    if (projectType === 'mod') {
      await installMod(
        selectedInstance,
        projectId,
        projectName,
        selectedVersion || undefined,
        iconUrl,
      )
    } else {
      await installResourcePack(
        selectedInstance,
        projectId,
        projectName,
        selectedVersion || undefined,
        iconUrl,
      )
    }

    if (!error) {
      setSuccess(true)
      setTimeout(() => {
        onOpenChange(false)
        setSuccess(false)
        setSelectedInstance('')
        setSelectedVersion('')
      }, 1000)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Install {projectName}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Instance</label>
            <Select value={selectedInstance} onValueChange={(v) => v && setSelectedInstance(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select instance" />
              </SelectTrigger>
              <SelectContent>
                {instances.map((inst) => (
                  <SelectItem key={inst.id} value={inst.id}>
                    {inst.name} ({inst.minecraftVersion})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedInstance && (
            <div className="grid gap-2">
              <label className="text-sm font-medium">Version</label>
              <Select value={selectedVersion} onValueChange={(v) => v && setSelectedVersion(v)}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      versionsLoading ? 'Loading...' : hasNoCompatible ? 'Latest' : 'Latest compatible'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {versions?.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name} ({v.version_number})
                    </SelectItem>
                  ))}
                  {!versionsLoading && versions?.length === 0 && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No versions found
                    </div>
                  )}
                </SelectContent>
              </Select>
              {hasNoCompatible && versions && versions.length > 0 && (
                <p className="text-sm text-destructive">
                  No compatible versions found for this instance. These versions may not work correctly.
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <IconCircleWarning className="size-4" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleInstall}
            disabled={!selectedInstance || installing || success}
          >
            {installing ? (
              <>
                <IconLoader className="mr-2 size-4 animate-spin" />
                Installing...
              </>
            ) : success ? (
              <>
                <IconCheck className="mr-2 size-4" />
                Installed!
              </>
            ) : (
              'Install'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
