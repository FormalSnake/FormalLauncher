import { createHashRouter } from 'react-router'
import { AppShell } from '@/components/layout/app-shell'
import { LoginPage } from '@/pages/login'
import { HomePage } from '@/pages/home'
import { InstancesPage } from '@/pages/instances'
import { InstanceDetailPage } from '@/pages/instance-detail'
import { BrowsePage } from '@/pages/browse'
import { ProjectDetailPage } from '@/pages/project-detail'
import { AccountsPage } from '@/pages/accounts'
import { SkinsPage } from '@/pages/skins'
import { SettingsPage } from '@/pages/settings'

export const router = createHashRouter([
  { path: 'login', element: <LoginPage /> },
  {
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'instances', element: <InstancesPage /> },
      { path: 'instances/:id', element: <InstanceDetailPage /> },
      { path: 'browse', element: <BrowsePage /> },
      { path: 'browse/:slug', element: <ProjectDetailPage /> },
      { path: 'accounts', element: <AccountsPage /> },
      { path: 'skins', element: <SkinsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])
