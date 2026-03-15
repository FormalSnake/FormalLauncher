import { useState, useEffect } from 'react'
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
import { GameTerminal } from '@/components/shared/game-terminal'
import { useInstancesStore } from '@/store/instances.store'
import { useMinecraftAccountsStore } from '@/store/minecraft-accounts.store'
import { useGameStore } from '@/store/game.store'
import { useSettingsStore } from '@/store/settings.store'
import { useVersions } from '@/hooks/use-versions'
import { useLaunch } from '@/hooks/use-launch'
import {
  ArrowLeftIcon,
  PlayIcon,
  PackageIcon,
  LoaderIcon,
  ShieldCheckIcon,
} from 'lucide-react'

export function InstanceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { instances, updateInstance } = useInstancesStore()
  const instance = instances.find((i) => i.id === id)
  const activeAccount = useMinecraftAccountsStore((s) => s.getActiveAccount())
  const { launchingInstanceId, runningInstanceId, downloadProgress, gameLog } =
    useGameStore()
  const { launch } = useLaunch()
  const { versions } = useVersions('release')

  const [activeTab, setActiveTab] = useState('overview')
  const [settingsRam, setSettingsRam] = useState(instance?.ramMb ?? 4096)
  const [settingsJvm, setSettingsJvm] = useState(instance?.jvmArgs ?? '')
  const [settingsVersion, setSettingsVersion] = useState(
    instance?.minecraftVersion ?? '',
  )
  const [verifying, setVerifying] = useState(false)

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

  const isThisLaunching = launchingInstanceId === instance.id
  const isThisRunning = runningInstanceId === instance.id
  const isBusy = !!launchingInstanceId || !!runningInstanceId

  useEffect(() => {
    if (isThisLaunching) {
      setActiveTab('logs')
    }
  }, [isThisLaunching])

  const handlePlay = () => {
    if (!activeAccount) {
      navigate('/accounts')
      return
    }
    launch(instance.id)
  }

  const handleSaveSettings = () => {
    updateInstance(instance.id, {
      ramMb: settingsRam,
      jvmArgs: settingsJvm || undefined,
      minecraftVersion: settingsVersion,
    })
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
          <Button
            className="gap-2"
            onClick={handlePlay}
            disabled={isBusy}
          >
            {isThisLaunching ? (
              <LoaderIcon className="size-4 animate-spin" />
            ) : (
              <PlayIcon className="size-4" />
            )}
            {isThisRunning
              ? 'Running'
              : isThisLaunching
                ? 'Launching...'
                : 'Play'}
          </Button>
        </div>
      </div>

      {isThisLaunching && downloadProgress && (
        <div className="mb-4 rounded-md border border-border p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="capitalize">
              {downloadProgress.phase.replace('-', ' ')}
            </span>
            <span>
              {downloadProgress.current} / {downloadProgress.total}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{
                width: `${downloadProgress.total > 0 ? (downloadProgress.current / downloadProgress.total) * 100 : 0}%`,
              }}
            />
          </div>
          {downloadProgress.fileName && (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {downloadProgress.fileName}
            </p>
          )}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as string)}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <PackageIcon className="size-8" />
            <p className="text-sm">
              Mod and resource pack management coming soon.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <GameTerminal />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <div className="max-w-md space-y-6">
            <div className="grid gap-2">
              <Label>RAM Allocation (MB)</Label>
              <Slider
                value={[settingsRam]}
                onValueChange={(v) => setSettingsRam(Array.isArray(v) ? v[0] : v)}
                min={1024}
                max={16384}
                step={512}
              />
              <span className="text-xs text-muted-foreground">
                {settingsRam} MB
              </span>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="jvm-args">JVM Arguments</Label>
              <Input
                id="jvm-args"
                value={settingsJvm}
                onChange={(e) => setSettingsJvm(e.target.value)}
                placeholder="-XX:+UseG1GC"
              />
            </div>
            <div className="grid gap-2">
              <Label>Minecraft Version</Label>
              <Select
                value={settingsVersion}
                onValueChange={(v) => v && setSettingsVersion(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveSettings}>Save Settings</Button>
              <Button
                variant="outline"
                className="gap-2"
                disabled={verifying || isBusy}
                onClick={async () => {
                  setVerifying(true)
                  try {
                    const gameDir = useSettingsStore.getState().gameDirectory
                    await window.minecraft.downloadGame(
                      gameDir,
                      instance.minecraftVersion,
                    )
                  } finally {
                    setVerifying(false)
                  }
                }}
              >
                {verifying ? (
                  <LoaderIcon className="size-4 animate-spin" />
                ) : (
                  <ShieldCheckIcon className="size-4" />
                )}
                {verifying ? 'Verifying...' : 'Verify & Repair Files'}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
