import { Activity, Clock, Cpu, Globe, Signal, Timer, Users } from "lucide-react"
import { useMemo } from "react"
import { Badge } from "../components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { useServerStore } from "../store/useServerStore"

function StatusPill({ running }: { running: boolean }) {
  return (
    <Badge variant={running ? "success" : "destructive"} className="gap-2 px-3 py-1 text-xs uppercase tracking-wide">
      <span className={running ? "h-2 w-2 animate-pulse rounded-full bg-emerald-300" : "h-2 w-2 rounded-full bg-red-300"} />
      {running ? "Running" : "Stopped"}
    </Badge>
  )
}

function formatUptime(startedAt: string | undefined): string {
  if (!startedAt) return "—"
  const diff = Date.now() - new Date(startedAt).getTime()
  if (diff < 0) return "just started"
  const totalSeconds = Math.floor(diff / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function formatTimeAgo(dateStr: string | undefined): string {
  if (!dateStr) return "—"
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

export function Dashboard() {
  const serverStatus = useServerStore((state) => state.serverStatus)
  const livePlayers = useServerStore((state) => state.livePlayers)
  const profiles = useServerStore((state) => state.profiles)
  const mods = useServerStore((state) => state.mods)

  // Aggregate stats across all profiles
  const serverCards = useMemo(() => {
    if (!serverStatus?.instances) return []
    return profiles
      .map((profile) => {
        const instance = serverStatus.instances[profile.id]
        const a2s = serverStatus.a2s?.[profile.id]
        const profilePlayers = livePlayers.filter(
          (p) => p.sourceId === profile.id && !p.isBot,
        )
        const profileBots = livePlayers.filter(
          (p) => p.sourceId === profile.id && p.isBot,
        )
        return {
          profile,
          instance,
          a2s,
          humanCount: profilePlayers.length,
          botCount: profileBots.length,
          running: Boolean(instance?.running),
        }
      })
      .filter((card) => card.running || card.humanCount > 0)
  }, [serverStatus, profiles, livePlayers])

  const totalHumans = livePlayers.filter((p) => !p.isBot).length
  const totalBots = livePlayers.filter((p) => p.isBot).length
  const cpuPercent = serverStatus?.server?.cpuPercent ?? 0
  const runningCount = serverCards.filter((c) => c.running).length
  const activeMods = mods.filter((m) => m.enabled).length

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
        <p className="text-sm text-zinc-400">Overview of all server instances and global statistics.</p>
      </div>

      {/* Global stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-zinc-800/60 bg-gradient-to-br from-indigo-500/10 to-indigo-700/5">
          <CardContent className="pt-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Players</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{totalHumans}</p>
                {totalBots > 0 && <p className="text-xs text-zinc-500">+ {totalBots} bots</p>}
              </div>
              <Activity className="h-5 w-5 text-indigo-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-800/60 bg-gradient-to-br from-cyan-500/10 to-cyan-700/5">
          <CardContent className="pt-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">CPU</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{cpuPercent}%</p>
              </div>
              <Cpu className="h-5 w-5 text-cyan-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-800/60 bg-gradient-to-br from-emerald-500/10 to-emerald-700/5">
          <CardContent className="pt-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Servers</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{runningCount}</p>
                <p className="text-xs text-zinc-500">of {profiles.length} profiles</p>
              </div>
              <Signal className="h-5 w-5 text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-800/60 bg-gradient-to-br from-violet-500/10 to-violet-700/5">
          <CardContent className="pt-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Active Mods</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{activeMods}</p>
              </div>
              <Globe className="h-5 w-5 text-violet-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-800/60 bg-gradient-to-br from-amber-500/10 to-amber-700/5">
          <CardContent className="pt-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Last Join</p>
                <p className="mt-1 text-lg font-bold">
                  {formatTimeAgo(serverStatus?.lastPlayerJoinedAt)}
                </p>
              </div>
              <Timer className="h-5 w-5 text-amber-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live leaderboard */}
      {livePlayers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Live Leaderboard</h3>
          <Card className="border-zinc-800/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-800/70 text-zinc-300">
                  {/* TODO: i will work on detailed stats (kills, deaths, objectives) later
                     once i figure out how to reliably parse them from the server logs */}
                  <tr>
                    <th className="w-8 px-3 py-3 text-center font-medium">#</th>
                    <th className="px-4 py-3 font-medium">Player</th>
                    <th className="px-4 py-3 text-right font-medium">Score</th>
                    <th className="px-4 py-3 font-medium">Connected</th>
                    <th className="px-4 py-3 font-medium">Server</th>
                    <th className="px-4 py-3 font-medium">SteamID</th>
                  </tr>
                </thead>
                <tbody>
                  {[...livePlayers]
                    .sort((a, b) => (b.lastScore ?? 0) - (a.lastScore ?? 0))
                    .map((player, idx) => (
                      <tr
                        key={`${player.steamId}-${player.sourceId}`}
                        className={`border-t border-zinc-800/40 ${
                          idx === 0 && !player.isBot
                            ? "bg-amber-500/5"
                            : idx === 1 && !player.isBot
                              ? "bg-zinc-500/5"
                              : idx === 2 && !player.isBot
                                ? "bg-orange-500/5"
                                : ""
                        }`}
                      >
                        <td className="px-3 py-2.5 text-center">
                          {!player.isBot && idx < 3 ? (
                            <span className={`text-sm font-bold ${
                              idx === 0 ? "text-amber-400" : idx === 1 ? "text-zinc-300" : "text-orange-400"
                            }`}>
                              {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-500">{idx + 1}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-zinc-200">{player.name}</span>
                            {player.isBot && (
                              <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] uppercase text-zinc-400">Bot</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-medium text-zinc-200">{player.lastScore ?? 0}</td>
                        <td className="px-4 py-2.5 text-zinc-400">{formatUptime(player.joinedAt)}</td>
                        <td className="px-4 py-2.5 text-zinc-400">{player.sourceName}</td>
                        <td className="px-4 py-2.5">
                          {!player.isBot && player.steamId ? (
                            <a
                              href={`https://steamcommunity.com/profiles/${player.steamId}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-mono text-xs text-indigo-400 hover:text-indigo-300 hover:underline"
                            >
                              {player.steamId}
                            </a>
                          ) : (
                            <span className="font-mono text-xs text-zinc-600">{player.steamId || "—"}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Per-server cards */}
      {serverCards.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Server Instances</h3>
          <div className="grid gap-4 lg:grid-cols-2">
            {serverCards.map(({ profile, instance, a2s, humanCount, botCount, running }) => (
              <Card key={profile.id} className="border-zinc-800/60">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{profile.name}</CardTitle>
                    <StatusPill running={running} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <div>
                      <p className="text-xs text-zinc-500">Players</p>
                      <p className="font-medium">
                        <Users className="mr-1 inline h-3.5 w-3.5 text-zinc-400" />
                        {humanCount}{botCount > 0 ? ` + ${botCount} bots` : ""}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Uptime</p>
                      <p className="font-medium">
                        <Clock className="mr-1 inline h-3.5 w-3.5 text-zinc-400" />
                        {formatUptime(instance?.startedAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Map</p>
                      <p className="font-medium">{a2s?.map ?? profile.defaultMap ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Ports</p>
                      <p className="font-medium text-xs">
                        {profile.gamePort} / {profile.queryPort} / {profile.rconPort}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card className="border-zinc-800/60">
          <CardContent className="py-12 text-center">
            <Signal className="mx-auto mb-3 h-8 w-8 text-zinc-600" />
            <p className="text-sm text-zinc-500">No servers are currently running.</p>
            <p className="text-xs text-zinc-600">Start a profile from Server Control to see it here.</p>
          </CardContent>
        </Card>
      )}
    </section>
  )
}
