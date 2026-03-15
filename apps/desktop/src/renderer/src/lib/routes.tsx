import { createHashRouter } from 'react-router'
import { AppShell } from '@/components/layout/app-shell'
import { HomePage } from '@/pages/home'
import { InstancesPage } from '@/pages/instances'
import { InstanceDetailPage } from '@/pages/instance-detail'
import { BrowsePage } from '@/pages/browse'
import { AccountsPage } from '@/pages/accounts'
import { SettingsPage } from '@/pages/settings'

export const router = createHashRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'instances', element: <InstancesPage /> },
      { path: 'instances/:id', element: <InstanceDetailPage /> },
      { path: 'browse', element: <BrowsePage /> },
      { path: 'accounts', element: <AccountsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])
