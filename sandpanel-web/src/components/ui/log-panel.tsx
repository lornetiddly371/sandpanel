import { useEffect, useRef, useState } from "react"

type LogEntry = { time: string; line: string }

interface LogPanelProps {
  logs: LogEntry[]
  maxHeight?: string
}

export function LogPanel({ logs, maxHeight = "max-h-72" }: LogPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  // Auto-scroll to bottom when logs change (if autoScroll is on).
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  // Detect manual scroll: if user scrolls up, disable auto-scroll. If they scroll back to bottom, re-enable.
  const handleScroll = () => {
    const el = containerRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    setAutoScroll(atBottom)
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={`${maxHeight} space-y-1 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-300`}
      >
        {logs.map((entry, index) => (
          <p key={`${entry.time}-${index}`}>
            [{new Date(entry.time).toLocaleTimeString()}] {entry.line}
          </p>
        ))}
      </div>
      {!autoScroll && (
        <button
          type="button"
          className="absolute bottom-2 right-2 rounded-lg bg-zinc-700/80 px-2 py-1 text-[10px] text-zinc-300 backdrop-blur-sm hover:bg-zinc-600/80 transition-colors"
          onClick={() => {
            setAutoScroll(true)
            if (containerRef.current) {
              containerRef.current.scrollTop = containerRef.current.scrollHeight
            }
          }}
        >
          ↓ Tail
        </button>
      )}
    </div>
  )
}
