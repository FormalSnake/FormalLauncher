import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

export function useUpdateToast(): void {
  const toastIdRef = useRef<string | number | undefined>(undefined)

  useEffect(() => {
    const cleanupAvailable = window.updates.onUpdateAvailable(() => {
      toastIdRef.current = toast.loading('Update available', {
        description: 'Downloading update...',
        duration: Infinity,
      })
    })

    const cleanupProgress = window.updates.onDownloadProgress(({ percent }) => {
      toast.loading('Downloading update...', {
        id: toastIdRef.current,
        description: `${percent}% downloaded`,
        duration: Infinity,
      })
    })

    const cleanupDownloaded = window.updates.onUpdateDownloaded(() => {
      toast.success('Update ready', {
        id: toastIdRef.current,
        description: 'Restart to apply the update.',
        duration: Infinity,
        action: {
          label: 'Restart',
          onClick: () => window.updates.restartAndInstall(),
        },
      })
    })

    const cleanupError = window.updates.onError((msg) => {
      toast.error('Update failed', {
        id: toastIdRef.current,
        description: msg,
      })
    })

    return () => {
      cleanupAvailable()
      cleanupProgress()
      cleanupDownloaded()
      cleanupError()
    }
  }, [])
}
