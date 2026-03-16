import { useEffect, useRef } from 'react'
import { SkinViewer as SkinView3d, WalkingAnimation } from 'skinview3d'
import { useProxiedImage } from '@/hooks/use-proxied-image'
import { cn } from '@/lib/utils'

interface SkinViewerProps {
  skinUrl: string
  capeUrl?: string
  slim?: boolean
  backEquipment?: 'cape' | 'elytra'
  width?: number
  height?: number
  className?: string
}

export function SkinViewer({
  skinUrl,
  capeUrl,
  slim = false,
  backEquipment = 'cape',
  width = 300,
  height = 400,
  className,
}: SkinViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewerRef = useRef<SkinView3d | null>(null)

  const { data: proxiedSkin } = useProxiedImage(skinUrl)
  const { data: proxiedCape } = useProxiedImage(capeUrl)

  useEffect(() => {
    if (!canvasRef.current || !proxiedSkin) return

    const viewer = new SkinView3d({
      canvas: canvasRef.current,
      width,
      height,
      skin: proxiedSkin,
      model: slim ? 'slim' : 'default',
    })
    viewer.animation = new WalkingAnimation()
    viewer.autoRotate = true
    viewer.autoRotateSpeed = 1
    viewerRef.current = viewer

    if (proxiedCape) {
      viewer.loadCape(proxiedCape, { backEquipment })
    }

    return () => {
      viewer.dispose()
      viewerRef.current = null
    }
  }, [width, height, proxiedSkin, proxiedCape, slim, backEquipment])

  return (
    <canvas
      ref={canvasRef}
      className={cn('rounded-lg', className)}
    />
  )
}
