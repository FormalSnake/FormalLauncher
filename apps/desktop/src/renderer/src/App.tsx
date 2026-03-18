import { useEffect } from 'react'
import { RouterProvider } from 'react-router'
import { router } from '@/lib/routes'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { useSettingsStore } from '@/store/settings.store'
import { useUpdateToast } from '@/hooks/use-update-toast'

function App(): React.JSX.Element {
  useEffect(() => {
    useSettingsStore.getState().initialize()
  }, [])

  const theme = useSettingsStore((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
      return
    }
    if (theme === 'light') {
      root.classList.remove('dark')
      return
    }
    // system
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = (e: MediaQueryList | MediaQueryListEvent) =>
      e.matches ? root.classList.add('dark') : root.classList.remove('dark')
    apply(mq)
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])

  useEffect(() => {
    return window.app.onOpenProject((slug) => {
      router.navigate('/browse/' + slug)
    })
  }, [])

  useUpdateToast()

  return (
    <TooltipProvider>
      <RouterProvider router={router} />
      <Toaster position="bottom-right" />
    </TooltipProvider>
  )
}

export default App
