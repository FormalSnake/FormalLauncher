import { useEffect } from 'react'
import { RouterProvider } from 'react-router'
import { router } from '@/lib/routes'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useSettingsStore } from '@/store/settings.store'

function App(): React.JSX.Element {
  useEffect(() => {
    useSettingsStore.getState().initialize()
  }, [])

  return (
    <TooltipProvider>
      <RouterProvider router={router} />
    </TooltipProvider>
  )
}

export default App
