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
import { UsernameSetupPage } from '@/pages/username-setup'
import { FriendsPage } from '@/pages/friends'
import { ChatPage } from '@/pages/chat'

export const router = createHashRouter([
  { path: 'login', element: <LoginPage /> },
  { path: 'username-setup', element: <UsernameSetupPage /> },
  {
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'instances', element: <InstancesPage /> },
      { path: 'instances/:id', element: <InstanceDetailPage /> },
      { path: 'browse', element: <BrowsePage /> },
      { path: 'browse/:slug', element: <ProjectDetailPage /> },
      { path: 'friends', element: <FriendsPage /> },
      { path: 'chat', element: <ChatPage /> },
      { path: 'chat/:conversationId', element: <ChatPage /> },
      { path: 'accounts', element: <AccountsPage /> },
      { path: 'skins', element: <SkinsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])
