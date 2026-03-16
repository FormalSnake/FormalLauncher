import { useState } from 'react'
import { Outlet, NavLink, Navigate } from 'react-router'
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
import {
  HomeIcon,
  BoxesIcon,
  CompassIcon,
  UsersIcon,
  ShirtIcon,
  SettingsIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  AlertCircleIcon,
} from 'lucide-react'

const mainNav = [
  { to: '/', icon: HomeIcon, label: 'Home' },
  { to: '/instances', icon: BoxesIcon, label: 'Instances' },
  { to: '/browse', icon: CompassIcon, label: 'Browse' },
]

const bottomNav = [
  { to: '/accounts', icon: UsersIcon, label: 'Accounts' },
  { to: '/skins', icon: ShirtIcon, label: 'Skins' },
  { to: '/settings', icon: SettingsIcon, label: 'Settings' },
]

export interface AppShellContext {
  setTitleOverride: (title: string | null) => void
}

export function AppShell() {
  const { data: session, isPending } = authClient.useSession()
  const [titleOverride, setTitleOverride] = useState<string | null>(null)
  const { sync, syncing, error: syncError } = useSync()

  if (isPending) {
    return (
      <div className="flex h-svh items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return (
    <SidebarProvider className="h-svh">
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader className="drag-region border-b border-sidebar-border px-4 py-4 pl-24">
          <span className="text-lg font-bold tracking-tight text-primary group-data-[collapsible=icon]:hidden">
            FormalLauncher
          </span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainNav.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      render={
                        <NavLink to={item.to} end={item.to === '/'} />
                      }
                      tooltip={item.label}
                    >
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => sync()}
                disabled={syncing}
                tooltip={syncError ? `Sync error: ${syncError}` : syncing ? 'Syncing...' : 'Sync now'}
              >
                {syncing ? (
                  <RefreshCwIcon className="size-4 animate-spin" />
                ) : syncError ? (
                  <AlertCircleIcon className="size-4 text-destructive" />
                ) : (
                  <CheckCircleIcon className="size-4 text-green-500" />
                )}
                <span>{syncing ? 'Syncing...' : syncError ? 'Sync error' : 'Synced'}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {bottomNav.map((item) => (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton
                  render={<NavLink to={item.to} />}
                  tooltip={item.label}
                >
                  <item.icon className="size-4" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col overflow-hidden">
        <TitleBar titleOverride={titleOverride} />
        <ScrollArea className="flex-1 overflow-hidden">
          <div className="p-4 md:p-6">
            <Outlet context={{ setTitleOverride } satisfies AppShellContext} />
          </div>
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  )
}
