import { useMemo, useState, type FormEvent } from "react"
import {
  ArchiveX,
  ArrowRight,
  Check,
  FolderPlus,
  Languages,
  Palette,
} from "lucide-react"
import { useTranslation } from "react-i18next"

import { IconPreview } from "@/components/icon-preview"
import { IconTypeBadge } from "@/components/icon-type-badge"
import { IconTypeFilterControl } from "@/components/icon-type-filter"
import { KeywordTextarea } from "@/components/keyword-textarea"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { iconCatalog, type IconTypeFilter } from "@/lib/icon-catalog"
import { parseKeywordText } from "@/lib/icon-keywords"
import { iconId } from "@/lib/icon-sorter-data"
import { DEFAULT_ICON_COLOR, useIconSorter } from "@/lib/icon-sorter-store"
import { cn } from "@/lib/utils"

export function SortPage() {
  const { data, addGroup, assignIcon, discardIcon } = useIconSorter()
  const { t, i18n } = useTranslation()
  const [selectedGroupId, setSelectedGroupId] = useState("")
  const [groupName, setGroupName] = useState("")
  const [keywordText, setKeywordText] = useState("")
  const [color, setColor] = useState(DEFAULT_ICON_COLOR)
  const [iconTypeFilter, setIconTypeFilter] = useState<IconTypeFilter>("all")
  const locale = i18n.language.startsWith("hu") ? "hu-HU" : "en-US"

  const selectedGroup =
    data.groups.find((group) => group.id === selectedGroupId) ?? data.groups[0]
  const activeGroupId = selectedGroup?.id ?? ""
  const filteredCatalog = useMemo(
    () =>
      iconTypeFilter === "all"
        ? iconCatalog
        : iconCatalog.filter((icon) => icon.type === iconTypeFilter),
    [iconTypeFilter]
  )
  const reviewed = useMemo(
    () => new Set(data.reviewedIcons.map(iconId)),
    [data.reviewedIcons]
  )
  const currentIcon = useMemo(
    () => filteredCatalog.find((icon) => !reviewed.has(iconId(icon))),
    [filteredCatalog, reviewed]
  )
  const remainingCount = useMemo(
    () =>
      filteredCatalog.reduce(
        (count, icon) => count + Number(!reviewed.has(iconId(icon))),
        0
      ),
    [filteredCatalog, reviewed]
  )
  const reviewedCount = filteredCatalog.length - remainingCount
  const progress = filteredCatalog.length
    ? Math.min((reviewedCount / filteredCatalog.length) * 100, 100)
    : 0

  function resetIconFields() {
    setKeywordText("")
    setColor(DEFAULT_ICON_COLOR)
  }

  function handleAddGroup(event: FormEvent) {
    event.preventDefault()
    const newGroupId = addGroup(groupName)
    if (newGroupId) {
      setSelectedGroupId(newGroupId)
      setGroupName("")
    }
  }

  function handleAssign() {
    if (!currentIcon || !activeGroupId) {
      return
    }

    assignIcon({
      type: currentIcon.type,
      name: currentIcon.name,
      groupId: activeGroupId,
      keywords: parseKeywordText(keywordText),
      color,
    })
    resetIconFields()
  }

  function handleDiscard() {
    if (!currentIcon) {
      return
    }

    discardIcon(currentIcon, color)
    resetIconFields()
  }

  function handleTypeFilterChange(value: IconTypeFilter) {
    setIconTypeFilter(value)
    resetIconFields()
  }

  if (!currentIcon) {
    return (
      <div className="grid min-h-[calc(100svh-8rem)] place-items-center border-x border-dashed px-6 py-8 text-center">
        <div className="grid max-w-sm justify-items-center gap-4">
          <IconTypeFilterControl
            value={iconTypeFilter}
            onChange={handleTypeFilterChange}
          />
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-foreground text-background">
            <Check className="size-6" />
          </div>
          <div className="text-lg font-semibold">{t("sort.complete")}</div>
          <p className="text-sm text-muted-foreground">
            {t("sort.completeDescription")}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-foreground transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="flex min-h-[34rem] flex-col border-b lg:border-r lg:border-b-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 text-xs text-muted-foreground sm:px-6">
            <IconTypeFilterControl
              value={iconTypeFilter}
              onChange={handleTypeFilterChange}
            />
            <span>
              {reviewedCount.toLocaleString(locale)} /{" "}
              {filteredCatalog.length.toLocaleString(locale)}
            </span>
            <Badge>
              {t("sort.remaining", {
                count: remainingCount.toLocaleString(locale),
              })}
            </Badge>
          </div>

          <div className="grid flex-1 place-items-center px-4 py-10 sm:px-8">
            <div className="grid justify-items-center gap-6 text-center">
              <div className="grid size-48 place-items-center rounded-[2rem] border bg-muted/35 sm:size-56">
                <IconPreview icon={currentIcon} size={124} color={color} />
              </div>
              <div className="grid max-w-full justify-items-center gap-2">
                <IconTypeBadge type={currentIcon.type} />
                <div className="font-mono text-sm font-medium break-all sm:text-base">
                  {currentIcon.name}
                </div>
              </div>
            </div>
          </div>

          <fieldset className="grid gap-3 border-t px-4 py-4 sm:px-6">
            <legend className="sr-only">{t("sort.selectGroup")}</legend>
            <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("sort.group")}
            </div>
            {data.groups.length === 0 ? (
              <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                {t("sort.firstGroup")}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {data.groups.map((group) => {
                  const isSelected = group.id === activeGroupId

                  return (
                    <label
                      key={group.id}
                      className={cn(
                        "flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "bg-background hover:bg-muted"
                      )}
                    >
                      <input
                        type="radio"
                        name="sort-group"
                        value={group.id}
                        checked={isSelected}
                        className="size-4 accent-current"
                        onChange={() => setSelectedGroupId(group.id)}
                      />
                      <span>{group.name}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </fieldset>

          <div className="grid gap-2 border-t p-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:p-6">
            <Button
              size="lg"
              variant="outline"
              onClick={handleDiscard}
              aria-label={t("sort.discardAria", { name: currentIcon.name })}
            >
              <ArchiveX />
              {t("sort.discard")}
            </Button>
            <Button
              size="lg"
              className="w-full"
              disabled={!activeGroupId}
              onClick={handleAssign}
            >
              {t("sort.assign")}
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </section>

        <aside className="grid content-start divide-y">
          <section className="grid gap-3 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <FolderPlus className="size-4" />
              {t("sort.newGroup")}
            </div>
            <form className="flex gap-2" onSubmit={handleAddGroup}>
              <Input
                value={groupName}
                placeholder={t("sort.newGroup")}
                onChange={(event) => setGroupName(event.target.value)}
              />
              <Button
                type="submit"
                size="icon-lg"
                variant="outline"
                aria-label={t("sort.addGroup")}
                title={t("sort.addGroup")}
              >
                <FolderPlus />
              </Button>
            </form>
          </section>

          <section className="grid gap-3 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <Palette className="size-4" />
              {t("sort.color")}
            </div>
            <label className="flex items-center gap-3 rounded-lg border p-2">
              <input
                type="color"
                className="size-10 cursor-pointer rounded-md border-0 bg-transparent p-0"
                value={color}
                aria-label={t("sort.color")}
                onChange={(event) => setColor(event.target.value)}
              />
              <span className="font-mono text-sm">{color}</span>
            </label>
          </section>

          <section className="grid gap-3 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <Languages className="size-4" />
              {t("sort.keywords")}
            </div>
            <KeywordTextarea value={keywordText} onChange={setKeywordText} />
          </section>
        </aside>
      </div>
    </div>
  )
}
