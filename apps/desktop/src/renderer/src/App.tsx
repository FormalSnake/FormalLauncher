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
