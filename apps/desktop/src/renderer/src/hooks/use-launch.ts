import { useCallback, useRef, useEffect } from 'react'
import { useGameStore } from '@/store/game.store'
import { useInstancesStore } from '@/store/instances.store'
import { useMinecraftAccountsStore } from '@/store/minecraft-accounts.store'
import { useSettingsStore } from '@/store/settings.store'
import type { DownloadProgress } from '@/types/minecraft'

export function useLaunch() {
  const {
    launchingInstanceId,
    runningInstanceId,
    downloadProgress,
    gameLog,
    setLaunching,
    setRunning,
    setDownloadProgress,
    appendLog,
    clearLog,
  } = useGameStore()

  const cleanupFns = useRef<(() => void)[]>([])

  const cleanupAll = useCallback(() => {
    cleanupFns.current.forEach((fn) => fn())
    cleanupFns.current = []
  }, [])

  useEffect(() => cleanupAll, [cleanupAll])

  const launch = useCallback(
    async (instanceId: string) => {
      if (runningInstanceId || launchingInstanceId) return

      const instance = useInstancesStore
        .getState()
        .instances.find((i) => i.id === instanceId)
      if (!instance) return

      const account = useMinecraftAccountsStore.getState().getActiveAccount()
      if (!account || !account.accessToken) return

      const settings = useSettingsStore.getState()
      const gameDir = settings.gameDirectory

      clearLog()
      setLaunching(instanceId)

      const unsubProgress = window.minecraft.onDownloadProgress(
        (progress: unknown) => {
          setDownloadProgress(progress as DownloadProgress)
        },
      )
      cleanupFns.current.push(unsubProgress)

      try {
        await window.minecraft.downloadGame(gameDir, instance.minecraftVersion)
        setDownloadProgress(null)

        const unsubStdout = window.minecraft.onStdout((data) =>
          appendLog(data),
        )
        const unsubStderr = window.minecraft.onStderr((data) =>
          appendLog(data),
        )
        const unsubExit = window.minecraft.onExit(() => {
          setRunning(null)
          setLaunching(null)
          cleanupAll()
        })
        cleanupFns.current.push(unsubStdout, unsubStderr, unsubExit)

        await window.minecraft.launch({
          versionId: instance.minecraftVersion,
          gameDir,
          auth: {
            id: account.id,
            name: account.name,
            accessToken: account.accessToken,
          },
          javaPath: settings.javaPath || undefined,
          jvmArgs: (instance.jvmArgs || settings.defaultJvmArgs || undefined)
            ?.split(' ')
            .filter(Boolean),
          ramMb: instance.ramMb ?? settings.defaultRamMb,
        })

        setLaunching(null)
        setRunning(instanceId)
      } catch (err) {
        appendLog(
          `Launch failed: ${err instanceof Error ? err.message : String(err)}`,
        )
        setLaunching(null)
        setDownloadProgress(null)
        cleanupAll()
      }
    },
    [
      runningInstanceId,
      launchingInstanceId,
      clearLog,
      setLaunching,
      setDownloadProgress,
      appendLog,
      setRunning,
      cleanupAll,
    ],
  )

  return {
    launch,
    isDownloading: !!downloadProgress,
    isRunning: !!runningInstanceId,
    isLaunching: !!launchingInstanceId,
    downloadProgress,
    gameLog,
  }
}
