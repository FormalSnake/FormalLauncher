import { useState, useEffect } from 'react'
import { useNavigate, useOutletContext } from 'react-router'
import type { AppShellContext } from '@/components/layout/app-shell'
import { InstanceCard } from '@/components/shared/instance-card'
import { SearchBar } from '@/components/shared/search-bar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CreateInstanceDialog } from '@/components/create-instance/create-instance-dialog'
import { useInstancesStore } from '@/store/instances.store'
import { useSharedInstancesStore } from '@/store/shared-instances.store'
import { trpc } from '@/lib/trpc'
import { IconPlus } from 'nucleo-pixel'

export function InstancesPage() {
  const { isOnline } = useOutletContext<AppShellContext>()
  const { instances } = useInstancesStore()
  const { sharedWithMe, setSharedWithMe } = useSharedInstancesStore()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const sharedQuery = trpc.sharing.listSharedWithMe.useQuery(undefined, { enabled: isOnline })

  useEffect(() => {
    if (sharedQuery.data) setSharedWithMe(sharedQuery.data)
  }, [sharedQuery.data, setSharedWithMe])

  const filtered = instances.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  )

  const filteredShared = sharedWithMe.filter((i) =>
    i.instanceName.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button className="gap-2" onClick={() => setOpen(true)}>
          <IconPlus className="size-4" />
          New Instance
        </Button>
        <CreateInstanceDialog open={open} onOpenChange={setOpen} />
      </div>

      <div className="mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search instances..."
        />
      </div>

      <Tabs defaultValue="my-instances">
        <TabsList>
          <TabsTrigger value="my-instances">My Instances</TabsTrigger>
          {isOnline && (
            <TabsTrigger value="shared">
              Shared with Me
              {sharedWithMe.length > 0 && (
                <Badge variant="secondary" className="ml-2">{sharedWithMe.length}</Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="my-instances" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((instance) => (
              <InstanceCard key={instance.id} instance={instance} />
            ))}
            {filtered.length === 0 && (
              <p className="col-span-full text-center text-sm text-muted-foreground">
                {instances.length === 0
                  ? 'No instances yet. Create your first one!'
                  : 'No instances found.'}
              </p>
            )}
          </div>
        </TabsContent>

        {isOnline && (
          <TabsContent value="shared" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredShared.map((shared) => (
                <div
                  key={shared.id}
                  className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-accent"
                  onClick={() => navigate(`/instances/${shared.instanceId}`)}
                >
                  <div className="mb-2 font-medium">{shared.instanceName}</div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">{shared.minecraftVersion}</Badge>
                    <Badge variant="outline">{shared.modLoader}</Badge>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Shared by {shared.ownerUsername}#{shared.ownerFriendCode}
                  </div>
                </div>
              ))}
              {filteredShared.length === 0 && (
                <p className="col-span-full text-center text-sm text-muted-foreground">
                  No shared instances. Friends can share instances with you!
                </p>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
