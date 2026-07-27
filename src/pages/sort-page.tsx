import { useEffect, useMemo, useState, type FormEvent } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArchiveX,
  ArrowRight,
  Check,
  ChevronDown,
  FolderPlus,
  Languages,
  Palette,
  Trash2,
} from "lucide-react"
import { useTranslation } from "react-i18next"

import {
  ConfirmError,
  useConfirm,
} from "@/components/custom/confirm-dialog"
import { useSelect } from "@/components/custom/select-dialog"
import { KeywordFields } from "@/components/keyword-fields"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { iconCatalog } from "@/lib/icon-catalog"
import {
  DEFAULT_ICON_COLOR,
  useIconSorter,
  type IconKeywords,
} from "@/lib/icon-sorter-store"

export function SortPage() {
  const {
    data,
    addGroup,
    addKeywordGroup,
    removeKeywordGroup,
    assignIcon,
    discardIcon,
  } = useIconSorter()
  const { confirm } = useConfirm()
  const { select } = useSelect()
  const { t, i18n } = useTranslation()
  const [selectedGroupId, setSelectedGroupId] = useState("")
  const [groupName, setGroupName] = useState("")
  const [keywordGroupName, setKeywordGroupName] = useState("")
  const [keywords, setKeywords] = useState<IconKeywords>({})
  const [color, setColor] = useState(DEFAULT_ICON_COLOR)
  const locale = i18n.language.startsWith("hu") ? "hu-HU" : "en-US"

  useEffect(() => {
    if (
      !selectedGroupId ||
      !data.groups.some((group) => group.id === selectedGroupId)
    ) {
      setSelectedGroupId(data.groups[0]?.id ?? "")
    }
  }, [data.groups, selectedGroupId])

  const selectedGroup = data.groups.find(
    (group) => group.id === selectedGroupId
  )
  const reviewed = useMemo(
    () => new Set(data.reviewedIconNames),
    [data.reviewedIconNames]
  )
  const currentIcon = useMemo(
    () => iconCatalog.find((icon) => !reviewed.has(icon.name)),
    [reviewed]
  )
  const remainingCount = useMemo(
    () =>
      iconCatalog.reduce(
        (count, icon) => count + Number(!reviewed.has(icon.name)),
        0
      ),
    [reviewed]
  )
  const reviewedCount = iconCatalog.length - remainingCount
  const progress = iconCatalog.length
    ? Math.min((reviewedCount / iconCatalog.length) * 100, 100)
    : 0

  function resetIconFields() {
    setKeywords({})
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

  function handleAddKeywordGroup(event: FormEvent) {
    event.preventDefault()
    const normalizedName = keywordGroupName.trim().toLowerCase()
    if (!normalizedName) {
      return
    }
    addKeywordGroup(normalizedName)
    setKeywordGroupName("")
  }

  async function chooseGroup() {
    const selected = await select({
      items: data.groups,
      itemValue: "id",
      itemLabel: "name",
      defaultValue: selectedGroup ?? null,
      title: t("sort.selectGroup"),
      description: t("sort.selectGroupDescription"),
      search: data.groups.length > 8,
      searchPlaceholder: t("common.search"),
      emptyText: t("sort.firstGroup"),
      saveLabel: t("common.select"),
      cancelLabel: t("common.cancel"),
    })

    if (selected) {
      setSelectedGroupId(selected.id)
    }
  }

  async function handleRemoveKeywordGroup(group: string) {
    const confirmed = await confirm({
      label: t("keywords.removeTitle", { name: group }),
      description: t("keywords.removeConfirm", { name: group }),
      type: ConfirmError,
      media: <Trash2 className="size-5" />,
      confirmLabel: t("common.remove"),
      cancelLabel: t("common.cancel"),
      dismissible: false,
    })
    if (!confirmed) {
      return
    }

    removeKeywordGroup(group)
    setKeywords((current) => {
      const nextKeywords = { ...current }
      delete nextKeywords[group]
      return nextKeywords
    })
  }

  function handleAssign() {
    if (!currentIcon || !selectedGroupId) {
      return
    }

    assignIcon({
      name: currentIcon.name,
      groupId: selectedGroupId,
      keywords,
      color,
    })
    resetIconFields()
  }

  function handleDiscard() {
    if (!currentIcon) {
      return
    }

    discardIcon(currentIcon.name, color)
    resetIconFields()
  }

  if (!currentIcon) {
    return (
      <div className="grid min-h-[calc(100svh-8rem)] place-items-center border-x border-dashed px-6 text-center">
        <div className="grid max-w-sm gap-4">
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
          <div className="flex items-center justify-between border-b px-4 py-3 text-xs text-muted-foreground sm:px-6">
            <span>
              {reviewedCount.toLocaleString(locale)} /{" "}
              {iconCatalog.length.toLocaleString(locale)}
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
                <HugeiconsIcon
                  icon={currentIcon.icon}
                  size={124}
                  strokeWidth={1.35}
                  color={color}
                />
              </div>
              <div className="max-w-full font-mono text-sm font-medium break-all sm:text-base">
                {currentIcon.name}
              </div>
            </div>
          </div>

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
              disabled={!selectedGroupId}
              onClick={handleAssign}
            >
              {t("sort.assign")}
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </section>

        <aside className="grid content-start divide-y">
          <section className="grid gap-3 p-4 sm:p-5">
            <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("sort.group")}
            </div>
            {data.groups.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                {t("sort.firstGroup")}
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full justify-between px-3"
                onClick={() => void chooseGroup()}
              >
                <span className="truncate">
                  {selectedGroup?.name ?? t("sort.noGroupSelected")}
                </span>
                <ChevronDown />
              </Button>
            )}
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
            <KeywordFields
              groups={data.keywordGroups}
              value={keywords}
              onChange={setKeywords}
              onRemoveGroup={(group) => void handleRemoveKeywordGroup(group)}
            />
            <form className="flex gap-2" onSubmit={handleAddKeywordGroup}>
              <Input
                value={keywordGroupName}
                placeholder={t("sort.keywordBucket")}
                onChange={(event) => setKeywordGroupName(event.target.value)}
              />
              <Button type="submit" variant="outline">
                {t("common.add")}
              </Button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  )
}
