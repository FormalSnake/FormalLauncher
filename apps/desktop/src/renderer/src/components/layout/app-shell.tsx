import { useState, useEffect } from 'react'
import { Outlet, NavLink, Navigate, useNavigate } from 'react-router'
import { authClient } from '@/lib/auth-client'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@/components/ui/sidebar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TitleBar } from '@/components/layout/title-bar'
import { useSync } from '@/hooks/use-sync'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useProxiedImage } from '@/hooks/use-proxied-image'
import {
  IconHouse,
  IconStackX,
  IconCompass,
  IconUsers2,
  IconShirt,
  IconGear,
  IconArrowRotateClockwise,
  IconCircleCheck,
  IconCircleWarning,
  IconUser,
  IconUserHeart,
  IconChatBubble,
} from 'nucleo-pixel'
import { Badge } from '@/components/ui/badge'
import { useFriendsStore } from '@/store/friends.store'
import { useChatStore } from '@/store/chat.store'
import { trpc } from '@/lib/trpc'

const mainNav = [
  { to: '/', icon: IconHouse, label: 'Home' },
  { to: '/instances', icon: IconStackX, label: 'Instances' },
  { to: '/browse', icon: IconCompass, label: 'Browse' },
  { to: '/friends', icon: IconUserHeart, label: 'Friends', badgeKey: 'friends' as const },
  { to: '/chat', icon: IconChatBubble, label: 'Chat', badgeKey: 'chat' as const },
]

const bottomNav = [
  { to: '/accounts', icon: IconUsers2, label: 'Accounts' },
  { to: '/skins', icon: IconShirt, label: 'Skins' },
  { to: '/settings', icon: IconGear, label: 'Settings' },
]

function SidebarProfileAvatar({
  image,
  name,
}: {
  image?: string | null
  name?: string | null
}) {
  const { data: src } = useProxiedImage(image ?? undefined)
  return (
    <Avatar size="sm">
      {src && <AvatarImage src={src} alt={name ?? 'Profile'} />}
      <AvatarFallback>
        <IconUser className="size-3" />
      </AvatarFallback>
    </Avatar>
  )
}

export interface AppShellContext {
  setTitleOverride: (title: string | null) => void
  isOnline: boolean
}

export function AppShell() {
  const { data: session, isPending } = authClient.useSession()
  const [titleOverride, setTitleOverride] = useState<string | null>(null)
  const [sessionTimedOut, setSessionTimedOut] = useState(false)
  const navigate = useNavigate()
  // Timeout the pending state after 3s (server unreachable)
  useEffect(() => {
    if (!isPending) return
    const timer = setTimeout(() => setSessionTimedOut(true), 3000)
    return () => clearTimeout(timer)
  }, [isPending])

  const isOnline = !!session
  const { sync, syncing, error: syncError } = useSync()
  const pendingCount = useFriendsStore((s) => s.pendingRequests.length)
  const unreadCount = useChatStore((s) =>
    s.conversations.reduce((acc, c) => acc + c.unreadCount, 0),
  )

  // Prefetch pending requests and conversations for badge counts
  const pendingQuery = trpc.friend.pendingRequests.useQuery(undefined, { enabled: isOnline })
  const convsQuery = trpc.chat.listConversations.useQuery(undefined, { enabled: isOnline })
  const profileQuery = trpc.profile.get.useQuery(undefined, { enabled: isOnline })

  useEffect(() => {
    if (pendingQuery.data) useFriendsStore.getState().setPendingRequests(pendingQuery.data)
  }, [pendingQuery.data])

  useEffect(() => {
    if (convsQuery.data) useChatStore.getState().setConversations(convsQuery.data as any)
  }, [convsQuery.data])

  // Real-time friend events for badge updates
  trpc.friend.onFriendEvent.useSubscription(undefined, {
    enabled: isOnline,
    onData: () => {
      pendingQuery.refetch()
    },
  })

  // Real-time message events for chat badge updates
  trpc.chat.onNewMessage.useSubscription(undefined, {
    enabled: isOnline,
    onData: () => {
      convsQuery.refetch()
    },
  })

  const badgeCounts: Record<string, number> = {
    friends: pendingCount,
    chat: unreadCount,
  }

  if (isPending && !sessionTimedOut) {
    return (
      <div className="flex h-svh items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (isOnline && profileQuery.isSuccess && !profileQuery.data) {
    return <Navigate to="/username-setup" replace />
  }

  const isMac = window.platform?.platform === 'darwin'

  const visibleMainNav = isOnline
    ? mainNav
    : mainNav.filter((item) => item.to !== '/friends' && item.to !== '/chat')

  return (
    <SidebarProvider className="h-svh">
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader className={`drag-region border-b border-sidebar-border px-4 py-4 ${isMac ? 'pl-24' : ''}`}>
          <span className="text-lg font-bold tracking-tight text-primary group-data-[collapsible=icon]:hidden">
            FormalLauncher
          </span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleMainNav.map((item) => {
                  const count = 'badgeKey' in item && item.badgeKey ? badgeCounts[item.badgeKey] ?? 0 : 0
                  return (
                    <SidebarMenuItem key={item.to}>
                      <NavLink to={item.to} end={item.to === '/'}>
                        {({ isActive }) => (
                          <SidebarMenuButton
                            isActive={isActive}
                            tooltip={item.label}
                          >
                            <item.icon className="size-4" />
                            <span>{item.label}</span>
                            {count > 0 && (
                              <Badge variant="destructive" className="ml-auto size-5 justify-center p-0 text-[10px]">
                                {count}
                              </Badge>
                            )}
                          </SidebarMenuButton>
                        )}
                      </NavLink>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            {isOnline ? (
              <>
                <SidebarMenuItem>
                  <NavLink to="/accounts">
                    {({ isActive }) => (
                      <SidebarMenuButton isActive={isActive} tooltip={session!.user.name ?? 'Profile'}>
                        <SidebarProfileAvatar image={session!.user.image} name={session!.user.name} />
                        <span>{session!.user.name}</span>
                      </SidebarMenuButton>
                    )}
                  </NavLink>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => sync()}
                    disabled={syncing}
                    tooltip={syncError ? `Sync error: ${syncError}` : syncing ? 'Syncing...' : 'Sync now'}
                  >
                    {syncing ? (
                      <IconArrowRotateClockwise className="size-4 animate-spin" />
                    ) : syncError ? (
                      <IconCircleWarning className="size-4 text-destructive" />
                    ) : (
                      <IconCircleCheck className="size-4 text-green-500" />
                    )}
                    <span>{syncing ? 'Syncing...' : syncError ? 'Sync error' : 'Synced'}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            ) : (
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => navigate('/login')} tooltip="Sign in">
                  <IconUser className="size-4" />
                  <span>Sign in</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {bottomNav.map((item) => (
              <SidebarMenuItem key={item.to}>
                <NavLink to={item.to}>
                  {({ isActive }) => (
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  )}
                </NavLink>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col overflow-hidden">
        <TitleBar titleOverride={titleOverride} />
        <ScrollArea className="flex-1 overflow-hidden">
          <div className="p-4 md:p-6">
            <Outlet context={{ setTitleOverride, isOnline } satisfies AppShellContext} />
          </div>
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  )
}
