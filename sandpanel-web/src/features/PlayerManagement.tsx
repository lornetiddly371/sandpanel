import { MoreHorizontal, Search, ShieldBan, UserX, Clock, Eye, EyeOff, ChevronDown, ChevronRight } from "lucide-react"
import { useEffect, useState, useMemo, Fragment } from "react"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { api } from "../lib/api"
import { useServerStore } from "../store/useServerStore"

type PlayerHistoryRecord = {
  steamId: string
  name: string
  knownIps?: string[]
  firstSeenAt?: string
  lastSeenAt?: string
  lastServer?: string
  lastScore?: number
  highScore?: number
  totalScore?: number
  totalKills?: number
  totalDeaths?: number
  totalObjectives?: number
  lastDurationSeconds?: number
  totalDurationSeconds?: number
  longestDurationSeconds?: number
}

function timeSince(dateStr: string | undefined): string {
  if (!dateStr) return "Never"
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 0) return "just now"
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ${minutes % 60}m ago`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h ago`
}

function formatDuration(seconds: number | undefined): string {
  if (!seconds || seconds <= 0) return "—"
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—"
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    + " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
}

export function PlayerManagement() {
  const players = useServerStore((state) => state.livePlayers)
  const moderatePlayer = useServerStore((state) => state.moderatePlayer)
  const serverStatus = useServerStore((state) => state.serverStatus)

  const lastJoinText = useMemo(() => timeSince(serverStatus?.lastPlayerJoinedAt), [serverStatus?.lastPlayerJoinedAt])

  const [banSteamId, setBanSteamId] = useState("")
  const [banReason, setBanReason] = useState("Managed by SandPanel")
  const [unbanSteamId, setUnbanSteamId] = useState("")
  const [history, setHistory] = useState<PlayerHistoryRecord[]>([])
  const [historySearch, setHistorySearch] = useState("")
  const [showIps, setShowIps] = useState(false)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  useEffect(() => {
    void api.getPlayersHistory().then((data) => {
      setHistory(Array.isArray(data.players) ? data.players as PlayerHistoryRecord[] : [])
    })
  }, [])

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return history
    const q = historySearch.toLowerCase()
    return history.filter(
      (p) =>
        (p.name ?? "").toLowerCase().includes(q) ||
        (p.steamId ?? "").toLowerCase().includes(q)
    )
  }, [history, historySearch])

  const runKick = async (steamId: string) => {
    await moderatePlayer("kick", steamId, "Kicked by administrator")
  }

  const runBan = async (steamId: string) => {
    await moderatePlayer("ban", steamId, "Banned by administrator")
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Player Management</h2>
          <p className="text-sm text-zinc-400">Currently connected players with one-click kick and ban moderation.</p>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
            <Clock className="h-3 w-3" />
            <span>Last player joined: {lastJoinText}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary">
                <ShieldBan className="mr-2 h-4 w-4" />
                Add Ban
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Ban by SteamID</DialogTitle>
                <DialogDescription>Manual SteamID entry is isolated to this modal.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>SteamID</Label>
                  <Input value={banSteamId} onChange={(event) => setBanSteamId(event.target.value)} placeholder="7656119..." />
                </div>
                <div>
                  <Label>Reason</Label>
                  <Input value={banReason} onChange={(event) => setBanReason(event.target.value)} />
                </div>
                <Button
                  className="w-full"
                  variant="destructive"
                  onClick={() => {
                    if (banSteamId.trim()) {
                      void moderatePlayer("ban", banSteamId.trim(), banReason)
                      setBanSteamId("")
                    }
                  }}
                >
                  Add Ban
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Unban SteamID</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Remove Ban</DialogTitle>
                <DialogDescription>Use exact SteamID to remove an existing ban.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>SteamID</Label>
                  <Input value={unbanSteamId} onChange={(event) => setUnbanSteamId(event.target.value)} placeholder="7656119..." />
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    if (unbanSteamId.trim()) {
                      void moderatePlayer("unban", unbanSteamId.trim(), "")
                      setUnbanSteamId("")
                    }
                  }}
                >
                  Remove Ban
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Live Players */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-800/70 text-zinc-300">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">SteamID</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={`${player.steamId}-${player.sourceId}`} className="border-t border-zinc-800/60 text-zinc-200">
                  <td className="px-4 py-3">{player.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{player.steamId}</td>
                  <td className="px-4 py-3">{player.sourceName}</td>
                  <td className="px-4 py-3">{new Date(player.joinedAt).toLocaleTimeString()}</td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => void runKick(player.steamId)}>
                          <UserX className="mr-2 h-4 w-4" />
                          Kick
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-300" onClick={() => void runBan(player.steamId)}>
                          <ShieldBan className="mr-2 h-4 w-4" />
                          Ban
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {players.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-zinc-500">
                    No active players.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Player History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Player History</CardTitle>
              <p className="text-sm text-zinc-400">Previously seen players from the server database.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowIps(!showIps)}
                className="text-xs text-zinc-400"
              >
                {showIps ? <EyeOff className="mr-1.5 h-3.5 w-3.5" /> : <Eye className="mr-1.5 h-3.5 w-3.5" />}
                {showIps ? "Hide IPs" : "Show IPs"}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => void api.getPlayersHistory().then((data) => setHistory(Array.isArray(data.players) ? data.players as PlayerHistoryRecord[] : []))}>
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              value={historySearch}
              onChange={(event) => setHistorySearch(event.target.value)}
              placeholder="Search by name or SteamID"
              className="pl-9"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-800/70 text-zinc-300">
                {/* TODO: i will work on detailed stats (kills, deaths, objectives) later
                   once i figure out how to reliably parse them from the server logs */}
                <tr>
                  <th className="w-8 px-3 py-3" />
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">SteamID</th>
                  <th className="px-4 py-3 text-right font-medium">Total Score</th>
                  <th className="px-4 py-3 font-medium">Last Seen</th>
                  <th className="px-4 py-3 font-medium">Playtime</th>
                  {showIps && <th className="px-4 py-3 font-medium">IPs</th>}
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((player) => {
                  const isExpanded = expandedRow === player.steamId
                  return (
                    <Fragment key={player.steamId}>
                      <tr
                        className={`border-t border-zinc-800/60 text-zinc-200 cursor-pointer transition-colors hover:bg-zinc-800/30 ${isExpanded ? "bg-zinc-800/20" : ""}`}
                        onClick={() => setExpandedRow(isExpanded ? null : player.steamId)}
                      >
                        <td className="px-3 py-3 text-zinc-500">
                          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </td>
                        <td className="px-4 py-3 font-medium">{player.name || "Unknown"}</td>
                        <td className="px-4 py-3">
                          <a
                            href={`https://steamcommunity.com/profiles/${player.steamId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-xs text-indigo-400 hover:text-indigo-300 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {player.steamId}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <span className="font-medium text-zinc-200">{player.totalScore ?? 0}</span>
                          {player.highScore ? (
                            <span className="ml-1.5 text-[10px] text-zinc-500">hi:{player.highScore}</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-zinc-400 text-xs">{timeSince(player.lastSeenAt)}</td>
                        <td className="px-4 py-3 text-zinc-400 text-xs">{formatDuration(player.totalDurationSeconds)}</td>
                        {showIps && (
                          <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                            {(player.knownIps ?? []).join(", ") || "—"}
                          </td>
                        )}
                      </tr>
                      {isExpanded && (
                        <tr className="border-t border-zinc-800/30 bg-zinc-900/40">
                          <td colSpan={showIps ? 7 : 6} className="px-8 py-4">
                            <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-xs sm:grid-cols-4">
                              <div>
                                <span className="text-zinc-500">First Seen</span>
                                <p className="text-zinc-300">{formatDate(player.firstSeenAt)}</p>
                              </div>
                              <div>
                                <span className="text-zinc-500">Last Seen</span>
                                <p className="text-zinc-300">{formatDate(player.lastSeenAt)}</p>
                              </div>
                              <div>
                                <span className="text-zinc-500">Last Server</span>
                                <p className="text-zinc-300">{player.lastServer || "—"}</p>
                              </div>
                              <div>
                                <span className="text-zinc-500">Last Session Score</span>
                                <p className="text-zinc-300">{player.lastScore ?? "—"}</p>
                              </div>
                              <div>
                                <span className="text-zinc-500">Longest Session</span>
                                <p className="text-zinc-300">{formatDuration(player.longestDurationSeconds)}</p>
                              </div>
                              <div>
                                <span className="text-zinc-500">Total Playtime</span>
                                <p className="text-zinc-300">{formatDuration(player.totalDurationSeconds)}</p>
                              </div>
                              <div>
                                <span className="text-zinc-500">High Score</span>
                                <p className="text-zinc-300">{player.highScore ?? "—"}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={showIps ? 7 : 6} className="px-4 py-10 text-center text-zinc-500">
                      No player history available.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
