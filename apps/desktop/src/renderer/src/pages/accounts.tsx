import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useMinecraftAccountsStore } from '@/store/minecraft-accounts.store'
import { useMinecraftAuth } from '@/hooks/use-minecraft-auth'
import { mockUser } from '@/data/mock'
import {
  PlusIcon,
  UserIcon,
  CopyIcon,
  ExternalLinkIcon,
  LoaderIcon,
  TrashIcon,
} from 'lucide-react'

export function AccountsPage() {
  const { accounts, activeAccountId, setActiveAccount, removeAccount } =
    useMinecraftAccountsStore()
  const { login, isLoggingIn, deviceCode, error } = useMinecraftAuth()

  return (
    <div>
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">Minecraft Accounts</h2>
        <div className="grid gap-3">
          {accounts.map((account) => (
            <Card key={account.id} size="sm">
              <CardContent className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage
                    src={`https://crafatar.com/avatars/${account.id}?size=64&overlay`}
                    alt={account.name}
                  />
                  <AvatarFallback>{account.name[0]}</AvatarFallback>
                </Avatar>
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
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => removeAccount(account.id)}
                >
                  <TrashIcon className="size-4" />
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
            <LoaderIcon className="size-4 animate-spin" />
          ) : (
            <PlusIcon className="size-4" />
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
                <CopyIcon className="size-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() =>
                window.open(deviceCode?.verificationUri, '_blank')
              }
            >
              <ExternalLinkIcon className="size-4" />
              Open Microsoft Login
            </Button>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <LoaderIcon className="size-4 animate-spin" />
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
            <Avatar>
              <AvatarFallback>
                <UserIcon className="size-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{mockUser.name}</p>
              <p className="text-xs text-muted-foreground">{mockUser.email}</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
