export type ServerInstanceStatus = {
  running: boolean
  pid?: number
  threads?: number
  cpuPercent?: number
  startedAt?: string
  lastExit?: string
  lastCommand?: string[]
}

export type A2SInfo = {
  name?: string
  map?: string
  game?: string
  players?: number
  maxPlayers?: number
  bots?: number
  vac?: boolean
  version?: string
  ping?: number
}

export type ServerStatusResponse = {
  server: ServerInstanceStatus
  instances: Record<string, ServerInstanceStatus>
  a2s?: Record<string, A2SInfo>
  mods: string[]
  players: LivePlayer[]
  time: string
  lastPlayerJoinedAt?: string
}

export type LivePlayer = {
  steamId: string
  name: string
  knownIps: string[]
  currentIp?: string
  lastScore: number
  sourceId: string
  sourceName: string
  joinedAt: string
  isBot: boolean
  totalScore: number
  highScore: number
  firstSeenAt?: string
  lastSeenAt?: string
  lastServer?: string
  totalKills: number
  totalDeaths: number
  totalObjectives: number
}

export type ConfigField = {
  section: string
  prefix: string
  key: string
  label: string
  value: string
  comment?: string
  type: "bool" | "number" | "secret" | "string"
  index: number
  line?: number
}

export type ParsedConfigDocument = {
  raw: string
  schema: {
    kind: string
    sections: Record<string, ConfigField[]>
  }
  doc?: {
    nodes: Array<{
      type: string
      section?: string
      key?: string
      value?: string
      index?: number
      line?: number
    }>
  }
}

export type ModDetail = {
  id: string
  enabled: boolean
  name: string
  summary?: string
  profileUrl?: string
  author?: string
  logo?: string
  subscribers?: number
  downloads?: number
  rating?: string
  tags?: string[]
  dateUpdated?: number
}

export type ModExploreResponse = {
  mods: Array<{
    id: number
    name: string
    summary: string
    profileUrl: string
    author: string
    logo: string
    subscribers: number
    downloads: number
    rating: string
    tags: string[]
    dateUpdated: number
  }>
  page: number
  pageSize: number
  total: number
  resultable: number
}

export type PublicUser = {
  id: string
  name: string
  role: "user" | "moderator" | "admin" | "host"
  mustChangePassword?: boolean
}

export type AppSettings = {
  automaticUpdates: boolean
  updateIntervalMinutes: number
  sessionSecret: string
  steamApiKey: string
  steamUsername: string
  steamPassword: string
  gameStatsToken: string
  steamServerToken: string
}

export type Monitor = {
  id: string
  name: string
  host: string
  queryPort: number
  rconPort: number
  rconPassword: string
}

export type Profile = {
  id: string
  name: string
  configRoot: string
  logRoot: string
  gamePort: number
  queryPort: number
  rconPort: number
  rconPassword: string
  defaultMap: string
  scenario: string
  mutators: string[]
  additionalArgs: string[]
  password?: string
  defaultLighting?: string
  welcomeMessage?: string
  welcomeMessageAdmin?: string
  goodbyeMessage?: string
  goodbyeMessageAdmin?: string
}

export type MutatorMod = {
  modId: string
  modName: string
  mutators: string[]
}
