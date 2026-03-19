import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { LogPanel } from "../components/ui/log-panel"
import { api } from "../lib/api"
import { useServerStore } from "../store/useServerStore"

export function LogsCenter() {
  const activeProfileId = useServerStore((state) => state.activeProfileId)
  const profiles = useServerStore((state) => state.profiles)
  const activeProfile = profiles.find((p) => p.id === activeProfileId)

  const [wrapperLogs, setWrapperLogs] = useState<Array<{ time: string; line: string }>>([])
  const [steamLogs, setSteamLogs] = useState<Array<{ time: string; line: string }>>([])
  const [profileKind, setProfileKind] = useState("server")
  const [profileLogs, setProfileLogs] = useState<Array<{ time: string; line: string }>>([])
  const pollRef = useRef<number | null>(null)

  const refresh = useCallback(async () => {
    const [w, s, p] = await Promise.all([
      api.getWrapperLogs(),
      api.getSteamcmdLogs(),
      api.getProfileLogs(activeProfileId, profileKind),
    ])
    setWrapperLogs(Array.isArray(w.logs) ? w.logs : [])
    setSteamLogs(Array.isArray(s.logs) ? s.logs : [])
    setProfileLogs(Array.isArray(p.logs) ? p.logs : [])
  }, [activeProfileId, profileKind])

  // Auto-refresh every 5s
  useEffect(() => {
    void refresh()
    pollRef.current = window.setInterval(() => void refresh(), 5000)
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current)
    }
  }, [refresh])

  const kindOptions = ["server", "stdout", "stderr"]

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Logs</h2>
          <p className="text-sm text-zinc-400">
            Live logs for profile{" "}
            <span className="font-medium text-zinc-300">{activeProfile?.name ?? activeProfileId}</span>
            . Auto-refreshes every 5 seconds.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => void refresh()}>Refresh</Button>
          <Button variant="outline" size="sm" asChild>
            <a href={api.downloadUrls.wrapperLogs} target="_blank" rel="noreferrer">Download Wrapper</a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={api.downloadUrls.profileLogs(activeProfileId)} target="_blank" rel="noreferrer">Download Profile</a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={api.downloadUrls.logsArchive()} target="_blank" rel="noreferrer">Download All</a>
          </Button>
        </div>
      </div>

      {/* Profile log kind selector */}
      <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
        {kindOptions.map((kind) => (
          <button
            key={kind}
            type="button"
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              profileKind === kind
                ? "bg-indigo-500/90 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
            onClick={() => setProfileKind(kind)}
          >
            {kind}
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Wrapper Logs</CardTitle>
          </CardHeader>
          <CardContent>
            {wrapperLogs.length > 0 ? (
              <LogPanel logs={wrapperLogs} />
            ) : (
              <p className="py-8 text-center text-xs text-zinc-500">No wrapper logs available.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">SteamCMD Logs</CardTitle>
          </CardHeader>
          <CardContent>
            {steamLogs.length > 0 ? (
              <LogPanel logs={steamLogs} />
            ) : (
              <p className="py-8 text-center text-xs text-zinc-500">No SteamCMD logs available.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Profile Logs ({profileKind})</CardTitle>
          </CardHeader>
          <CardContent>
            {profileLogs.length > 0 ? (
              <LogPanel logs={profileLogs} />
            ) : (
              <p className="py-8 text-center text-xs text-zinc-500">No profile logs available.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
