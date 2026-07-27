import { useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { RotateCcw, Search } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { iconCatalogByName } from "@/lib/icon-catalog"
import {
  useIconSorter,
  type DiscardedIcon,
} from "@/lib/icon-sorter-store"

export function DiscardedPage() {
  const { data, restoreDiscardedIcon } = useIconSorter()
  const { t, i18n } = useTranslation()
  const [search, setSearch] = useState("")
  const normalizedSearch = search.trim().toLowerCase()
  const locale = i18n.language.startsWith("hu") ? "hu-HU" : "en-US"

  const visibleIcons = useMemo(() => {
    if (!normalizedSearch) {
      return data.discardedIcons
    }

    return data.discardedIcons.filter((icon) =>
      icon.name.toLowerCase().includes(normalizedSearch)
    )
  }, [data.discardedIcons, normalizedSearch])

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

      <div className="flex items-center gap-2 border-y py-3 text-xs text-muted-foreground">
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
              key={icon.name}
              icon={icon}
              restoresToLibrary={Boolean(
                icon.previousIcon &&
                  data.groups.some(
                    (group) => group.id === icon.previousIcon?.groupId
                  )
              )}
              onRestore={() => restoreDiscardedIcon(icon.name)}
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
  const catalogItem = iconCatalogByName.get(icon.name)

  return (
    <article className="grid grid-cols-[4rem_minmax(0,1fr)] gap-3 bg-background p-3">
      <div className="grid size-16 place-items-center rounded-xl border bg-muted/30">
        {catalogItem ? (
          <HugeiconsIcon
            icon={catalogItem.icon}
            size={34}
            strokeWidth={1.4}
            color={icon.color}
          />
        ) : (
          <span className="text-xs text-muted-foreground">?</span>
        )}
      </div>
      <div className="grid min-w-0 content-between gap-3">
        <div className="min-w-0">
          <div
            className="truncate font-mono text-xs font-medium"
            title={icon.name}
          >
            {icon.name}
          </div>
          <Badge className="mt-1.5">
            {restoresToLibrary
              ? t("discarded.restoresToLibrary")
              : t("discarded.restoresToQueue")}
          </Badge>
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
