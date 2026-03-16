import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useProxiedImage } from '@/hooks/use-proxied-image'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { McAvatar } from '@/components/shared/mc-avatar'
import { useMinecraftAccountsStore } from '@/store/minecraft-accounts.store'
import { useMinecraftAuth } from '@/hooks/use-minecraft-auth'
import { authClient } from '@/lib/auth-client'
import { useNavigate } from 'react-router'
import {
  IconPlus,
  IconUser,
  IconCopy,
  IconExternalLink,
  IconLoader,
  IconTrash,
  IconExitDoor,
  IconCheck,
  IconImage,
} from 'nucleo-pixel'

function ProfileAvatar({
  image,
  name,
  size,
}: {
  image?: string | null
  name?: string | null
  size?: 'default' | 'sm' | 'lg'
}) {
  const { data: src } = useProxiedImage(image ?? undefined)
  return (
    <Avatar size={size}>
      {src && <AvatarImage src={src} alt={name ?? 'Profile'} />}
      <AvatarFallback>
        <IconUser className="size-4" />
      </AvatarFallback>
    </Avatar>
  )
}

export function AccountsPage() {
  const { accounts, activeAccountId, setActiveAccount, removeAccount } =
    useMinecraftAccountsStore()
  const { login, isLoggingIn, deviceCode, error } = useMinecraftAuth()
  const { data: session } = authClient.useSession()
  const navigate = useNavigate()

  return (
    <div>
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">Minecraft Accounts</h2>
        <div className="grid gap-3">
          {accounts.map((account) => (
            <Card key={account.id} size="sm">
              <CardContent className="flex items-center gap-4">
                <McAvatar id={account.id} name={account.name} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{account.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Microsoft Account
                  </p>
                </div>
                {activeAccountId === account.id && (
                  <Badge variant="secondary">Active</Badge>
                )}
                {activeAccountId !== account.id && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setActiveAccount(account.id)}
                  >
                    Set Active
                  </Button>
                )}
                {session?.user.image?.includes(account.id) ? (
                  <Badge variant="outline" className="gap-1">
                    <IconCheck className="size-3" />
                    Profile Pic
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1"
                    onClick={() =>
                      authClient.updateUser({
                        image: `https://mc-heads.net/avatar/${account.id}/64`,
                      })
                    }
                  >
                    <IconImage className="size-4" />
                    Set as Profile Picture
                  </Button>
                )}
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => removeAccount(account.id)}
                >
                  <IconTrash className="size-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
          {accounts.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No Minecraft accounts added yet.
            </p>
          )}
        </div>
        <Button
          variant="outline"
          className="mt-3 gap-2"
          onClick={login}
          disabled={isLoggingIn}
        >
          {isLoggingIn ? (
            <IconLoader className="size-4 animate-spin" />
          ) : (
            <IconPlus className="size-4" />
          )}
          Add Account
        </Button>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </section>

      <Dialog open={!!deviceCode} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign in with Microsoft</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Enter this code at the Microsoft login page:
            </p>
            <div className="flex items-center justify-center gap-3">
              <code className="rounded bg-muted px-4 py-2 text-2xl font-bold tracking-widest">
                {deviceCode?.userCode}
              </code>
              <Button
                size="icon"
                variant="outline"
                onClick={() =>
                  navigator.clipboard.writeText(deviceCode?.userCode ?? '')
                }
              >
                <IconCopy className="size-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() =>
                window.open(deviceCode?.verificationUri, '_blank')
              }
            >
              <IconExternalLink className="size-4" />
              Open Microsoft Login
            </Button>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <IconLoader className="size-4 animate-spin" />
              Waiting for sign-in...
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Separator className="my-6" />

      <section>
        <h2 className="mb-4 text-lg font-semibold">App Account</h2>
        <Card size="sm">
          <CardContent className="flex items-center gap-4">
            <ProfileAvatar image={session?.user.image} name={session?.user.name} />
            <div className="flex-1">
              <p className="text-sm font-medium">{session?.user.name}</p>
              <p className="text-xs text-muted-foreground">
                {session?.user.email}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={async () => {
                await authClient.signOut()
                navigate('/login')
              }}
            >
              <IconExitDoor className="size-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
