import { useEffect, useRef } from 'react'
import { useGameStore } from '@/store/game.store'
import { cn } from '@/lib/utils'

interface GameTerminalProps {
  className?: string
}

export function GameTerminal({ className }: GameTerminalProps) {
  const gameLog = useGameStore((s) => s.gameLog)
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<import('ghostty-web').Terminal | null>(null)
  const fitAddonRef = useRef<import('ghostty-web').FitAddon | null>(null)
  const writtenCountRef = useRef(0)

  useEffect(() => {
    let disposed = false

    async function setup() {
      const { init, Terminal, FitAddon } = await import('ghostty-web')
      await init()
      if (disposed || !containerRef.current) return

      const terminal = new Terminal({
        convertEol: true,
        disableStdin: true,
        fontSize: 12,
        fontFamily: 'monospace',
        scrollback: 5000,
        theme: { background: '#09090b' },
      })

      const fitAddon = new FitAddon()
      terminal.loadAddon(fitAddon)
      terminal.open(containerRef.current)
      fitAddon.observeResize()

      terminalRef.current = terminal
      fitAddonRef.current = fitAddon

      const log = useGameStore.getState().gameLog
      for (const line of log) {
        terminal.writeln(line)
      }
      writtenCountRef.current = log.length
    }

    setup()

    return () => {
      disposed = true
      fitAddonRef.current?.dispose()
      terminalRef.current?.dispose()
      terminalRef.current = null
      fitAddonRef.current = null
      writtenCountRef.current = 0
    }
  }, [])

  useEffect(() => {
    const terminal = terminalRef.current
    if (!terminal) return

    if (gameLog.length === 0 && writtenCountRef.current > 0) {
      terminal.clear()
      writtenCountRef.current = 0
      return
    }

    for (let i = writtenCountRef.current; i < gameLog.length; i++) {
      terminal.writeln(gameLog[i])
    }
    writtenCountRef.current = gameLog.length
  }, [gameLog])

  return (
    <div
      ref={containerRef}
      className={cn('h-80 overflow-hidden rounded-md border border-border', className)}
    />
  )
}
