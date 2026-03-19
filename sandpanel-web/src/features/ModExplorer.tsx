import { ExternalLink, Search } from "lucide-react"
import { useEffect, useState } from "react"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { useServerStore } from "../store/useServerStore"

const sortOptions = [
  { value: "trending", label: "Trending" },
  { value: "downloads", label: "Most Downloaded" },
  { value: "subscribers", label: "Most Subscribed" },
  { value: "latest", label: "Recently Updated" },
  { value: "rating", label: "Highest Rated" },
]

export function ModExplorer() {
  const mods = useServerStore((state) => state.exploreMods)
  const total = useServerStore((state) => state.exploreTotal)
  const page = useServerStore((state) => state.explorePage)
  const pageSize = useServerStore((state) => state.explorePageSize)
  const load = useServerStore((state) => state.loadModExplorer)
  const addMod = useServerStore((state) => state.addMod)
  const activeProfileId = useServerStore((state) => state.activeProfileId)
  const profiles = useServerStore((state) => state.profiles)
  const activeProfile = profiles.find((p) => p.id === activeProfileId)

  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [sort, setSort] = useState("trending")

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query), 300)
    return () => window.clearTimeout(timeout)
  }, [query])

  useEffect(() => {
    void load({ q: debouncedQuery, sort, page: 1, pageSize })
  }, [load, pageSize, debouncedQuery, sort])

  const maxPage = Math.max(1, Math.ceil(total / pageSize))

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Mod Explorer</h2>
        <p className="text-sm text-zinc-400">
          Browse and subscribe to mods. Adding mods to profile{" "}
          <span className="font-medium text-zinc-300">{activeProfile?.name ?? activeProfileId}</span>.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, tag, or keyword" className="pl-9" />
            </div>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="secondary" onClick={() => void load({ q: query, sort, page: 1, pageSize })}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {mods.map((mod, index) => (
          <Card key={mod.id} className="flex flex-col overflow-hidden bg-zinc-900">
            {mod.logo ? (
              <img
                src={mod.logo}
                alt={mod.name}
                className="h-40 w-full shrink-0 object-cover"
                loading={index < 6 ? "eager" : "lazy"}
                fetchPriority={index < 2 ? "high" : "auto"}
              />
            ) : (
              <div className="flex h-40 w-full shrink-0 items-center justify-center bg-zinc-800 text-zinc-600">
                No image
              </div>
            )}
            <CardHeader className="pb-2">
              <CardTitle className="line-clamp-1">{mod.name}</CardTitle>
              <CardDescription className="line-clamp-2 min-h-[2.5rem]">{mod.summary || "No summary available"}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-end space-y-3">
              <div className="grid grid-cols-3 gap-2 text-xs text-zinc-300">
                <div>
                  <p className="text-zinc-500">Downloads</p>
                  <p>{mod.downloads}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Subscribers</p>
                  <p>{mod.subscribers}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Rating</p>
                  <p>{mod.rating || "N/A"}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {mod.tags?.slice(0, 4).map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => void addMod(String(mod.id))}>
                  Subscribe
                </Button>
                <Button variant="outline" asChild>
                  <a href={mod.profileUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="flex items-center justify-between pt-6">
          <p className="text-sm text-zinc-400">
            Page {page} / {maxPage} • {total} results
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={page <= 1} onClick={() => void load({ q: query, sort, page: page - 1, pageSize })}>
              Previous
            </Button>
            <Button variant="secondary" disabled={page >= maxPage} onClick={() => void load({ q: query, sort, page: page + 1, pageSize })}>
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
