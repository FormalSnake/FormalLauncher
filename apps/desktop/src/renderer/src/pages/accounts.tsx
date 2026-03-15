import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { mockMinecraftAccounts, mockUser } from '@/data/mock'
import { PlusIcon, UserIcon } from 'lucide-react'

export function AccountsPage() {
  return (
    <div>
      <PageHeader title="Accounts" />

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">Minecraft Accounts</h2>
        <div className="grid gap-3">
          {mockMinecraftAccounts.map((account) => (
            <Card key={account.id} size="sm">
              <CardContent className="flex items-center gap-4">
                <Avatar>
                  <AvatarFallback>{account.username[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">{account.username}</p>
                  <p className="text-xs text-muted-foreground">Microsoft Account</p>
                </div>
                {account.active && <Badge variant="secondary">Active</Badge>}
              </CardContent>
            </Card>
          ))}
        </div>
        <Button variant="outline" className="mt-3 gap-2">
          <PlusIcon className="size-4" />
          Add Account
        </Button>
      </section>

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
