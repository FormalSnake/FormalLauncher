import { useState, useCallback, useRef, useEffect } from 'react'
import type { DeviceCodeInfo } from '@/types/minecraft'
import { useMinecraftAccountsStore } from '@/store/minecraft-accounts.store'
import { useSettingsStore } from '@/store/settings.store'

export function useMinecraftAuth() {
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [deviceCode, setDeviceCode] = useState<DeviceCodeInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  const cleanup = useCallback(() => {
    cleanupRef.current?.()
    cleanupRef.current = null
  }, [])

  useEffect(() => cleanup, [cleanup])

  const login = useCallback(async () => {
    setIsLoggingIn(true)
    setError(null)
    setDeviceCode(null)

    const unsubDeviceCode = window.minecraft.onDeviceCode((code) => {
      setDeviceCode(code as DeviceCodeInfo)
    })
    cleanupRef.current = unsubDeviceCode

    try {
      const gameDir = useSettingsStore.getState().gameDirectory
      const cacheDir = `${gameDir}/auth-cache`
      const account = await window.minecraft.authLogin(cacheDir)
      useMinecraftAccountsStore.getState().addAccount(account)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      cleanup()
      setIsLoggingIn(false)
      setDeviceCode(null)
    }
  }, [cleanup])

  return { login, isLoggingIn, deviceCode, error }
}
