import Editor, { type OnMount } from "@monaco-editor/react"
import { ChevronDown, ChevronRight, Save } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Group, Panel, Separator } from "react-resizable-panels"
import { Button } from "../components/ui/button"
import { Card } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Switch } from "../components/ui/switch"
import { api } from "../lib/api"
import { useServerStore } from "../store/useServerStore"
import type { ConfigField, ParsedConfigDocument } from "../types/server"

/* ---------- helpers ---------- */

type FieldWithLine = ConfigField & { line: number }

type SectionGroup = {
  section: string
  displayName: string
  fields: FieldWithLine[]
}

/** Pretty-print a UE-style section path.  /Script/AIModule.AISystem → AI System */
function prettySectionName(raw: string): string {
  const dotIdx = raw.lastIndexOf(".")
  const name = dotIdx >= 0 ? raw.slice(dotIdx + 1) : raw
  // Insert spaces before capitals:  "AISystem" → "AI System"
  return name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
}

function fieldKey(field: ConfigField) {
  return `${field.section}|${field.key}|${field.index}`
}

function updateIniRaw(raw: string, target: ConfigField, newValue: string): string {
  const lines = raw.replaceAll("\r\n", "\n").split("\n")
  let currentSection = ""
  let seen = 0

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const sectionMatch = line.match(/^\s*\[(.+?)\]\s*$/)
    if (sectionMatch) {
      currentSection = sectionMatch[1]
      continue
    }
    const entryMatch = line.match(/^(\s*[^=]+?\s*=\s*)(.*)$/)
    if (!entryMatch) continue
    const key = entryMatch[1].split("=")[0].trim()
    if (currentSection === target.section && key === target.key) {
      if (seen === target.index) {
        lines[i] = `${entryMatch[1]}${newValue}`
        return lines.join("\n")
      }
      seen += 1
    }
  }

  const sectionHeader = `[${target.section}]`
  const sectionIndex = lines.findIndex((line) => line.trim() === sectionHeader)
  if (sectionIndex >= 0) {
    lines.splice(sectionIndex + 1, 0, `${target.key}=${newValue}`)
    return lines.join("\n")
  }
  return `${raw.trimEnd()}\n\n[${target.section}]\n${target.key}=${newValue}\n`
}

/** Build ordered field list from doc.nodes, attaching line numbers */
function buildOrderedFields(config: ParsedConfigDocument): FieldWithLine[] {
  const doc = config.doc as { nodes?: Array<{ type: string; section?: string; key?: string; index?: number; line?: number }> } | undefined
  const sections = config.schema?.sections
  if (!sections) return []

  // If we have doc.nodes with line info, use them for ordering
  if (doc?.nodes?.length) {
    const result: FieldWithLine[] = []
    const used = new Set<string>()
    for (const node of doc.nodes) {
      if (node.type !== "entry" || !node.section || !node.key) continue
      const sectionFields = sections[node.section]
      if (!sectionFields) continue
      const field = sectionFields.find(
        (f) => f.key === node.key && f.index === (node.index ?? 0) && !used.has(fieldKey({ ...f, section: node.section! })),
      )
      if (field) {
        const fk = fieldKey({ ...field, section: node.section })
        used.add(fk)
        result.push({ ...field, section: node.section, line: node.line ?? 0 })
      }
    }
    // Add any remaining fields not matched by doc.nodes (shouldn't happen, but safety)
    for (const [section, fields] of Object.entries(sections)) {
      for (const field of fields) {
        const fk = fieldKey({ ...field, section })
        if (!used.has(fk)) {
          used.add(fk)
          result.push({ ...field, section, line: 9999 })
        }
      }
    }
    return result
  }

  // Fallback: flatten in schema order
  return Object.entries(sections).flatMap(([section, fields]) =>
    fields.map((field, idx) => ({ ...field, section, line: idx })),
  )
}

/** Group consecutive fields by section */
function groupBySection(fields: FieldWithLine[]): SectionGroup[] {
  const groups: SectionGroup[] = []
  let current: SectionGroup | null = null
  for (const field of fields) {
    if (!current || current.section !== field.section) {
      current = { section: field.section, displayName: prettySectionName(field.section), fields: [] }
      groups.push(current)
    }
    current.fields.push(field)
  }
  return groups
}

/* ---------- component ---------- */

export function ConfigurationEditor() {
  const configFiles = useServerStore((state) => state.configFiles)
  const activeConfigName = useServerStore((state) => state.activeConfigName)
  const activeConfig = useServerStore((state) => state.activeConfig)
  const parseConfigFromRaw = useServerStore((state) => state.parseConfigFromRaw)
  const activeProfileId = useServerStore((state) => state.activeProfileId)
  const profiles = useServerStore((state) => state.profiles)
  const activeProfile = profiles.find((p) => p.id === activeProfileId)

  const [editorRaw, setEditorRaw] = useState("")
  const [saving, setSaving] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  // Refs for synced scrolling
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null)
  const guiScrollRef = useRef<HTMLDivElement | null>(null)
  const guiLocked = useRef(false)        // true = GUI is being moved programmatically, suppress GUI→Editor
  const guiLockTimeout = useRef<number>(0)
  const editorLocked = useRef(false)     // true = Editor is being moved programmatically, suppress Editor→GUI
  const editorLockTimeout = useRef<number>(0)
  const editorSyncTimer = useRef<number>(0)

  useEffect(() => {
    setEditorRaw(activeConfig?.raw ?? "")
  }, [activeConfig?.raw])

  const orderedFields = useMemo(() => (activeConfig ? buildOrderedFields(activeConfig) : []), [activeConfig])
  const sectionGroups = useMemo(() => groupBySection(orderedFields), [orderedFields])

  // Debounced raw → parse
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!activeConfigName || editorRaw === (activeConfig?.raw ?? "")) return
      void parseConfigFromRaw(activeConfigName, editorRaw)
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [activeConfig?.raw, activeConfigName, editorRaw, parseConfigFromRaw])

  // Reload config files when profile changes
  useEffect(() => {
    void (async () => {
      const profileParam = activeProfileId === "default" ? undefined : activeProfileId
      const files = await api.getConfigFiles(profileParam)
      const fileList = Array.isArray(files.files) ? files.files : []
      const activeName = fileList.includes("Game.ini") ? "Game.ini" : fileList[0] ?? "Game.ini"
      const doc = await api.getConfigFile(activeName, profileParam)
      useServerStore.setState({ configFiles: fileList, activeConfigName: activeName, activeConfig: doc })
    })()
  }, [activeProfileId])

  const onFieldChange = (field: ConfigField, value: string) => {
    const updated = updateIniRaw(editorRaw, field, value)
    setEditorRaw(updated)
    void parseConfigFromRaw(activeConfigName, updated)
  }

  const onLoadConfig = async (name: string) => {
    const profileParam = activeProfileId === "default" ? undefined : activeProfileId
    const doc = await api.getConfigFile(name, profileParam)
    useServerStore.setState({ activeConfigName: name, activeConfig: doc })
  }

  const onSave = async () => {
    setSaving(true)
    try {
      const profileParam = activeProfileId === "default" ? undefined : activeProfileId
      const allFields = orderedFields as ConfigField[]
      const saved = await api.saveConfigFile(activeConfigName, editorRaw, allFields, profileParam)
      useServerStore.setState({ activeConfig: saved })
    } finally {
      setSaving(false)
    }
  }

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  // ---------- synced scrolling ----------

  // User manually scrolls the GUI (wheel/touch) → clear lock and allow GUI→Editor sync
  useEffect(() => {
    const el = guiScrollRef.current
    if (!el) return
    const unlockGui = () => {
      guiLocked.current = false
      window.clearTimeout(guiLockTimeout.current)
    }
    el.addEventListener("wheel", unlockGui, { passive: true })
    el.addEventListener("touchmove", unlockGui, { passive: true })
    return () => {
      el.removeEventListener("wheel", unlockGui)
      el.removeEventListener("touchmove", unlockGui)
    }
  }, [])

  // GUI scroll → reveal line in Monaco (only if not locked by programmatic scroll)
  const handleGuiScroll = useCallback(() => {
    if (guiLocked.current) return

    const container = guiScrollRef.current
    const editor = editorRef.current
    if (!container || !editor) return

    const cards = container.querySelectorAll<HTMLElement>("[data-line]")
    const containerTop = container.getBoundingClientRect().top
    let bestLine = 1
    for (const card of cards) {
      const rect = card.getBoundingClientRect()
      if (rect.top >= containerTop - 20) {
        bestLine = Number(card.dataset.line) + 1
        break
      }
    }

    // Lock Editor→GUI so the programmatic reveal doesn't bounce back
    editorLocked.current = true
    window.clearTimeout(editorLockTimeout.current)
    editorLockTimeout.current = window.setTimeout(() => { editorLocked.current = false }, 600)

    editor.revealLineNearTop(bestLine, 1)
  }, [])

  // Monaco scroll → scroll GUI + lock GUI→Editor direction
  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor

    // User scrolls editor → clear the editor lock
    const editorDom = editor.getDomNode()
    if (editorDom) {
      editorDom.addEventListener("wheel", () => {
        editorLocked.current = false
        window.clearTimeout(editorLockTimeout.current)
      }, { passive: true })
    }

    editor.onDidScrollChange(() => {
      if (editorLocked.current) return

      // Debounce
      window.clearTimeout(editorSyncTimer.current)
      editorSyncTimer.current = window.setTimeout(() => {
        const container = guiScrollRef.current
        if (!container) return

        const ranges = editor.getVisibleRanges()
        if (!ranges.length) return
        const topLine = ranges[0].startLineNumber - 1

        // Lock GUI→Editor sync so the programmatic scroll doesn't bounce back
        guiLocked.current = true
        window.clearTimeout(guiLockTimeout.current)
        guiLockTimeout.current = window.setTimeout(() => { guiLocked.current = false }, 600)

        const cards = container.querySelectorAll<HTMLElement>("[data-line]")
        let bestCard: HTMLElement | null = null
        let bestDist = Infinity
        for (const card of cards) {
          const line = Number(card.dataset.line)
          const dist = Math.abs(line - topLine)
          if (dist < bestDist) {
            bestDist = dist
            bestCard = card
          }
        }
        if (bestCard) {
          bestCard.scrollIntoView({ behavior: "smooth", block: "nearest" })
        }
      }, 60)
    })
  }, [])

  // Click on a field → scroll Monaco to that line
  const scrollEditorToField = useCallback((line: number) => {
    const editor = editorRef.current
    if (!editor) return
    editor.revealLineInCenter(line + 1)
  }, [])

  return (
    <section className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Configuration</h2>
          <p className="text-sm text-zinc-400">
            Editing config for{" "}
            <span className="font-medium text-zinc-300">{activeProfile?.name ?? activeProfileId}</span>
          </p>
        </div>
        <div className="ml-auto w-full max-w-sm">
          <Select value={activeConfigName} onValueChange={(value) => void onLoadConfig(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select config file" />
            </SelectTrigger>
            <SelectContent>
              {configFiles.map((file) => (
                <SelectItem key={file} value={file}>
                  {file}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => void onSave()} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save"}
        </Button>
        <Button variant="outline" asChild>
          <a
            href={api.downloadUrls.configFile(activeConfigName, activeProfileId === "default" ? undefined : activeProfileId)}
            target="_blank"
            rel="noreferrer"
          >
            Download
          </a>
        </Button>
      </div>

      <Card className="min-h-0 flex-1 overflow-hidden p-0">
        <Group orientation="horizontal" className="h-full">
          {/* GUI Panel */}
          <Panel defaultSize={40} minSize={30}>
            <div
              ref={guiScrollRef}
              className="h-full overflow-y-auto scroll-smooth p-4"
              onScroll={handleGuiScroll}
            >
              <div className="mx-auto w-full max-w-2xl space-y-5">
                {sectionGroups.map((group) => {
                  const collapsed = collapsedSections.has(group.section)
                  return (
                    <div key={group.section} className="overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/50">
                      {/* Section header */}
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 border-l-[3px] border-l-indigo-500 bg-gradient-to-r from-indigo-500/10 to-transparent px-4 py-3.5 text-left transition-colors hover:from-indigo-500/15"
                        onClick={() => toggleSection(group.section)}
                      >
                        {collapsed ? (
                          <ChevronRight className="h-4 w-4 shrink-0 text-indigo-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 shrink-0 text-indigo-400" />
                        )}
                        <span className="text-sm font-semibold text-indigo-300">{group.displayName}</span>
                        <span className="ml-auto rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">{group.fields.length}</span>
                      </button>

                      {/* Fields */}
                      {!collapsed ? (
                        <div className="border-t border-zinc-800/40 px-4 pb-3 pt-2">
                          <div className="space-y-2">
                            {group.fields.map((field) => (
                              <div
                                key={fieldKey(field)}
                                data-line={field.line}
                                className="group cursor-pointer rounded-lg border border-zinc-800/30 bg-zinc-950/40 p-3 transition-colors hover:border-indigo-500/30 hover:bg-zinc-900/60"
                                onClick={() => scrollEditorToField(field.line)}
                              >
                                {field.type === "bool" ? (
                                  /* Boolean: compact row with toggle */
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                      <Label className="text-sm text-zinc-300">{field.label || field.key}</Label>
                                      {field.comment ? (
                                        <p className="truncate text-xs text-zinc-600">{field.comment}</p>
                                      ) : null}
                                    </div>
                                    <Switch
                                      checked={field.value.toLowerCase() === "true" || field.value === "1"}
                                      onCheckedChange={(checked) => onFieldChange(field, checked ? "True" : "False")}
                                    />
                                  </div>
                                ) : (
                                  /* Other types: label + input */
                                  <div className="space-y-1.5">
                                    <Label className="text-sm text-zinc-300">{field.label || field.key}</Label>
                                    {field.comment ? (
                                      <p className="text-xs text-zinc-600">{field.comment}</p>
                                    ) : null}
                                    <Input
                                      value={field.value}
                                      type={field.type === "number" ? "number" : field.type === "secret" ? "password" : "text"}
                                      onChange={(event) => onFieldChange(field, event.target.value)}
                                      onClick={(event) => event.stopPropagation()}
                                      className="bg-zinc-950/80"
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          </Panel>

          <Separator className="w-1.5 bg-zinc-800 hover:bg-indigo-500" />

          {/* Raw Editor Panel */}
          <Panel defaultSize={60} minSize={35}>
            <div className="h-full overflow-hidden">
              <Editor
                height="100%"
                defaultLanguage={activeConfigName.endsWith(".json") ? "json" : "ini"}
                value={editorRaw}
                theme="vs-dark"
                onChange={(value) => setEditorRaw(value ?? "")}
                onMount={handleEditorMount}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  wordWrap: "on",
                  fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
                  smoothScrolling: true,
                }}
              />
            </div>
          </Panel>
        </Group>
      </Card>
    </section>
  )
}
