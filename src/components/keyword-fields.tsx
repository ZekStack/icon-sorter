import { useMemo } from "react"
import { X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { IconKeywords } from "@/lib/icon-sorter-store"

function parseKeywords(value: string) {
  return value
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean)
}

function getInputId(group: string) {
  return `keyword-${group.replace(/[^a-z0-9_-]/gi, "-")}`
}

export function KeywordFields({
  groups,
  value,
  onChange,
  onRemoveGroup,
}: {
  groups: string[]
  value: IconKeywords
  onChange: (keywords: IconKeywords) => void
  onRemoveGroup?: (group: string) => void
}) {
  const { t } = useTranslation()
  const normalizedGroups = useMemo(
    () => [...new Set([...groups, ...Object.keys(value)])],
    [groups, value]
  )

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {normalizedGroups.map((group) => {
        const inputId = getInputId(group)
        return (
          <div key={group} className="grid gap-1.5 text-xs font-medium">
            <div className="flex min-h-6 items-center gap-1">
              <label
                htmlFor={inputId}
                className="min-w-0 flex-1 truncate tracking-wide text-muted-foreground uppercase"
              >
                {group}
              </label>
              {onRemoveGroup ? (
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  aria-label={t("keywords.remove", { name: group })}
                  title={t("keywords.remove", { name: group })}
                  onClick={() => onRemoveGroup(group)}
                >
                  <X />
                </Button>
              ) : null}
            </div>
            <Input
              id={inputId}
              value={(value[group] ?? []).join(", ")}
              placeholder={t("keywords.placeholder")}
              onChange={(event) =>
                onChange({
                  ...value,
                  [group]: parseKeywords(event.target.value),
                })
              }
            />
          </div>
        )
      })}
    </div>
  )
}
