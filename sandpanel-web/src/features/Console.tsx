import { MessageSquare, Send, TerminalSquare } from "lucide-react"
import { useRef, useEffect, useState, useCallback } from "react"
import { Button } from "../components/ui/button"
import { Card } from "../components/ui/card"
import { useServerStore } from "../store/useServerStore"
import { cn } from "../lib/utils"

type InputMode = "rcon" | "message"

export function ConsoleScreen() {
  const logs = useServerStore((state) => state.logs)
  const runCommand = useServerStore((state) => state.runCommand)
  const activeProfileId = useServerStore((state) => state.activeProfileId)
  const profiles = useServerStore((state) => state.profiles)
  const activeProfile = profiles.find((p) => p.id === activeProfileId)

  const [command, setCommand] = useState("")
  const [mode, setMode] = useState<InputMode>("rcon")
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll log output to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  const sendCommand = useCallback(
    async (overrideMode?: InputMode) => {
      const trimmed = command.trim()
      if (!trimmed) return

      const effectiveMode = overrideMode ?? mode
      const actual = effectiveMode === "message" ? `say ${trimmed}` : trimmed

      await runCommand(actual, {
        targetType: "profile",
        targetId: activeProfileId,
        host: "",
        port: 0,
        password: "",
      })
      setCommand("")
      inputRef.current?.focus()
    },
    [command, mode, runCommand, activeProfileId],
  )

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      // AltGr+Enter (or right alt+enter) sends as the opposite mode
      if (event.getModifierState("AltGraph") || (event.altKey && event.ctrlKey)) {
        void sendCommand(mode === "rcon" ? "message" : "rcon")
      } else {
        void sendCommand()
      }
    }
  }

  return (
    <section className="flex h-full flex-col gap-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">RCON</h2>
        <p className="text-sm text-zinc-400">
          Send RCON commands or server messages to{" "}
          <span className="font-medium text-zinc-300">{activeProfile?.name ?? activeProfileId}</span>
        </p>
      </div>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-zinc-800/50 bg-zinc-900">
        {/* Log output */}
        <div ref={scrollRef} className="flex-1 space-y-0.5 overflow-y-auto p-4 font-mono text-xs text-zinc-300">
          {logs.map((entry, index) => (
            <p key={`${entry.time}-${index}`} className="whitespace-pre-wrap break-words leading-relaxed">
              <span className="text-zinc-500">[{new Date(entry.time).toLocaleTimeString()}]</span>{" "}
              <span
                className={cn(
                  entry.type === "command" && "text-indigo-400",
                  entry.type === "response" && "text-emerald-400",
                  entry.type === "error" && "text-red-400",
                )}
              >
                {entry.line}
              </span>
            </p>
          ))}
          {logs.length === 0 ? (
            <p className="text-zinc-500">
              No log output yet. Send a command or wait for server events.
            </p>
          ) : null}
        </div>

        {/* Input bar */}
        <div className="border-t border-zinc-800 bg-zinc-950/80 p-3">
          {/* Mode toggle */}
          <div className="mb-2 flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-zinc-700/50 bg-zinc-900 p-0.5">
              <button
                type="button"
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all",
                  mode === "rcon"
                    ? "bg-indigo-500/90 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200",
                )}
                onClick={() => setMode("rcon")}
              >
                <TerminalSquare className="h-3 w-3" />
                RCON
              </button>
              <button
                type="button"
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all",
                  mode === "message"
                    ? "bg-emerald-500/90 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200",
                )}
                onClick={() => setMode("message")}
              >
                <MessageSquare className="h-3 w-3" />
                Message
              </button>
            </div>
            <span className="text-[10px] text-zinc-500">
              {mode === "rcon" ? "AltGr+Enter to quick-send as message" : "AltGr+Enter to quick-send as RCON"}
            </span>
          </div>

          {/* Command input */}
          <div
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors",
              mode === "rcon"
                ? "border-indigo-500/30 bg-zinc-900"
                : "border-emerald-500/30 bg-zinc-900",
            )}
          >
            {mode === "rcon" ? (
              <TerminalSquare className="h-4 w-4 shrink-0 text-indigo-400" />
            ) : (
              <MessageSquare className="h-4 w-4 shrink-0 text-emerald-400" />
            )}
            <input
              ref={inputRef}
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              placeholder={mode === "rcon" ? "Enter RCON command..." : "Type a message to send to the server..."}
              className="h-8 flex-1 border-0 bg-transparent font-mono text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
              onKeyDown={handleKeyDown}
            />
            <Button
              size="sm"
              variant={mode === "rcon" ? "default" : "default"}
              className={cn(
                "gap-1.5",
                mode === "message" && "bg-emerald-600 hover:bg-emerald-500",
              )}
              onClick={() => void sendCommand()}
            >
              <Send className="h-3.5 w-3.5" />
              Send
            </Button>
          </div>
        </div>
      </Card>
    </section>
  )
}
