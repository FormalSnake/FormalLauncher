import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { IconArrowLeft } from 'nucleo-pixel'

const titles: Record<string, string> = {
  '/': 'Home',
  '/instances': 'Instances',
  '/browse': 'Browse',
  '/friends': 'Friends',
  '/chat': 'Chat',
  '/accounts': 'Accounts',
  '/skins': 'Skins',
  '/settings': 'Settings',
}

interface TitleBarProps {
  titleOverride?: string | null
  description?: string
  action?: ReactNode
}

export function TitleBar({ titleOverride, description, action }: TitleBarProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const isDetailRoute =
    pathname.startsWith('/instances/') || pathname.startsWith('/browse/')

  const resolveTitle = () => {
    if (titleOverride) return titleOverride
    if (titles[pathname]) return titles[pathname]
    if (pathname.startsWith('/instances/')) return 'Instance'
    if (pathname.startsWith('/browse/')) return 'Project'
    return titles[pathname] ?? pathname.split('/').filter(Boolean).pop() ?? ''
  }
  const displayTitle = resolveTitle()

  return (
    <div className="drag-region flex shrink-0 items-center border-b border-border px-4 py-3 md:px-6 md:py-4">
      <div className="flex flex-1 items-center gap-3">
        {isDetailRoute && (
          <button
            type="button"
            className="no-drag -ml-1 flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => navigate(-1)}
          >
            <IconArrowLeft className="size-4" />
          </button>
        )}
        <h1 className="text-lg font-bold tracking-tight">{displayTitle}</h1>
        {description && (
          <span className="text-sm text-muted-foreground">{description}</span>
        )}
      </div>
      {action && <div className="no-drag">{action}</div>}
    </div>
  )
}
