import type { ModLoader } from '@formallauncher/shared'
import { Badge } from '@/components/ui/badge'

const loaderStyles: Record<ModLoader, string> = {
  vanilla: 'bg-green-500/15 text-green-400',
  fabric: 'bg-blue-500/15 text-blue-400',
  forge: 'bg-orange-500/15 text-orange-400',
  quilt: 'bg-purple-500/15 text-purple-400',
  neoforge: 'bg-red-500/15 text-red-400',
}

export function LoaderBadge({ loader }: { loader: ModLoader }) {
  if (loader === 'vanilla') return null
  return (
    <Badge variant="outline" className={loaderStyles[loader]}>
      {loader}
    </Badge>
  )
}
