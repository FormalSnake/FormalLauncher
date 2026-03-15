import { PageHeader } from '@/components/shared/page-header'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { mockSettings } from '@/data/mock'

export function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" />

      <div className="max-w-lg space-y-6">
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Java / JVM
          </h2>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Default RAM Allocation (MB)</Label>
              <Slider
                defaultValue={[mockSettings.ramMb]}
                min={1024}
                max={16384}
                step={512}
              />
              <span className="text-xs text-muted-foreground">
                {mockSettings.ramMb} MB
              </span>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="default-jvm">Default JVM Arguments</Label>
              <Input
                id="default-jvm"
                defaultValue={mockSettings.jvmArgs}
                placeholder="-XX:+UseG1GC"
              />
            </div>
          </div>
        </section>

        <Separator />

        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Storage
          </h2>
          <div className="grid gap-2">
            <Label>Game Directory</Label>
            <Input value={mockSettings.gameDirectory} readOnly />
          </div>
        </section>

        <Separator />

        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Appearance
          </h2>
          <div className="grid gap-2">
            <Label>Theme</Label>
            <Select defaultValue="dark">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        <Separator />

        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            About
          </h2>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>FormalLauncher v0.0.1</p>
            <p>Electron + React + Tailwind CSS</p>
          </div>
        </section>
      </div>
    </div>
  )
}
