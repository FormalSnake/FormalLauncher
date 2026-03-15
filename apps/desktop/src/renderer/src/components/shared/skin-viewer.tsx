import { useEffect, useRef } from 'react'
import { SkinViewer as SkinView3d, WalkingAnimation } from 'skinview3d'
import { useProxiedImage } from '@/hooks/use-proxied-image'
import { cn } from '@/lib/utils'

interface SkinViewerProps {
  skinUrl: string
  capeUrl?: string
  slim?: boolean
  width?: number
  height?: number
  className?: string
}

export function SkinViewer({
  skinUrl,
  capeUrl,
  slim = false,
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

    return () => {
      viewer.dispose()
      viewerRef.current = null
    }
  }, [width, height, proxiedSkin])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || !proxiedSkin) return
    viewer.loadSkin(proxiedSkin, { model: slim ? 'slim' : 'default' })
  }, [proxiedSkin, slim])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    if (proxiedCape) {
      viewer.loadCape(proxiedCape)
    } else {
      viewer.resetCape()
    }
  }, [proxiedCape])

  return (
    <canvas
      ref={canvasRef}
      className={cn('rounded-lg', className)}
    />
  )
}
