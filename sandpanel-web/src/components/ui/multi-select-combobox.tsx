import { Check, ChevronsUpDown, X } from "lucide-react"
import { useMemo, useState } from "react"
import { cn } from "../../lib/utils"
import { Badge } from "./badge"
import { Button } from "./button"
import { Input } from "./input"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

type Props = {
  options: string[]
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}

export function MultiSelectCombobox({ options, value, onChange, placeholder = "Select values" }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return options.filter((item) => item.toLowerCase().includes(normalized))
  }, [options, query])

  const toggleValue = (item: string) => {
    if (value.includes(item)) {
      onChange(value.filter((v) => v !== item))
      return
    }
    onChange([...value, item])
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="truncate text-left text-zinc-300">{value.length === 0 ? placeholder : `${value.length} selected`}</span>
            <ChevronsUpDown className="h-4 w-4 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[360px] p-3" align="start">
          <div className="space-y-2">
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter mutators" />
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {filtered.map((item) => {
                const selected = value.includes(item)
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleValue(item)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm",
                      selected ? "bg-indigo-600/20 text-indigo-200" : "text-zinc-200 hover:bg-zinc-800",
                    )}
                  >
                    <span className="truncate text-left">{item}</span>
                    {selected ? <Check className="h-4 w-4" /> : null}
                  </button>
                )
              })}
              {filtered.length === 0 ? <p className="px-3 py-2 text-sm text-zinc-500">No matches found.</p> : null}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {value.map((item) => (
            <Badge key={item} variant="secondary" className="gap-1 pr-1">
              <span>{item}</span>
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-indigo-500/30"
                onClick={() => onChange(value.filter((v) => v !== item))}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  )
}
