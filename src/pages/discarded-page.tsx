import { useMemo, useState } from "react"
import { RotateCcw, Search } from "lucide-react"
import { useTranslation } from "react-i18next"

import { IconPreview } from "@/components/icon-preview"
import { IconTypeBadge } from "@/components/icon-type-badge"
import { IconTypeFilterControl } from "@/components/icon-type-filter"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { IconTypeFilter } from "@/lib/icon-catalog"
import { iconId } from "@/lib/icon-sorter-data"
import { useIconSorter, type DiscardedIcon } from "@/lib/icon-sorter-store"

export function DiscardedPage() {
  const { data, restoreDiscardedIcon } = useIconSorter()
  const { t, i18n } = useTranslation()
  const [search, setSearch] = useState("")
  const [iconTypeFilter, setIconTypeFilter] = useState<IconTypeFilter>("all")
  const normalizedSearch = search.trim().toLowerCase()
  const locale = i18n.language.startsWith("hu") ? "hu-HU" : "en-US"

  const visibleIcons = useMemo(() => {
    return data.discardedIcons.filter((icon) => {
      if (iconTypeFilter !== "all" && icon.type !== iconTypeFilter) {
        return false
      }

      return (
        !normalizedSearch ||
        `${icon.type} ${icon.name}`.toLowerCase().includes(normalizedSearch)
      )
    })
  }, [data.discardedIcons, iconTypeFilter, normalizedSearch])

  return (
    <div className="grid gap-4">
      <label className="relative max-w-2xl">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          value={search}
          placeholder={t("discarded.search")}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>

      <div className="flex flex-wrap items-center gap-2 border-y py-3 text-xs text-muted-foreground">
        <IconTypeFilterControl
          value={iconTypeFilter}
          onChange={setIconTypeFilter}
        />
        <Badge>
          {t("discarded.visible", {
            count: visibleIcons.length.toLocaleString(locale),
          })}
        </Badge>
        <span>
          {t("discarded.total", {
            count: data.discardedIcons.length.toLocaleString(locale),
          })}
        </span>
      </div>

      {data.discardedIcons.length === 0 ? (
        <div className="grid min-h-80 place-items-center border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t("discarded.empty")}
        </div>
      ) : visibleIcons.length === 0 ? (
        <div className="grid min-h-80 place-items-center border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t("discarded.noMatches")}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleIcons.map((icon) => (
            <DiscardedIconRow
              key={iconId(icon)}
              icon={icon}
              restoresToLibrary={Boolean(
                icon.previousIcon &&
                data.groups.some(
                  (group) => group.id === icon.previousIcon?.groupId
                )
              )}
              onRestore={() => restoreDiscardedIcon(icon)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DiscardedIconRow({
  icon,
  restoresToLibrary,
  onRestore,
}: {
  icon: DiscardedIcon
  restoresToLibrary: boolean
  onRestore: () => void
}) {
  const { t } = useTranslation()

  return (
    <article className="grid grid-cols-[4rem_minmax(0,1fr)] gap-3 bg-background p-3">
      <div className="grid size-16 place-items-center rounded-xl border bg-muted/30">
        <IconPreview icon={icon} size={34} color={icon.color} />
      </div>
      <div className="grid min-w-0 content-between gap-3">
        <div className="min-w-0">
          <div
            className="truncate font-mono text-xs font-medium"
            title={icon.name}
          >
            {icon.name}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <IconTypeBadge type={icon.type} />
            <Badge>
              {restoresToLibrary
                ? t("discarded.restoresToLibrary")
                : t("discarded.restoresToQueue")}
            </Badge>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="justify-self-start"
          aria-label={t("discarded.restoreIcon", { name: icon.name })}
          onClick={onRestore}
        >
          <RotateCcw />
          {t("common.restore")}
        </Button>
      </div>
    </article>
  )
}
