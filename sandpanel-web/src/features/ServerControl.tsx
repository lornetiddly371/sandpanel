import { Loader2, Play, RotateCcw, Square } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { PasswordInput } from "../components/ui/password-input"
import { useServerStore } from "../store/useServerStore"
import { cn } from "../lib/utils"

function formatUptime(startedAt: string | undefined): string {
  if (!startedAt) return "—"
  const diff = Date.now() - new Date(startedAt).getTime()
  if (diff < 0) return "just started"
  const totalSeconds = Math.floor(diff / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

export function ServerControl() {
  const serverStatus = useServerStore((state) => state.serverStatus)
  const profiles = useServerStore((state) => state.profiles)
  const activeProfileId = useServerStore((state) => state.activeProfileId)
  const controlProfile = useServerStore((state) => state.controlProfile)
  const saveProfile = useServerStore((state) => state.saveProfile)

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeProfileId),
    [profiles, activeProfileId],
  )

  const instance = serverStatus?.instances?.[activeProfileId]
  const running = Boolean(instance?.running)
  const a2sInfo = serverStatus?.a2s?.[activeProfileId]

  const [password, setPassword] = useState("")
  const [securityCode, setSecurityCode] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [uptime, setUptime] = useState("")

  // Sync from profile on load
  useEffect(() => {
    if (activeProfile) {
      setPassword(activeProfile.password ?? "")
    }
  }, [activeProfile])

  // Live uptime counter
  useEffect(() => {
    if (!instance?.startedAt) {
      setUptime("—")
      return
    }
    const update = () => setUptime(formatUptime(instance.startedAt))
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [instance?.startedAt])

  const doAction = async (action: "start" | "stop" | "restart") => {
    setActionLoading(action)
    try {
      await controlProfile(activeProfileId, action)
    } finally {
      setActionLoading(null)
    }
  }

  const saveServerSettings = async () => {
    if (!activeProfile) return
    await saveProfile({
      ...activeProfile,
      password,
    })
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Server Control</h2>
        <p className="text-sm text-zinc-400">
          Manage the server for profile{" "}
          <span className="font-medium text-zinc-300">{activeProfile?.name ?? activeProfileId}</span>
        </p>
      </div>

      {/* Control buttons */}
      <div className="grid grid-cols-3 gap-4">
        <button
          type="button"
          disabled={running || actionLoading !== null}
          className={cn(
            "group relative flex flex-col items-center gap-3 rounded-2xl border-2 px-6 py-8 text-center font-semibold transition-all",
            running
              ? "cursor-not-allowed border-zinc-700/30 bg-zinc-900/30 text-zinc-600"
              : "border-emerald-500/30 bg-emerald-950/20 text-emerald-400 hover:border-emerald-400/60 hover:bg-emerald-950/40 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] active:scale-[0.98]",
          )}
          onClick={() => void doAction("start")}
        >
          {actionLoading === "start" ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            <Play className="h-8 w-8" />
          )}
          <span className="text-lg">Start</span>
        </button>

        <button
          type="button"
          disabled={!running || actionLoading !== null}
          className={cn(
            "group relative flex flex-col items-center gap-3 rounded-2xl border-2 px-6 py-8 text-center font-semibold transition-all",
            !running
              ? "cursor-not-allowed border-zinc-700/30 bg-zinc-900/30 text-zinc-600"
              : "border-amber-500/30 bg-amber-950/20 text-amber-400 hover:border-amber-400/60 hover:bg-amber-950/40 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] active:scale-[0.98]",
          )}
          onClick={() => void doAction("restart")}
        >
          {actionLoading === "restart" ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            <RotateCcw className="h-8 w-8" />
          )}
          <span className="text-lg">Restart</span>
        </button>

        <button
          type="button"
          disabled={!running || actionLoading !== null}
          className={cn(
            "group relative flex flex-col items-center gap-3 rounded-2xl border-2 px-6 py-8 text-center font-semibold transition-all",
            !running
              ? "cursor-not-allowed border-zinc-700/30 bg-zinc-900/30 text-zinc-600"
              : "border-red-500/30 bg-red-950/20 text-red-400 hover:border-red-400/60 hover:bg-red-950/40 hover:shadow-[0_0_30px_rgba(239,68,68,0.15)] active:scale-[0.98]",
          )}
          onClick={() => void doAction("stop")}
        >
          {actionLoading === "stop" ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            <Square className="h-8 w-8" />
          )}
          <span className="text-lg">Stop</span>
        </button>
      </div>

      {/* Server status row */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Status</p>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  running
                    ? "animate-pulse bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                    : "bg-zinc-600",
                )}
              />
              <span className={cn("text-lg font-semibold", running ? "text-emerald-400" : "text-zinc-400")}>
                {running ? "Running" : "Stopped"}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Uptime</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{uptime}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">PID</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{instance?.pid ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Ports</p>
            <p className="mt-1 text-sm font-medium text-zinc-300">
              Game: {activeProfile?.gamePort ?? "—"} · Query: {activeProfile?.queryPort ?? "—"} · RCON: {activeProfile?.rconPort ?? "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* A2S Query Info */}
      {running && a2sInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Server Query (A2S)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {a2sInfo.name && (
                <div>
                  <p className="text-xs text-zinc-500">Server Name</p>
                  <p className="text-sm font-medium">{a2sInfo.name}</p>
                </div>
              )}
              {a2sInfo.map && (
                <div>
                  <p className="text-xs text-zinc-500">Map</p>
                  <p className="text-sm font-medium">{a2sInfo.map}</p>
                </div>
              )}
              {a2sInfo.game && (
                <div>
                  <p className="text-xs text-zinc-500">Game Mode</p>
                  <p className="text-sm font-medium">{a2sInfo.game}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-zinc-500">Players</p>
                <p className="text-sm font-medium">
                  {a2sInfo.players ?? 0} / {a2sInfo.maxPlayers ?? 0}
                </p>
              </div>
              {typeof a2sInfo.vac !== "undefined" && (
                <div>
                  <p className="text-xs text-zinc-500">VAC</p>
                  <p className="text-sm font-medium">{a2sInfo.vac ? "Enabled" : "Disabled"}</p>
                </div>
              )}
              {a2sInfo.version && (
                <div>
                  <p className="text-xs text-zinc-500">Version</p>
                  <p className="text-sm font-medium">{a2sInfo.version}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Server settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Server Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Joining Password</Label>
              <PasswordInput
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Leave empty for no password"
              />
              <p className="mt-1 text-xs text-zinc-500">Players must enter this to join.</p>
            </div>
            <div>
              <Label>Security Code (mod.io)</Label>
              <Input
                value={securityCode}
                onChange={(event) => setSecurityCode(event.target.value)}
                placeholder="5-digit code"
              />
              <p className="mt-1 text-xs text-zinc-500">Enter the code from your email for mod.io auth.</p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 active:scale-[0.98]"
            onClick={() => void saveServerSettings()}
          >
            Save Settings
          </button>
        </CardContent>
      </Card>
    </section>
  )
}
