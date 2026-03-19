import { useEffect, useState } from "react"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { api } from "../lib/api"
import { LogPanel } from "../components/ui/log-panel"

export function SteamcmdCenter() {
  const [status, setStatus] = useState<Record<string, unknown>>({})
  const [logs, setLogs] = useState<Array<{ time: string; line: string }>>([])
  const [runArgs, setRunArgs] = useState("+app_status 581330")
  const [steamGuardCode, setSteamGuardCode] = useState("")

  async function refresh() {
    const [s, l] = await Promise.all([api.getSteamcmdStatus(), api.getSteamcmdLogs()])
    setStatus(s)
    setLogs(Array.isArray(l.logs) ? l.logs : [])
  }

  useEffect(() => {
    void refresh()
  }, [])

  const guardCode = steamGuardCode.trim() || undefined

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">SteamCMD</h2>
        <p className="text-sm text-zinc-400">Install, check updates, stop jobs, run allowed commands, and inspect logs.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Steam Guard Code</Label>
            <Input value={steamGuardCode} onChange={(event) => setSteamGuardCode(event.target.value)} placeholder="Leave empty if not required" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void api.runSteamcmdInstall(false, guardCode).then(setStatus)}>Install</Button>
            <Button variant="secondary" onClick={() => void api.runSteamcmdInstall(true, guardCode).then(setStatus)}>
              Install + Validate
            </Button>
            <Button variant="outline" onClick={() => void api.runSteamcmdUpdateCheck(guardCode).then(setStatus)}>
              Check Update
            </Button>
            <Button variant="destructive" onClick={() => void api.stopSteamcmd().then(setStatus)}>
              Stop Job
            </Button>
            <Button variant="secondary" onClick={() => void refresh()}>
              Refresh
            </Button>
          </div>

          <div>
            <Label>Custom Args</Label>
            <Input value={runArgs} onChange={(event) => setRunArgs(event.target.value)} />
          </div>
          <Button
            variant="outline"
            onClick={() =>
              void api
                .runSteamcmdCommand(
                  runArgs
                    .split(/\s+/)
                    .map((item) => item.trim())
                    .filter(Boolean),
                )
                .then(setStatus)
            }
          >
            Run Command
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-64 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300">{JSON.stringify(status, null, 2)}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SteamCMD Logs</CardTitle>
        </CardHeader>
        <CardContent>
            <LogPanel logs={logs} />
        </CardContent>
      </Card>
    </section>
  )
}
