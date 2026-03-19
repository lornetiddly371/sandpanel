import type {
  AppSettings,
  ConfigField,
  LivePlayer,
  ModDetail,
  ModExploreResponse,
  MutatorMod,
  ParsedConfigDocument,
  Profile,
  PublicUser,
  ServerStatusResponse,
  Monitor,
} from "../types/server"

export type CommandTarget = {
  targetType: "local" | "profile" | "monitor" | "direct"
  targetId?: string
  host?: string
  port?: number
  password?: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Request failed: ${response.status}`)
  }

  return (await response.json()) as T
}

export const api = {
  login: (name: string, password: string) =>
    request<PublicUser>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ name, password }),
    }),
  logout: () =>
    request<{ ok: boolean }>("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  getMe: () => request<PublicUser>("/api/auth/me"),
  changePassword: (userId: string, newPassword: string) =>
    request<PublicUser>("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ userId, newPassword }),
    }),
  getServerStatus: () => request<ServerStatusResponse>("/api/server/status"),
  getSetupStatus: () => request<Record<string, unknown>>("/api/setup/status"),
  startServer: (payload: { map?: string; scenario?: string; mutators?: string[]; extraArgs?: string[]; securityCode?: string }) =>
    request<Record<string, unknown>>("/api/server/start", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  stopServer: () =>
    request<Record<string, unknown>>("/api/server/stop", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  restartServer: (payload: { map?: string; scenario?: string; mutators?: string[]; extraArgs?: string[]; securityCode?: string }) =>
    request<Record<string, unknown>>("/api/server/restart", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getQueryStatus: () => request<Record<string, unknown>>("/api/server/query"),
  getCatalog: () => request<Record<string, unknown>>("/api/catalog"),
  getConfigFiles: (profile?: string) => {
    const suffix = profile ? `?profile=${encodeURIComponent(profile)}` : ""
    return request<{ files: string[] }>(`/api/config/files${suffix}`)
  },
  getConfigFile: (name: string, profile?: string) => {
    const suffix = profile ? `?profile=${encodeURIComponent(profile)}` : ""
    return request<ParsedConfigDocument>(`/api/config/file/${encodeURIComponent(name)}${suffix}`)
  },
  parseConfigRaw: (name: string, raw: string) =>
    request<ParsedConfigDocument>("/api/config/parse", {
      method: "POST",
      body: JSON.stringify({ name, raw }),
    }),
  saveConfigFile: (name: string, raw: string, updates: ConfigField[], profile?: string) => {
    const suffix = profile ? `?profile=${encodeURIComponent(profile)}` : ""
    return request<ParsedConfigDocument>(`/api/config/file/${encodeURIComponent(name)}${suffix}`, {
      method: "PUT",
      body: JSON.stringify({ raw, updates }),
    })
  },
  getLivePlayers: () => request<{ live: LivePlayer[] }>("/api/players/live"),
  getModsDetails: (profile?: string) => {
    const suffix = profile ? `?profile=${encodeURIComponent(profile)}` : ""
    return request<{ mods: ModDetail[]; fetchError?: string }>(`/api/mods/details${suffix}`)
  },
  getModsState: (profile?: string) => {
    const suffix = profile ? `?profile=${encodeURIComponent(profile)}` : ""
    return request<{ mods: string[]; subscriptions: Array<{ id: string; enabled: boolean }> }>(`/api/mods/state${suffix}`)
  },
  saveModsOrder: (ids: string[], profile?: string) => {
    const suffix = profile ? `?profile=${encodeURIComponent(profile)}` : ""
    return request<{ mods: string[]; subscriptions: Array<{ id: string; enabled: boolean }> }>(`/api/mods${suffix}`, {
      method: "PUT",
      body: JSON.stringify({ ids }),
    })
  },
  exploreMods: (opts: { q?: string; sort?: string; page?: number; pageSize?: number }) => {
    const params = new URLSearchParams()
    if (opts.q) params.set("q", opts.q)
    if (opts.sort) params.set("sort", opts.sort)
    if (opts.page) params.set("page", String(opts.page))
    if (opts.pageSize) params.set("pageSize", String(opts.pageSize))
    const query = params.toString()
    return request<ModExploreResponse>(`/api/modio/explore${query ? `?${query}` : ""}`)
  },
  getModioSettings: () => request<{ termsAccepted: boolean; authenticated: boolean; userFilePresent: boolean }>("/api/modio/settings"),
  updateModioSettings: (termsAccepted: boolean) =>
    request<{ termsAccepted: boolean; authenticated: boolean; userFilePresent: boolean }>("/api/modio/settings", {
      method: "PUT",
      body: JSON.stringify({ termsAccepted }),
    }),
  requestModioCode: (email: string) =>
    request<Record<string, unknown>>("/api/modio/request-code", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  toggleMod: (id: string, enabled: boolean, profile?: string) => {
    const suffix = profile ? `?profile=${encodeURIComponent(profile)}` : ""
    return request<{ subscriptions: Array<{ id: string; enabled: boolean }> }>(`/api/mods/enable${suffix}`, {
      method: "POST",
      body: JSON.stringify({ id, enabled }),
    })
  },
  getMutatorMods: () => request<MutatorMod[]>("/api/mutator-mods"),
  saveMutatorMods: (mods: MutatorMod[]) =>
    request<MutatorMod[]>("/api/mutator-mods", {
      method: "PUT",
      body: JSON.stringify(mods),
    }),
  addMod: (id: string, profile?: string) => {
    const suffix = profile ? `?profile=${encodeURIComponent(profile)}` : ""
    return request<{ subscriptions: Array<{ id: string; enabled: boolean }> }>(`/api/mods/add${suffix}`, {
      method: "POST",
      body: JSON.stringify({ id }),
    })
  },
  executeCommand: (command: string, target: CommandTarget) =>
    request<{ response: string; kind: string }>("/api/command", {
      method: "POST",
      body: JSON.stringify({ command, kind: "rcon", ...target }),
    }),
  kickPlayer: (steamId: string, reason: string) =>
    request<{ response: string }>("/api/moderation/kick", {
      method: "POST",
      body: JSON.stringify({ steamId, reason, targetType: "local" }),
    }),
  banPlayer: (steamId: string, reason: string) =>
    request<{ response: string }>("/api/moderation/ban", {
      method: "POST",
      body: JSON.stringify({ steamId, reason, targetType: "local" }),
    }),
  unbanPlayer: (steamId: string) =>
    request<{ response: string }>("/api/moderation/unban", {
      method: "POST",
      body: JSON.stringify({ steamId, targetType: "local" }),
    }),
  getProfiles: () => request<{ profiles: Profile[] }>("/api/profiles"),
  createProfile: (profile: Omit<Profile, "id"> & { id?: string }) =>
    request<Profile>("/api/profiles", {
      method: "POST",
      body: JSON.stringify(profile),
    }),
  saveProfile: (profile: Profile) =>
    request<Profile>(`/api/profiles/${encodeURIComponent(profile.id)}`, {
      method: "PUT",
      body: JSON.stringify(profile),
    }),
  controlProfile: (profileId: string, action: "start" | "stop" | "restart") =>
    request<Record<string, unknown>>(`/api/profiles/${encodeURIComponent(profileId)}/${action}`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  deleteProfile: (profileId: string) =>
    request<{ deleted: string }>(`/api/profiles/${encodeURIComponent(profileId)}`, {
      method: "DELETE",
    }),
  getProfileStatus: (profileId: string) => request<Record<string, unknown>>(`/api/profiles/${encodeURIComponent(profileId)}/status`),
  getProfilePlayers: (profileId: string) => request<Record<string, unknown>>(`/api/profiles/${encodeURIComponent(profileId)}/players`),
  getSettings: () => request<AppSettings>("/api/settings"),
  updateSettings: (settings: AppSettings) =>
    request<AppSettings>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),
  getUsers: () => request<{ users: PublicUser[] }>("/api/users"),
  createUser: (payload: { name: string; role: string; password?: string }) =>
    request<PublicUser>("/api/users", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateUser: (id: string, payload: { name: string; role: string; password?: string }) =>
    request<PublicUser>(`/api/users/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteUser: (id: string) =>
    request<{ deleted: string }>(`/api/users/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  getMonitors: () => request<{ monitors: Monitor[]; status: Record<string, unknown> }>("/api/monitors"),
  createMonitor: (payload: Omit<Monitor, "id">) =>
    request<Monitor>("/api/monitors", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateMonitor: (id: string, payload: Omit<Monitor, "id">) =>
    request<Monitor>(`/api/monitors/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ ...payload, id }),
    }),
  deleteMonitor: (id: string) =>
    request<{ deleted: string }>(`/api/monitors/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  monitorAction: (id: string, action: "start" | "stop") =>
    request<Record<string, unknown>>(`/api/monitors/${encodeURIComponent(id)}/${action}`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  getInstances: () => request<{ instances: Record<string, { running: boolean; pid?: number; threads?: number }> }>("/api/instances"),
  getPlayersHistory: () => request<{ players: Array<{ steamId: string; name: string; [key: string]: unknown }> }>("/api/players"),
  getWrapperLogs: () => request<{ logs: Array<{ time: string; line: string }> }>("/api/logs/wrapper"),
  getSteamcmdLogs: () => request<{ logs: Array<{ time: string; line: string }> }>("/api/logs/steamcmd"),
  getProfileLogs: (profileId: string, kind = "server") =>
    request<{ logs: Array<{ time: string; line: string }>; kind: string }>(`/api/logs/profile/${encodeURIComponent(profileId)}?kind=${encodeURIComponent(kind)}`),
  getSteamcmdStatus: () => request<Record<string, unknown>>("/api/steamcmd/status"),
  runSteamcmdInstall: (validate: boolean, steamGuardCode?: string) =>
    request<Record<string, unknown>>("/api/steamcmd/install", {
      method: "POST",
      body: JSON.stringify({ validate, steamGuardCode: steamGuardCode?.trim() || undefined }),
    }),
  runSteamcmdUpdateCheck: (steamGuardCode?: string) =>
    request<Record<string, unknown>>("/api/steamcmd/check-update", {
      method: "POST",
      body: JSON.stringify({ steamGuardCode: steamGuardCode?.trim() || undefined }),
    }),
  runSteamcmdCommand: (args: string[]) =>
    request<Record<string, unknown>>("/api/steamcmd/run", {
      method: "POST",
      body: JSON.stringify({ args }),
    }),
  stopSteamcmd: () =>
    request<Record<string, unknown>>("/api/steamcmd/stop", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  wrapperRestart: () =>
    request<Record<string, string>>("/api/wrapper/restart", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  wrapperUpdate: () =>
    request<Record<string, string>>("/api/wrapper/update", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  generatePassword: () => request<{ password: string }>("/api/generate-password"),
  generateSessionSecret: () => request<{ sessionSecret: string }>("/api/generate-session-secret"),
  downloadUrls: {
    wrapperLogs: "/api/download/wrapper-logs",
    logsArchive: (profile?: string) => {
      const suffix = profile ? `?profile=${encodeURIComponent(profile)}` : ""
      return `/api/download/logs-archive${suffix}`
    },
    profileLogs: (profileId: string) => `/api/download/logs/${encodeURIComponent(profileId)}`,
    configFile: (name: string, profile?: string) => {
      const suffix = profile ? `?profile=${encodeURIComponent(profile)}` : ""
      return `/api/download/config/${encodeURIComponent(name)}${suffix}`
    },
  },
}
