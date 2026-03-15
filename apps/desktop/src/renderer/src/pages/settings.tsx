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
import { useSettingsStore } from '@/store/settings.store'

export function SettingsPage() {
  const {
    gameDirectory,
    defaultRamMb,
    defaultJvmArgs,
    javaPath,
    setDefaultRamMb,
    setDefaultJvmArgs,
    setJavaPath,
  } = useSettingsStore()

  return (
    <div>
      <div className="max-w-lg space-y-6">
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Java / JVM
          </h2>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Default RAM Allocation (MB)</Label>
              <Slider
                value={[defaultRamMb]}
                onValueChange={(v) => setDefaultRamMb(v[0])}
                min={1024}
                max={16384}
                step={512}
              />
              <span className="text-xs text-muted-foreground">
                {defaultRamMb} MB
              </span>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="default-jvm">Default JVM Arguments</Label>
              <Input
                id="default-jvm"
                value={defaultJvmArgs}
                onChange={(e) => setDefaultJvmArgs(e.target.value)}
                placeholder="-XX:+UseG1GC"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="java-path">Java Path</Label>
              <Input
                id="java-path"
                value={javaPath}
                onChange={(e) => setJavaPath(e.target.value)}
                placeholder="java"
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
            <Input value={gameDirectory} readOnly />
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
