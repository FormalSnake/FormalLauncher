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
import {
  HomeIcon,
  BoxesIcon,
  CompassIcon,
  UsersIcon,
  SettingsIcon,
} from 'lucide-react'

const mainNav = [
  { to: '/', icon: HomeIcon, label: 'Home' },
  { to: '/instances', icon: BoxesIcon, label: 'Instances' },
  { to: '/browse', icon: CompassIcon, label: 'Browse' },
]

const bottomNav = [
  { to: '/accounts', icon: UsersIcon, label: 'Accounts' },
  { to: '/settings', icon: SettingsIcon, label: 'Settings' },
]

export function AppShell() {
  return (
    <SidebarProvider className="h-svh">
      <Sidebar collapsible="none" className="border-r border-sidebar-border">
        <SidebarHeader className="px-4 py-4">
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
      <SidebarInset>
        <ScrollArea className="h-screen">
          <div className="p-6">
            <Outlet />
          </div>
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  )
}
