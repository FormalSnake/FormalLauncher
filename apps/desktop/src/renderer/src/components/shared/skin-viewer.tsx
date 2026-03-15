import { useEffect, useRef } from 'react'
import { SkinViewer as SkinView3d, WalkingAnimation } from 'skinview3d'
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

  useEffect(() => {
    if (!canvasRef.current) return

    const viewer = new SkinView3d({
      canvas: canvasRef.current,
      width,
      height,
      skin: skinUrl,
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
  }, [width, height])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    viewer.loadSkin(skinUrl, { model: slim ? 'slim' : 'default' })
  }, [skinUrl, slim])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    if (capeUrl) {
      viewer.loadCape(capeUrl)
    } else {
      viewer.resetCape()
    }
  }, [capeUrl])

  return (
    <canvas
      ref={canvasRef}
      className={cn('rounded-lg', className)}
    />
  )
}
