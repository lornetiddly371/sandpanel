import { ExternalLink, Plus } from "lucide-react"
import { useEffect, useState } from "react"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Switch } from "../components/ui/switch"
import { api } from "../lib/api"
import { useServerStore } from "../store/useServerStore"

export function ModManagement() {
  const mods = useServerStore((state) => state.mods)
  const addMod = useServerStore((state) => state.addMod)
  const toggleMod = useServerStore((state) => state.toggleMod)
  const activeProfileId = useServerStore((state) => state.activeProfileId)
  const profiles = useServerStore((state) => state.profiles)
  const activeProfile = profiles.find((p) => p.id === activeProfileId)

  const [newModId, setNewModId] = useState("")
  const [modsOrder, setModsOrder] = useState("")

  useEffect(() => {
    void (async () => {
      const state = await api.getModsState(activeProfileId)
      if (Array.isArray(state.mods)) {
        setModsOrder(state.mods.join("\n"))
      }
    })()
  }, [activeProfileId])

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Mods</h2>
          <p className="text-sm text-zinc-400">
            Managing mods for profile{" "}
            <span className="font-medium text-zinc-300">{activeProfile?.name ?? activeProfileId}</span>
          </p>
        </div>
      </div>

      <div className="flex w-full max-w-md items-center gap-2">
        <Input value={newModId} onChange={(event) => setNewModId(event.target.value)} placeholder="mod.io ID" />
        <Button
          onClick={() => {
            const trimmed = newModId.trim()
            if (trimmed) {
              void addMod(trimmed)
              setNewModId("")
            }
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mods Order & State</CardTitle>
          <CardDescription>Manage the load order for Mods.txt synchronization.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            className="min-h-36 w-full rounded-xl border border-zinc-700 bg-zinc-900/50 p-3 text-sm"
            value={modsOrder}
            onChange={(event) => setModsOrder(event.target.value)}
            placeholder="One mod ID per line"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                void api.getModsState(activeProfileId).then((state) => {
                  if (Array.isArray(state.mods)) {
                    setModsOrder(state.mods.join("\n"))
                  }
                })
              }
            >
              Reload State
            </Button>
            <Button
              onClick={() =>
                void api.saveModsOrder(
                  modsOrder
                    .split(/\n/)
                    .map((item) => item.trim())
                    .filter(Boolean),
                  activeProfileId,
                )
              }
            >
              Save Order
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {mods.map((mod) => (
          <Card key={mod.id} className="relative overflow-hidden bg-zinc-900">
            {mod.logo ? (
              <div
                className="h-40 w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${mod.logo})` }}
                role="img"
                aria-label={mod.name}
              />
            ) : null}
            <div className="absolute right-4 top-4">
              <Badge variant={mod.enabled ? "success" : "default"}>{mod.enabled ? "Enabled" : "Disabled"}</Badge>
            </div>
            <CardHeader>
              <CardTitle className="pr-20">{mod.name || `Mod ${mod.id}`}</CardTitle>
              <CardDescription className="line-clamp-2">{mod.summary || "No summary available"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">ID</span>
                <span className="font-mono text-xs text-zinc-300">{mod.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Downloads</span>
                <span className="text-sm text-zinc-200">{mod.downloads ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Subscribers</span>
                <span className="text-sm text-zinc-200">{mod.subscribers ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Author</span>
                <span className="text-sm text-zinc-200">{mod.author || "Unknown"}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {mod.tags?.slice(0, 4).map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2">
                <span className="text-sm text-zinc-300">Enabled</span>
                <Switch checked={mod.enabled} onCheckedChange={(checked) => void toggleMod(mod.id, checked)} />
              </div>
              {mod.profileUrl ? (
                <a
                  href={mod.profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-indigo-300 hover:text-indigo-200"
                >
                  Open on mod.io <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

    </section>
  )
}
