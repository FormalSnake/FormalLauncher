import { useState, useEffect, useMemo } from 'react'
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
import { ContentTable } from '@/components/shared/content-table'
import { UpdatePanel } from '@/components/shared/update-panel'
import { LinkModrinthDialog } from '@/components/shared/link-modrinth-dialog'
import { useInstancesStore } from '@/store/instances.store'
import { useMinecraftAccountsStore } from '@/store/minecraft-accounts.store'
import { useGameStore } from '@/store/game.store'
import { useSettingsStore } from '@/store/settings.store'
import { useVersions } from '@/hooks/use-versions'
import { useLaunch } from '@/hooks/use-launch'
import { useContentInstall } from '@/hooks/use-mod-install'
import { useModrinthProjects, useModrinthHashLookup } from '@/hooks/use-modrinth'
import {
  IconMediaPlay,
  IconMediaStop,
  IconCube,
  IconLoader,
  IconShieldCheck,
  IconPlus,
  IconImage,
  IconUserPlus,
  IconCircleWarning,
} from 'nucleo-pixel'
import { authClient } from '@/lib/auth-client'
import { trpc } from '@/lib/trpc'
import { useFriendsStore } from '@/store/friends.store'
import { useSharedInstancesStore } from '@/store/shared-instances.store'

export function InstanceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { instances, updateInstance } = useInstancesStore()
  const instance = instances.find((i) => i.id === id)
  const activeAccount = useMinecraftAccountsStore((s) => s.getActiveAccount())
  const { launchingInstanceId, runningInstanceId, downloadProgress, gameLog } =
    useGameStore()
  const { launch, stop } = useLaunch()
  const { versions } = useVersions('release')
  const { removeMod, toggleMod, removeResourcePack } = useContentInstall()

  const [activeTab, setActiveTab] = useState('overview')
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkDialogItem, setLinkDialogItem] = useState<{ projectId: string; versionId: string; name: string; fileName: string; enabled?: boolean; iconUrl?: string; versionNumber?: string } | null>(null)
  const [linkDialogType, setLinkDialogType] = useState<'mod' | 'resourcepack'>('mod')
  const [settingsRam, setSettingsRam] = useState(instance?.ramMb ?? 4096)
  const [settingsJavaPath, setSettingsJavaPath] = useState(
    instance?.javaPath ?? '',
  )
  const [settingsJvm, setSettingsJvm] = useState(instance?.jvmArgs ?? '')
  const [settingsVersion, setSettingsVersion] = useState(
    instance?.minecraftVersion ?? '',
  )
  const [verifying, setVerifying] = useState(false)
  const [shareDialogFriend, setShareDialogFriend] = useState<string | null>(null)

  const { data: session } = authClient.useSession()
  const { friends } = useFriendsStore()
  const { conflicts, removeConflict } = useSharedInstancesStore()

  const isOwner = instance?.id ? true : false // instance is found from own store = owner
  const instanceConflicts = conflicts.filter((c) => c.instanceId === id)

  const sharedByMeQuery = trpc.sharing.listSharedByMe.useQuery(undefined, { enabled: isOwner })
  const shareMutation = trpc.sharing.share.useMutation({
    onSuccess: () => sharedByMeQuery.refetch(),
  })
  const unshareMutation = trpc.sharing.unshare.useMutation({
    onSuccess: () => sharedByMeQuery.refetch(),
  })
  const resolveConflictMutation = trpc.sharing.resolveConflict.useMutation({
    onSuccess: (_, vars) => removeConflict(vars.conflictId),
  })

  const instanceShares = sharedByMeQuery.data?.find((s) => s.instanceId === id)

  // Collect project IDs missing iconUrl for batch fetch
  const missingIconIds = useMemo(() => {
    if (!instance) return []
    const ids: string[] = []
    for (const mod of instance.mods ?? []) {
      if (!mod.iconUrl) ids.push(mod.projectId)
    }
    for (const rp of instance.resourcePacks ?? []) {
      if (!rp.iconUrl) ids.push(rp.projectId)
    }
    return [...new Set(ids)]
  }, [instance])

  // Split into SHA1 hashes vs direct Modrinth IDs
  const { hashIds, directIds } = useMemo(() => {
    const hashIds: string[] = []
    const directIds: string[] = []
    for (const id of missingIconIds) {
      if (/^[a-f0-9]{40}$/.test(id)) hashIds.push(id)
      else directIds.push(id)
    }
    return { hashIds, directIds }
  }, [missingIconIds])

  // Resolve hashes -> versions (contains project_id)
  const { data: hashVersions } = useModrinthHashLookup(hashIds)

  // Collect all project IDs (direct + resolved from hashes)
  const allProjectIds = useMemo(() => {
    const ids = [...directIds]
    if (hashVersions) {
      for (const v of Object.values(hashVersions)) {
        ids.push(v.project_id)
      }
    }
    return [...new Set(ids)]
  }, [directIds, hashVersions])

  const { data: projects } = useModrinthProjects(allProjectIds)

  const iconMap = useMemo(() => {
    const map: Record<string, string> = {}
    if (projects) {
      for (const p of projects) {
        if (p.icon_url) map[p.id] = p.icon_url
      }
    }
    // Map hashes to their resolved project's icon
    if (hashVersions) {
      for (const [hash, version] of Object.entries(hashVersions)) {
        const icon = map[version.project_id]
        if (icon) map[hash] = icon
      }
    }
    return map
  }, [projects, hashVersions])

  // Build a map from projectId (or hash) -> slug for navigation
  const slugMap = useMemo(() => {
    const map: Record<string, string> = {}
    if (projects) {
      for (const p of projects) {
        map[p.id] = p.slug
      }
    }
    if (hashVersions) {
      for (const [hash, version] of Object.entries(hashVersions)) {
        const slug = map[version.project_id]
        if (slug) map[hash] = slug
      }
    }
    return map
  }, [projects, hashVersions])

  const handleContentClick = (item: { projectId: string }, contentType?: 'mod' | 'resourcepack') => {
    const slug = slugMap[item.projectId]
    if (slug) {
      navigate(`/browse/${slug}`)
    } else if (/^[a-f0-9]{40}$/.test(item.projectId)) {
      // Unlinked mod (SHA1 hash as projectId) — open link dialog
      const fullItem = contentType === 'resourcepack'
        ? instance?.resourcePacks.find((r) => r.projectId === item.projectId)
        : instance?.mods.find((m) => m.projectId === item.projectId)
      if (fullItem) {
        setLinkDialogItem(fullItem as any)
        setLinkDialogType(contentType ?? 'mod')
        setLinkDialogOpen(true)
      }
    } else {
      // Direct Modrinth ID without a resolved slug — use ID as fallback
      navigate(`/browse/${item.projectId}`)
    }
  }

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
      javaPath: settingsJavaPath || undefined,
      jvmArgs: settingsJvm || undefined,
      minecraftVersion: settingsVersion,
    })
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {instance.iconUrl && (
              <img src={instance.iconUrl} alt="" className="size-8 rounded-sm" />
            )}
            <h1 className="text-2xl font-bold tracking-tight">
              {instance.name}
            </h1>
            <Badge variant="secondary">{instance.minecraftVersion}</Badge>
            <LoaderBadge loader={instance.modLoader} />
          </div>
          {isThisRunning ? (
            <Button
              className="gap-2"
              variant="destructive"
              onClick={() => stop()}
            >
              <IconMediaStop className="size-4" />
              Stop
            </Button>
          ) : (
            <Button
              className="gap-2"
              onClick={handlePlay}
              disabled={isBusy}
            >
              {isThisLaunching ? (
                <IconLoader className="size-4 animate-spin" />
              ) : (
                <IconMediaPlay className="size-4" />
              )}
              {isThisLaunching ? 'Launching...' : 'Play'}
            </Button>
          )}
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

      {/* Conflict banner */}
      {instanceConflicts.length > 0 && (
        <div className="mb-4 space-y-2">
          {instanceConflicts.map((conflict) => (
            <div key={conflict.id} className="flex items-center justify-between rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3">
              <div className="flex items-center gap-2">
                <IconCircleWarning className="size-4 text-yellow-500" />
                <span className="text-sm">
                  Conflict on <span className="font-medium">{conflict.field}</span>
                  {conflict.instanceName && <> in {conflict.instanceName}</>}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => resolveConflictMutation.mutate({ conflictId: conflict.id, resolution: 'keep_mine' })}
                >
                  Keep Mine
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => resolveConflictMutation.mutate({ conflictId: conflict.id, resolution: 'use_owner' })}
                >
                  Use Owner's
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sharing section */}
      {isOwner && (
        <div className="mb-4">
          <div className="flex flex-wrap items-center gap-2">
            {instanceShares?.sharedWith.map((sw) => (
              <Badge key={sw.userId} variant="secondary" className="gap-1">
                {sw.username}
                <button
                  className="ml-1 text-xs opacity-60 hover:opacity-100"
                  onClick={() => unshareMutation.mutate({ instanceId: instance.id, friendId: sw.userId })}
                >
                  x
                </button>
              </Badge>
            ))}
            <Select
              value=""
              onValueChange={(friendId) => {
                if (friendId) shareMutation.mutate({ instanceId: instance.id, friendId })
              }}
            >
              <SelectTrigger className="w-auto gap-2">
                <IconUserPlus className="size-4" />
                <span>Share</span>
              </SelectTrigger>
              <SelectContent>
                {friends
                  .filter((f) => !instanceShares?.sharedWith.some((sw) => sw.userId === f.userId))
                  .map((f) => (
                    <SelectItem key={f.userId} value={f.userId}>
                      {f.username}#{f.friendCode}
                    </SelectItem>
                  ))}
                {friends.length === 0 && (
                  <div className="px-2 py-1 text-xs text-muted-foreground">Add friends first</div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as string)}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="space-y-6">
            <UpdatePanel instanceId={instance.id} />

            {/* Mods Section */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Mods</h2>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => navigate('/browse?tab=mod')}
                >
                  <IconPlus className="size-4" />
                  Add Mods
                </Button>
              </div>
              {(instance.mods ?? []).length > 0 ? (
                <ContentTable
                  items={instance.mods ?? []}
                  contentType="mod"
                  iconMap={iconMap}
                  onToggle={(mod) => toggleMod(instance.id, mod)}
                  onRemove={(mod) => removeMod(instance.id, mod as any)}
                  onItemClick={(item) => handleContentClick(item, 'mod')}
                />
              ) : (
                <div className="flex flex-col items-center gap-2 rounded-md border border-dashed py-8 text-muted-foreground">
                  <IconCube className="size-6" />
                  <p className="text-sm">No mods installed</p>
                </div>
              )}
            </div>

            {/* Resource Packs Section */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Resource Packs</h2>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => navigate('/browse?tab=resourcepack')}
                >
                  <IconPlus className="size-4" />
                  Add Resource Packs
                </Button>
              </div>
              {(instance.resourcePacks ?? []).length > 0 ? (
                <ContentTable
                  items={instance.resourcePacks ?? []}
                  contentType="resourcepack"
                  iconMap={iconMap}
                  onRemove={(rp) => removeResourcePack(instance.id, rp as any)}
                  onItemClick={(item) => handleContentClick(item, 'resourcepack')}
                />
              ) : (
                <div className="flex flex-col items-center gap-2 rounded-md border border-dashed py-8 text-muted-foreground">
                  <IconImage className="size-6" />
                  <p className="text-sm">No resource packs installed</p>
                </div>
              )}
            </div>
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
              <Label htmlFor="java-path">Java Path</Label>
              <Input
                id="java-path"
                value={settingsJavaPath}
                onChange={(e) => setSettingsJavaPath(e.target.value)}
                placeholder="Auto-detect (leave empty)"
              />
              <span className="text-xs text-muted-foreground">
                Leave empty to auto-detect or download the correct Java version
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
                  <IconLoader className="size-4 animate-spin" />
                ) : (
                  <IconShieldCheck className="size-4" />
                )}
                {verifying ? 'Verifying...' : 'Verify & Repair Files'}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {linkDialogItem && (
        <LinkModrinthDialog
          instanceId={instance.id}
          item={linkDialogItem as any}
          contentType={linkDialogType}
          open={linkDialogOpen}
          onOpenChange={(open) => {
            setLinkDialogOpen(open)
            if (!open) setLinkDialogItem(null)
          }}
        />
      )}
    </div>
  )
}
