import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SkinViewer } from '@/components/shared/skin-viewer'
import { useMinecraftAccountsStore } from '@/store/minecraft-accounts.store'
import { useSkinProfile, useUploadSkin, useSetActiveCape } from '@/hooks/use-skin'
import type { MinecraftSkin, MinecraftCape } from '@/types/minecraft'
import { useProxiedImage } from '@/hooks/use-proxied-image'
import { LoaderIcon, UploadIcon } from 'lucide-react'

function CapeItem({
  cape,
  isActive,
  onSelect,
}: {
  cape: MinecraftCape
  isActive: boolean
  onSelect: () => void
}) {
  const { data: src } = useProxiedImage(cape.url)
  return (
    <button
      className="flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors hover:bg-accent"
      onClick={onSelect}
    >
      {src ? (
        <img src={src} alt={cape.alias} className="h-16 w-12 rounded object-cover" />
      ) : (
        <div className="flex h-16 w-12 items-center justify-center rounded bg-muted" />
      )}
      <span className="text-xs">{cape.alias}</span>
      {isActive && <Badge variant="secondary">Active</Badge>}
    </button>
  )
}

export function SkinsPage() {
  const { accounts, activeAccountId, setActiveAccount } = useMinecraftAccountsStore()
  const account = accounts.find((a) => a.id === activeAccountId) ?? null

  const { data: profile, isPending, isFetching, error } = useSkinProfile()
  const uploadSkin = useUploadSkin()
  const setCape = useSetActiveCape()

  const activeSkin = profile?.skins?.find((s: MinecraftSkin) => s.state === 'ACTIVE')
  const activeCape = profile?.capes?.find((c: MinecraftCape) => c.state === 'ACTIVE')

  const [variant, setVariant] = useState<'classic' | 'slim'>(
    activeSkin?.variant === 'SLIM' ? 'slim' : 'classic',
  )

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted-foreground">
          No Minecraft accounts added. Add one in Accounts first.
        </p>
      </div>
    )
  }

  return (
    <div>
      {accounts.length > 1 && (
        <div className="mb-6">
          <Select value={activeAccountId ?? ''} onValueChange={(v) => { if (v) setActiveAccount(v) }}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isPending && isFetching && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <LoaderIcon className="size-4 animate-spin" />
          Loading skin profile...
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">
          Failed to load skin profile. Make sure your account token is valid.
        </p>
      )}

      {profile && (
        <div className="flex gap-8">
          <div className="flex-shrink-0">
            <SkinViewer
              skinUrl={activeSkin?.url ?? `https://mc-heads.net/skin/${profile.id}`}
              capeUrl={activeCape?.url}
              slim={variant === 'slim'}
              width={300}
              height={440}
            />
          </div>

          <div className="flex-1 space-y-6">
            <Card size="sm">
              <CardContent className="space-y-4">
                <h3 className="text-sm font-semibold">Arm Model</h3>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={variant === 'classic' ? 'default' : 'outline'}
                    onClick={() => setVariant('classic')}
                  >
                    Classic (Steve)
                  </Button>
                  <Button
                    size="sm"
                    variant={variant === 'slim' ? 'default' : 'outline'}
                    onClick={() => setVariant('slim')}
                  >
                    Slim (Alex)
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardContent className="space-y-4">
                <h3 className="text-sm font-semibold">Upload Skin</h3>
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={uploadSkin.isPending || !account}
                  onClick={() => {
                    if (!account) return
                    uploadSkin.mutate({
                      accountId: account.id,
                      variant,
                    })
                  }}
                >
                  {uploadSkin.isPending ? (
                    <LoaderIcon className="size-4 animate-spin" />
                  ) : (
                    <UploadIcon className="size-4" />
                  )}
                  Choose PNG File
                </Button>
                {uploadSkin.isError && (
                  <p className="text-xs text-destructive">Upload failed. Please try again.</p>
                )}
              </CardContent>
            </Card>

            {profile.capes.length > 0 && (
              <Card size="sm">
                <CardContent className="space-y-4">
                  <h3 className="text-sm font-semibold">Capes</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      className="flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors hover:bg-accent"
                      onClick={() => {
                        if (!account) return
                        setCape.mutate({ accountId: account.id, capeId: null })
                      }}
                    >
                      <div className="flex h-16 w-12 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                        None
                      </div>
                      <span className="text-xs">No Cape</span>
                      {!activeCape && <Badge variant="secondary">Active</Badge>}
                    </button>
                    {profile.capes.map((cape: MinecraftCape) => (
                      <CapeItem
                        key={cape.id}
                        cape={cape}
                        isActive={cape.state === 'ACTIVE'}
                        onSelect={() => {
                          if (!account) return
                          setCape.mutate({ accountId: account.id, capeId: cape.id })
                        }}
                      />
                    ))}
                  </div>
                  {setCape.isPending && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <LoaderIcon className="size-3 animate-spin" />
                      Updating cape...
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
