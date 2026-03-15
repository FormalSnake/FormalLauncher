import type { ReactNode } from 'react'
import { useLocation } from 'react-router'

const titles: Record<string, string> = {
  '/': 'Home',
  '/instances': 'Instances',
  '/browse': 'Browse',
  '/accounts': 'Accounts',
  '/settings': 'Settings',
}

interface TitleBarProps {
  title?: string
  description?: string
  action?: ReactNode
}

export function TitleBar({ title, description, action }: TitleBarProps) {
  const { pathname } = useLocation()
  const resolveTitle = () => {
    if (title) return title
    if (titles[pathname]) return titles[pathname]
    if (pathname.startsWith('/instances/')) return 'Instance'
    return pathname.split('/').filter(Boolean).pop() ?? ''
  }
  const displayTitle = resolveTitle()

  return (
    <div className="drag-region flex shrink-0 items-center border-b border-border px-6 py-4">
      <div className="flex flex-1 items-center gap-3">
        <h1 className="text-lg font-bold tracking-tight">{displayTitle}</h1>
        {description && (
          <span className="text-sm text-muted-foreground">{description}</span>
        )}
      </div>
      {action && <div className="no-drag">{action}</div>}
    </div>
  )
}
