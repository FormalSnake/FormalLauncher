import { useState } from 'react'
import { Outlet, NavLink } from 'react-router'
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
import {
  HomeIcon,
  BoxesIcon,
  CompassIcon,
  UsersIcon,
  ShirtIcon,
  SettingsIcon,
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
  const [titleOverride, setTitleOverride] = useState<string | null>(null)

  return (
    <SidebarProvider className="h-svh">
      <Sidebar collapsible="none" className="border-r border-sidebar-border">
        <SidebarHeader className="drag-region border-b border-sidebar-border px-4 py-4 pl-24">
          <span className="text-lg font-bold tracking-tight text-primary">
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
          <div className="p-6">
            <Outlet context={{ setTitleOverride } satisfies AppShellContext} />
          </div>
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  )
}
