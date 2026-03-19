import { Copy, Info, Plus, Save, Trash2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { PasswordInput } from "../components/ui/password-input"
import { MultiSelectCombobox } from "../components/ui/multi-select-combobox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Switch } from "../components/ui/switch"
import { api } from "../lib/api"
import { useServerStore } from "../store/useServerStore"
import type { MutatorMod, Profile } from "../types/server"

type Option = { value: string; label: string }

type FullCatalog = {
  maps: Option[]
  scenarios: Option[]
  scenariosByMap: Record<string, Option[]>
  mutators: Option[]
}

export function ProfilesServerControl() {
  const profiles = useServerStore((state) => state.profiles)
  const saveProfile = useServerStore((state) => state.saveProfile)
  const serverStatus = useServerStore((state) => state.serverStatus)
  const appSettings = useServerStore((state) => state.appSettings)
  const init = useServerStore((state) => state.init)
  const activeProfileId = useServerStore((state) => state.activeProfileId)
  const setActiveProfile = useServerStore((state) => state.setActiveProfile)

  const profile = useMemo(
    () => profiles.find((item) => item.id === activeProfileId) ?? profiles[0],
    [profiles, activeProfileId],
  )

  const [draft, setDraft] = useState<Profile | null>(null)
  const [saving, setSaving] = useState(false)
  const [catalog, setCatalog] = useState<FullCatalog>({ maps: [], scenarios: [], scenariosByMap: {}, mutators: [] })
  const [allMutatorValues, setAllMutatorValues] = useState<string[]>([])

  useEffect(() => {
    void (async () => {
      const [cat, mutMods] = await Promise.all([api.getCatalog(), api.getMutatorMods()])
      const raw = cat as Record<string, unknown>
      const fullCat: FullCatalog = {
        maps: Array.isArray(raw.maps) ? (raw.maps as Option[]) : [],
        scenarios: Array.isArray(raw.scenarios) ? (raw.scenarios as Option[]) : [],
        scenariosByMap: (raw.scenariosByMap as Record<string, Option[]>) ?? {},
        mutators: Array.isArray(raw.mutators) ? (raw.mutators as Option[]) : [],
      }
      setCatalog(fullCat)
      const catalogMutators = fullCat.mutators.map((item) => item.value)
      const customMutators = Array.isArray(mutMods)
        ? (mutMods as MutatorMod[]).flatMap((mod) => mod.mutators)
        : []
      setAllMutatorValues([...new Set([...catalogMutators, ...customMutators])])
    })()
  }, [])

  const active = draft ?? profile ?? null
  if (!active) return <p className="text-zinc-400">No profiles available.</p>

  const isRunning = Boolean(serverStatus?.instances?.[activeProfileId]?.running)

  const filteredScenarios = active.defaultMap && catalog.scenariosByMap[active.defaultMap]
    ? catalog.scenariosByMap[active.defaultMap]
    : catalog.scenarios

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveProfile(active)
      setDraft(null)
    } finally {
      setSaving(false)
    }
  }

  const handleClone = () => {
    setDraft({
      ...active,
      id: "",
      name: `${active.name} (Copy)`,
      configRoot: "",
      logRoot: "",
      gamePort: active.gamePort + 100,
      queryPort: active.queryPort + 100,
      rconPort: active.rconPort + 10,
    })
  }

  const handleNewDefault = () => {
    setDraft({
      id: "",
      name: "New Profile",
      configRoot: "",
      logRoot: "",
      gamePort: 27202,
      queryPort: 27231,
      rconPort: 27025,
      rconPassword: "",
      defaultMap: "Hideout",
      scenario: "Scenario_Hideout_Checkpoint_Security",
      mutators: [],
      additionalArgs: [],
      password: "",
      defaultLighting: "Day",
      welcomeMessage: "",
      welcomeMessageAdmin: "",
      goodbyeMessage: "",
      goodbyeMessageAdmin: "",
    })
  }

  const handleDelete = async () => {
    if (isRunning) return
    if (!confirm(`Delete profile "${active.name}"? This cannot be undone.`)) return
    await api.deleteProfile(active.id)
    setDraft(null)
    await init()
    if (profiles.length > 1) {
      const remaining = profiles.find((p) => p.id !== active.id)
      if (remaining) setActiveProfile(remaining.id)
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Profiles</h2>
          <p className="text-sm text-zinc-400">
            Editing profile{" "}
            <span className="font-medium text-zinc-300">{active.name}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="gap-1.5" onClick={handleClone}>
            <Copy className="h-3.5 w-3.5" />
            Clone
          </Button>
          <Button variant="secondary" size="sm" className="gap-1.5" onClick={handleNewDefault}>
            <Plus className="h-3.5 w-3.5" />
            New Profile
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            disabled={isRunning || active.id === ""}
            title={isRunning ? "Stop the server first" : ""}
            onClick={() => void handleDelete()}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-5 xl:grid-cols-2">
        {/* Left: Core settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Core Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={active.name} onChange={(event) => setDraft({ ...active, name: event.target.value })} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Default Map</Label>
                <Select
                  value={active.defaultMap}
                  onValueChange={(value) => setDraft({ ...active, defaultMap: value, scenario: "" })}
                >
                  <SelectTrigger><SelectValue placeholder="Select map" /></SelectTrigger>
                  <SelectContent>
                    {catalog.maps.map((item) => (
                      <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Scenario {active.defaultMap ? `(${active.defaultMap})` : ""}</Label>
                <Select value={active.scenario} onValueChange={(value) => setDraft({ ...active, scenario: value })}>
                  <SelectTrigger><SelectValue placeholder="Select scenario" /></SelectTrigger>
                  <SelectContent>
                    {filteredScenarios.map((item) => (
                      <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label>Game Port</Label>
                <Input type="number" value={active.gamePort} onChange={(event) => setDraft({ ...active, gamePort: Number(event.target.value) || 0 })} />
              </div>
              <div>
                <Label>Query Port</Label>
                <Input type="number" value={active.queryPort} onChange={(event) => setDraft({ ...active, queryPort: Number(event.target.value) || 0 })} />
              </div>
              <div>
                <Label>RCON Port</Label>
                <Input type="number" value={active.rconPort} onChange={(event) => setDraft({ ...active, rconPort: Number(event.target.value) || 0 })} />
              </div>
            </div>

            <div>
              <Label>RCON Password</Label>
              <PasswordInput value={active.rconPassword} onChange={(event) => setDraft({ ...active, rconPassword: event.target.value })} />
            </div>

            <div>
              <Label>Joining Password</Label>
              <PasswordInput value={active.password ?? ""} onChange={(event) => setDraft({ ...active, password: event.target.value })} placeholder="Leave empty for no password" />
            </div>

            <div>
              <Label>Mutators</Label>
              <MultiSelectCombobox
                options={allMutatorValues}
                value={active.mutators ?? []}
                onChange={(mutators) => setDraft({ ...active, mutators })}
                placeholder="Select mutators"
              />
            </div>

            <div>
              <Label>Additional Args</Label>
              <Input
                value={(active.additionalArgs ?? []).join(" ")}
                onChange={(event) =>
                  setDraft({
                    ...active,
                    additionalArgs: event.target.value
                      .split(/\s+/)
                      .map((arg) => arg.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="-MyArg=Value +AnotherArg"
              />
              <p className="mt-1 text-xs text-zinc-500">We recommend using <code className="text-zinc-400">-ansimalloc</code> for best stability.</p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2">
              <div>
                <Label>Default Lighting</Label>
                <p className="text-xs text-zinc-500">Night mode starts the server in darkness.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">{(active.defaultLighting ?? "Day") === "Night" ? "Night" : "Day"}</span>
                <Switch
                  checked={(active.defaultLighting ?? "Day") === "Night"}
                  onCheckedChange={(checked) => setDraft({ ...active, defaultLighting: checked ? "Night" : "Day" })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right: Messages & info */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Welcome & Goodbye Messages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-2 rounded-lg border border-blue-900/30 bg-blue-950/20 p-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                <p className="text-xs text-zinc-400">
                  Variables: <code className="text-zinc-300">{'{player_name}'}</code>,{" "}
                  <code className="text-zinc-300">{'{steam_id}'}</code>,{" "}
                  <code className="text-zinc-300">{'{player_count}'}</code>,{" "}
                  <code className="text-zinc-300">{'{server_name}'}</code>
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Welcome</Label>
                  <textarea
                    className="min-h-16 w-full rounded-xl border border-zinc-700 bg-zinc-900/50 p-3 text-sm text-zinc-200 focus:border-zinc-500 focus:outline-none"
                    value={active.welcomeMessage ?? ""}
                    onChange={(e) => setDraft({ ...active, welcomeMessage: e.target.value })}
                    placeholder="Welcome {player_name}!"
                  />
                </div>
                <div>
                  <Label>Welcome (Admins)</Label>
                  <textarea
                    className="min-h-16 w-full rounded-xl border border-zinc-700 bg-zinc-900/50 p-3 text-sm text-zinc-200 focus:border-zinc-500 focus:outline-none"
                    value={active.welcomeMessageAdmin ?? ""}
                    onChange={(e) => setDraft({ ...active, welcomeMessageAdmin: e.target.value })}
                    placeholder="Welcome back, admin {player_name}!"
                  />
                </div>
                <div>
                  <Label>Goodbye</Label>
                  <textarea
                    className="min-h-16 w-full rounded-xl border border-zinc-700 bg-zinc-900/50 p-3 text-sm text-zinc-200 focus:border-zinc-500 focus:outline-none"
                    value={active.goodbyeMessage ?? ""}
                    onChange={(e) => setDraft({ ...active, goodbyeMessage: e.target.value })}
                    placeholder="{player_name} has left the server."
                  />
                </div>
                <div>
                  <Label>Goodbye (Admins)</Label>
                  <textarea
                    className="min-h-16 w-full rounded-xl border border-zinc-700 bg-zinc-900/50 p-3 text-sm text-zinc-200 focus:border-zinc-500 focus:outline-none"
                    value={active.goodbyeMessageAdmin ?? ""}
                    onChange={(e) => setDraft({ ...active, goodbyeMessageAdmin: e.target.value })}
                    placeholder="Admin {player_name} has left."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {(appSettings?.gameStatsToken || appSettings?.steamServerToken) ? (
            <Card className="border-zinc-800/60">
              <CardContent className="pt-5 space-y-1">
                <p className="text-xs font-medium text-zinc-300">Game Server Tokens (Global)</p>
                <p className="text-xs text-zinc-500">Configured in Operations → System Settings. Applied to all profiles on launch.</p>
                <div className="flex gap-4 text-xs text-zinc-400">
                  <span>GST: {appSettings.gameStatsToken ? "●●●●" + appSettings.gameStatsToken.slice(-4) : "Not set"}</span>
                  <span>GSLT: {appSettings.steamServerToken ? "●●●●" + appSettings.steamServerToken.slice(-4) : "Not set"}</span>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-zinc-800/60">
            <CardContent className="pt-5">
              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <div>
                  <p className="text-zinc-500">Config Root</p>
                  <p className="font-mono text-zinc-300">{active.configRoot || "Auto-generated"}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Log Root</p>
                  <p className="font-mono text-zinc-300">{active.logRoot || "Auto-generated"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Save bar */}
      <div className="flex items-center justify-end gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
        <Button variant="secondary" onClick={() => setDraft(null)}>
          Reset
        </Button>
        <Button onClick={() => void handleSave()} disabled={saving} className="gap-1.5">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </section>
  )
}
