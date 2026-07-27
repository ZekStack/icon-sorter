import { useMemo } from "react"

import { Input } from "@/components/ui/input"
import type { IconKeywords } from "@/lib/icon-sorter-store"

function parseKeywords(value: string) {
  return value
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean)
}

export function KeywordFields({
  groups,
  value,
  onChange,
}: {
  groups: string[]
  value: IconKeywords
  onChange: (keywords: IconKeywords) => void
}) {
  const normalizedGroups = useMemo(
    () => [...new Set([...groups, ...Object.keys(value)])],
    [groups, value]
  )

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {normalizedGroups.map((group) => (
        <label key={group} className="grid gap-1.5 text-xs font-medium">
          <span className="uppercase tracking-wide text-muted-foreground">
            {group}
          </span>
          <Input
            value={(value[group] ?? []).join(", ")}
            placeholder="door, entrance, access"
            onChange={(event) =>
              onChange({
                ...value,
                [group]: parseKeywords(event.target.value),
              })
            }
          />
        </label>
      ))}
    </div>
  )
}
