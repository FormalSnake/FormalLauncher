import { create } from 'zustand'
import type { DownloadProgress } from '@/types/minecraft'

const MAX_LOG_LINES = 1000

interface GameState {
  launchingInstanceId: string | null
  runningInstanceId: string | null
  downloadProgress: DownloadProgress | null
  gameLog: string[]
  setLaunching: (id: string | null) => void
  setRunning: (id: string | null) => void
  setDownloadProgress: (progress: DownloadProgress | null) => void
  appendLog: (line: string) => void
  clearLog: () => void
}

export const useGameStore = create<GameState>((set) => ({
  launchingInstanceId: null,
  runningInstanceId: null,
  downloadProgress: null,
  gameLog: [],

  setLaunching: (id) => set({ launchingInstanceId: id }),
  setRunning: (id) => set({ runningInstanceId: id }),
  setDownloadProgress: (progress) => set({ downloadProgress: progress }),
  appendLog: (line) =>
    set((state) => ({
      gameLog:
        state.gameLog.length >= MAX_LOG_LINES
          ? [...state.gameLog.slice(1), line]
          : [...state.gameLog, line],
    })),
  clearLog: () => set({ gameLog: [] }),
}))
