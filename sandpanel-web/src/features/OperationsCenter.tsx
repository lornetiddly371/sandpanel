import { Edit, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Switch } from "../components/ui/switch"
import { api } from "../lib/api"
import { useServerStore } from "../store/useServerStore"
import { LogPanel } from "../components/ui/log-panel"
import type { AppSettings, Monitor } from "../types/server"

function ModioAuthSection() {
  const [modioEmail, setModioEmail] = useState("")
  const [securityCode, setSecurityCode] = useState("")
  const [termsAccepted, setTermsAccepted] = useState(true)
  const [authStatus, setAuthStatus] = useState("")

  useEffect(() => {
    void api.getModioSettings().then((settings) => {
      setTermsAccepted(settings.termsAccepted)
      setAuthStatus(JSON.stringify(settings, null, 2))
    })
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>mod.io Authentication</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="text-xs text-zinc-400">
          Request a security code via email, accept mod.io terms, and authenticate for mod management.
        </p>
        <div>
          <Label>Email</Label>
          <Input value={modioEmail} onChange={(event) => setModioEmail(event.target.value)} placeholder="you@example.com" />
        </div>
        <div>
          <Label>Security Code</Label>
          <Input value={securityCode} onChange={(event) => setSecurityCode(event.target.value)} placeholder="5-digit code from email" />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2">
          <span className="text-sm text-zinc-300">Terms Accepted</span>
          <Switch checked={termsAccepted} onCheckedChange={setTermsAccepted} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() =>
              void api.requestModioCode(modioEmail).then((res) => {
                setAuthStatus(JSON.stringify(res, null, 2))
              })
            }
          >
            Request Code
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              void api.updateModioSettings(termsAccepted).then((res) => {
                setAuthStatus(JSON.stringify(res, null, 2))
              })
            }
          >
            Save Terms
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              void api.getModioSettings().then((res) => {
                setTermsAccepted(res.termsAccepted)
                setAuthStatus(JSON.stringify(res, null, 2))
              })
            }
          >
            Refresh Status
          </Button>
        </div>
        <pre className="max-h-48 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300">{authStatus || "No status yet"}</pre>
      </CardContent>
    </Card>
  )
}

export function OperationsCenter() {
  const currentUser = useServerStore((state) => state.currentUser)
  const users = useServerStore((state) => state.users)
  const monitors = useServerStore((state) => state.monitors)
  const instances = useServerStore((state) => state.instances)
  const appSettings = useServerStore((state) => state.appSettings)
  const steamcmdStatus = useServerStore((state) => state.steamcmdStatus)
  const wrapperLogs = useServerStore((state) => state.wrapperLogs)
  const refreshAdminData = useServerStore((state) => state.refreshAdminData)
  const createUser = useServerStore((state) => state.createUser)
  const updateUser = useServerStore((state) => state.updateUser)
  const deleteUser = useServerStore((state) => state.deleteUser)
  const createMonitor = useServerStore((state) => state.createMonitor)
  const updateMonitorAction = useServerStore((state) => state.updateMonitor)
  const deleteMonitor = useServerStore((state) => state.deleteMonitor)
  const monitorAction = useServerStore((state) => state.monitorAction)
  const saveSettings = useServerStore((state) => state.saveSettings)
  const steamcmdInstall = useServerStore((state) => state.steamcmdInstall)
  const steamcmdCheckUpdate = useServerStore((state) => state.steamcmdCheckUpdate)
  const steamcmdStop = useServerStore((state) => state.steamcmdStop)
  const wrapperRestart = useServerStore((state) => state.wrapperRestart)
  const wrapperUpdate = useServerStore((state) => state.wrapperUpdate)

  const [newUserName, setNewUserName] = useState("")
  const [newUserRole, setNewUserRole] = useState("user")
  const [newUserPassword, setNewUserPassword] = useState("")

  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editUserName, setEditUserName] = useState("")
  const [editUserRole, setEditUserRole] = useState("")
  const [editUserPassword, setEditUserPassword] = useState("")

  const [monitorName, setMonitorName] = useState("")
  const [monitorHost, setMonitorHost] = useState("127.0.0.1")
  const [monitorQueryPort, setMonitorQueryPort] = useState("27131")
  const [monitorRconPort, setMonitorRconPort] = useState("27015")
  const [monitorRconPassword, setMonitorRconPassword] = useState("")

  const [editingMonitor, setEditingMonitor] = useState<Monitor | null>(null)

  const [generatedPassword, setGeneratedPassword] = useState("")
  const [generatedSessionSecret, setGeneratedSessionSecret] = useState("")
  const [newSelfPassword, setNewSelfPassword] = useState("")

  const [settingsDraft, setSettingsDraft] = useState<AppSettings | null>(null)

  useEffect(() => {
    void refreshAdminData()
  }, [refreshAdminData])

  useEffect(() => {
    if (appSettings && !settingsDraft) {
      setSettingsDraft({ ...appSettings })
    }
  }, [appSettings, settingsDraft])

  const onSaveSettings = () => {
    if (settingsDraft) {
      void saveSettings(settingsDraft)
    }
  }

  const updateDraft = (patch: Partial<AppSettings>) => {
    if (settingsDraft) {
      setSettingsDraft({ ...settingsDraft, ...patch })
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Operations</h2>
        <p className="text-sm text-zinc-400">Global settings, user management, monitors, and system tools. These apply to all profiles.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-3">
              <Input placeholder="Username" value={newUserName} onChange={(event) => setNewUserName(event.target.value)} />
              <Select value={newUserRole} onValueChange={setNewUserRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="host">Host</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Password" type="password" value={newUserPassword} onChange={(event) => setNewUserPassword(event.target.value)} />
            </div>
            <Button onClick={() => void createUser({ name: newUserName, role: newUserRole, password: newUserPassword })}>Add User</Button>
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <Input
                placeholder="New password for current session user"
                type="password"
                value={newSelfPassword}
                onChange={(event) => setNewSelfPassword(event.target.value)}
              />
              <Button
                variant="outline"
                onClick={() => {
                  if (!currentUser || !newSelfPassword.trim()) return
                  void api.changePassword(currentUser.id, newSelfPassword.trim()).then(() => setNewSelfPassword(""))
                }}
              >
                Change My Password
              </Button>
            </div>
            <div className="space-y-2">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2 text-sm">
                  <p>
                    {user.name} <span className="text-zinc-500">({user.role})</span>
                  </p>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingUserId(user.id)
                            setEditUserName(user.name)
                            setEditUserRole(user.role)
                            setEditUserPassword("")
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit User: {user.name}</DialogTitle>
                        </DialogHeader>
                        {editingUserId === user.id ? (
                          <div className="space-y-3">
                            <div>
                              <Label>Name</Label>
                              <Input value={editUserName} onChange={(event) => setEditUserName(event.target.value)} />
                            </div>
                            <div>
                              <Label>Role</Label>
                              <Select value={editUserRole} onValueChange={setEditUserRole}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">User</SelectItem>
                                  <SelectItem value="moderator">Moderator</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="host">Host</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>New Password (optional)</Label>
                              <Input type="password" value={editUserPassword} onChange={(event) => setEditUserPassword(event.target.value)} placeholder="Leave empty to keep current" />
                            </div>
                            <Button
                              className="w-full"
                              onClick={() => {
                                void updateUser(user.id, {
                                  name: editUserName,
                                  role: editUserRole,
                                  password: editUserPassword.trim() || undefined,
                                })
                                setEditingUserId(null)
                              }}
                            >
                              Save Changes
                            </Button>
                          </div>
                        ) : null}
                      </DialogContent>
                    </Dialog>
                    <Button variant="destructive" size="sm" onClick={() => void deleteUser(user.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2">
              <Label>Automatic Updates</Label>
              <Switch
                checked={Boolean(settingsDraft?.automaticUpdates)}
                onCheckedChange={(checked) => updateDraft({ automaticUpdates: checked })}
              />
            </div>
            <div>
              <Label>Update Interval (minutes)</Label>
              <Input
                value={String(settingsDraft?.updateIntervalMinutes ?? 3)}
                onChange={(event) => updateDraft({ updateIntervalMinutes: Number(event.target.value) || 3 })}
              />
            </div>
            <div>
              <Label>Steam Username</Label>
              <Input
                value={settingsDraft?.steamUsername ?? ""}
                onChange={(event) => updateDraft({ steamUsername: event.target.value })}
              />
            </div>
            <div>
              <Label>Steam Password</Label>
              <Input
                type="password"
                value={settingsDraft?.steamPassword ?? ""}
                onChange={(event) => updateDraft({ steamPassword: event.target.value })}
              />
            </div>
            <div>
              <Label>Steam API Key</Label>
              <Input
                type="password"
                value={settingsDraft?.steamApiKey ?? ""}
                onChange={(event) => updateDraft({ steamApiKey: event.target.value })}
              />
            </div>
            <div>
              <Label>Game Stats Token</Label>
              <Input
                type="password"
                value={settingsDraft?.gameStatsToken ?? ""}
                onChange={(event) => updateDraft({ gameStatsToken: event.target.value })}
              />
            </div>
            <div>
              <Label>Steam Server Token</Label>
              <Input
                type="password"
                value={settingsDraft?.steamServerToken ?? ""}
                onChange={(event) => updateDraft({ steamServerToken: event.target.value })}
              />
            </div>
            <div>
              <Label>Session Secret</Label>
              <Input
                type="password"
                value={settingsDraft?.sessionSecret ?? ""}
                onChange={(event) => updateDraft({ sessionSecret: event.target.value })}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={onSaveSettings}>Save Settings</Button>
              <Button
                variant="outline"
                onClick={() =>
                  void api.generatePassword().then((data) => {
                    setGeneratedPassword(data.password)
                  })
                }
              >
                Generate Password
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  void api.generateSessionSecret().then((data) => {
                    setGeneratedSessionSecret(data.sessionSecret)
                    updateDraft({ sessionSecret: data.sessionSecret })
                  })
                }
              >
                Generate Session Secret
              </Button>
            </div>
            {generatedPassword ? <p className="text-xs text-zinc-300">Generated Password: {generatedPassword}</p> : null}
            {generatedSessionSecret ? <p className="text-xs text-zinc-300">Generated Session Secret: {generatedSessionSecret}</p> : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monitors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-2">
              <Input placeholder="Name" value={monitorName} onChange={(event) => setMonitorName(event.target.value)} />
              <Input placeholder="Host" value={monitorHost} onChange={(event) => setMonitorHost(event.target.value)} />
              <Input placeholder="Query Port" value={monitorQueryPort} onChange={(event) => setMonitorQueryPort(event.target.value)} />
              <Input placeholder="RCON Port" value={monitorRconPort} onChange={(event) => setMonitorRconPort(event.target.value)} />
              <Input
                className="md:col-span-2"
                placeholder="RCON Password"
                value={monitorRconPassword}
                onChange={(event) => setMonitorRconPassword(event.target.value)}
              />
            </div>
            <Button
              onClick={() =>
                void createMonitor({
                  name: monitorName,
                  host: monitorHost,
                  queryPort: Number(monitorQueryPort) || 27131,
                  rconPort: Number(monitorRconPort) || 27015,
                  rconPassword: monitorRconPassword,
                })
              }
            >
              Add Monitor
            </Button>
            <div className="space-y-2">
              {monitors.map((monitor) => (
                <div key={monitor.id} className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{monitor.name}</p>
                    <p className="text-xs text-zinc-500">{monitor.host}:{monitor.queryPort}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => void monitorAction(monitor.id, "start")}>
                      Start
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => void monitorAction(monitor.id, "stop")}>
                      Stop
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setEditingMonitor({ ...monitor })}>
                          <Edit className="h-3 w-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Monitor: {monitor.name}</DialogTitle>
                        </DialogHeader>
                        {editingMonitor && editingMonitor.id === monitor.id ? (
                          <div className="space-y-3">
                            <div>
                              <Label>Name</Label>
                              <Input value={editingMonitor.name} onChange={(event) => setEditingMonitor({ ...editingMonitor, name: event.target.value })} />
                            </div>
                            <div>
                              <Label>Host</Label>
                              <Input value={editingMonitor.host} onChange={(event) => setEditingMonitor({ ...editingMonitor, host: event.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label>Query Port</Label>
                                <Input value={editingMonitor.queryPort} onChange={(event) => setEditingMonitor({ ...editingMonitor, queryPort: Number(event.target.value) || 0 })} />
                              </div>
                              <div>
                                <Label>RCON Port</Label>
                                <Input value={editingMonitor.rconPort} onChange={(event) => setEditingMonitor({ ...editingMonitor, rconPort: Number(event.target.value) || 0 })} />
                              </div>
                            </div>
                            <div>
                              <Label>RCON Password</Label>
                              <Input type="password" value={editingMonitor.rconPassword} onChange={(event) => setEditingMonitor({ ...editingMonitor, rconPassword: event.target.value })} />
                            </div>
                            <Button
                              className="w-full"
                              onClick={() => {
                                const { id, ...rest } = editingMonitor
                                void updateMonitorAction(id, rest)
                                setEditingMonitor(null)
                              }}
                            >
                              Save Monitor
                            </Button>
                          </div>
                        ) : null}
                      </DialogContent>
                    </Dialog>
                    <Button variant="destructive" size="sm" onClick={() => void deleteMonitor(monitor.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Instances</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(instances).map(([id, instance]) => (
              <div key={id} className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2 text-sm">
                <p>{id}</p>
                <p className={instance.running ? "text-emerald-300" : "text-red-300"}>{instance.running ? "Running" : "Stopped"}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <ModioAuthSection />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>SteamCMD</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300">{JSON.stringify(steamcmdStatus ?? {}, null, 2)}</div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void steamcmdInstall(false)}>Install</Button>
              <Button variant="secondary" onClick={() => void steamcmdCheckUpdate()}>
                Check Update
              </Button>
              <Button variant="destructive" onClick={() => void steamcmdStop()}>
                Stop
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wrapper Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => void wrapperRestart()}>
                Restart Wrapper
              </Button>
              <Button variant="secondary" size="sm" onClick={() => void wrapperUpdate()}>
                Update Wrapper
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={api.downloadUrls.wrapperLogs} target="_blank" rel="noreferrer">
                  Download Wrapper Logs
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={api.downloadUrls.logsArchive()} target="_blank" rel="noreferrer">
                  Download Logs Archive
                </a>
              </Button>
            </div>
            <LogPanel logs={wrapperLogs} maxHeight="max-h-64" />
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
