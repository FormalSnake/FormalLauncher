import { RouterProvider } from 'react-router'
import { router } from '@/lib/routes'
import { TooltipProvider } from '@/components/ui/tooltip'

function App(): React.JSX.Element {
  return (
    <TooltipProvider>
      <RouterProvider router={router} />
    </TooltipProvider>
  )
}

export default App
