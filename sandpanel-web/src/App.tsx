import { useEffect } from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import { AppShell } from "./components/layout/AppShell"
import { ConfigurationEditor } from "./features/ConfigurationEditor"
import { ConsoleScreen } from "./features/Console"
import { Dashboard } from "./features/Dashboard"
import { LogsCenter } from "./features/LogsCenter"
import { ModExplorer } from "./features/ModExplorer"
import { ModManagement } from "./features/ModManagement"
import { OperationsCenter } from "./features/OperationsCenter"
import { PlayerManagement } from "./features/PlayerManagement"
import { ProfilesServerControl } from "./features/ProfilesServerControl"
import { ServerControl } from "./features/ServerControl"
import { SteamcmdCenter } from "./features/SteamcmdCenter"
import { useServerStore } from "./store/useServerStore"

function App() {
  const init = useServerStore((state) => state.init)
  const startRealtime = useServerStore((state) => state.startRealtime)
  const stopRealtime = useServerStore((state) => state.stopRealtime)
  const currentUser = useServerStore((state) => state.currentUser)

  useEffect(() => {
    void init()
    return () => stopRealtime()
  }, [init, stopRealtime])

  useEffect(() => {
    if (!currentUser) {
      stopRealtime()
      return
    }
    startRealtime()
    return () => stopRealtime()
  }, [currentUser, startRealtime, stopRealtime])

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="configuration" element={<ConfigurationEditor />} />
        <Route path="rcon" element={<ConsoleScreen />} />
        <Route path="server-control" element={<ServerControl />} />
        <Route path="players" element={<PlayerManagement />} />
        <Route path="mods" element={<ModManagement />} />
        <Route path="mods/explorer" element={<ModExplorer />} />
        <Route path="profiles" element={<ProfilesServerControl />} />
        <Route path="steamcmd" element={<SteamcmdCenter />} />
        <Route path="logs" element={<LogsCenter />} />
        <Route path="operations" element={<OperationsCenter />} />
        {/* Legacy redirects */}
        <Route path="console" element={<Navigate to="/rcon" replace />} />
        <Route path="server" element={<Navigate to="/server-control" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
