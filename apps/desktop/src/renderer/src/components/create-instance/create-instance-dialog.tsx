import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CustomTab } from './custom-tab'
import { ModpacksTab } from './modpacks-tab'
import { ImportFileTab } from './import-file-tab'
import { ImportPrismTab } from './import-prism-tab'

interface CreateInstanceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateInstanceDialog({ open, onOpenChange }: CreateInstanceDialogProps) {
  const close = () => onOpenChange(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>New Instance</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="custom">
          <TabsList>
            <TabsTrigger value="custom">Custom</TabsTrigger>
            <TabsTrigger value="modpacks">Modpacks</TabsTrigger>
            <TabsTrigger value="import-file">Import File</TabsTrigger>
            <TabsTrigger value="import-prism">Import Prism</TabsTrigger>
          </TabsList>
          <TabsContent value="custom" className="mt-4">
            <CustomTab onCreated={close} />
          </TabsContent>
          <TabsContent value="modpacks" className="mt-4">
            <ModpacksTab onCreated={close} />
          </TabsContent>
          <TabsContent value="import-file" className="mt-4">
            <ImportFileTab onCreated={close} />
          </TabsContent>
          <TabsContent value="import-prism" className="mt-4">
            <ImportPrismTab onCreated={close} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
