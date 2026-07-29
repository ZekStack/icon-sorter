import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react"
import {
  ArchiveX,
  ChevronDown,
  Download,
  FolderPlus,
  Pencil,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react"
import { useTranslation } from "react-i18next"

import {
  ConfirmError,
  ConfirmWarning,
  useConfirm,
} from "@/components/custom/confirm-dialog"
import { IconPreview } from "@/components/icon-preview"
import { IconTypeBadge } from "@/components/icon-type-badge"
import { IconTypeFilterControl } from "@/components/icon-type-filter"
import { useSelect } from "@/components/custom/select-dialog"
import { KeywordTextarea } from "@/components/keyword-textarea"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { IconTypeFilter } from "@/lib/icon-catalog"
import { formatKeywordText, parseKeywordText } from "@/lib/icon-keywords"
import { iconId } from "@/lib/icon-sorter-data"
import { useIconSorter, type SavedIcon } from "@/lib/icon-sorter-store"

type ImportNotice = {
  type: "success" | "error"
  message: string
}

export function LibraryPage() {
  const {
    data,
    addGroup,
    renameGroup,
    removeGroup,
    moveIcon,
    updateIconKeywords,
    removeIcon,
    discardIcon,
    exportData,
    importData,
  } = useIconSorter()
  const { confirm } = useConfirm()
  const { t, i18n } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState("")
  const [groupName, setGroupName] = useState("")
  const [editingIcon, setEditingIcon] = useState<SavedIcon | null>(null)
  const [editingKeywordText, setEditingKeywordText] = useState("")
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingGroupName, setEditingGroupName] = useState("")
  const [importNotice, setImportNotice] = useState<ImportNotice | null>(null)
  const [iconTypeFilter, setIconTypeFilter] = useState<IconTypeFilter>("all")
  const locale = i18n.language.startsWith("hu") ? "hu-HU" : "en-US"

  const normalizedSearch = search.trim().toLowerCase()
  const visibleIcons = useMemo(() => {
    return data.icons.filter((icon) => {
      if (iconTypeFilter !== "all" && icon.type !== iconTypeFilter) {
        return false
      }
      if (!normalizedSearch) {
        return true
      }

      const groupNameValue =
        data.groups.find((group) => group.id === icon.groupId)?.name ?? ""
      const keywords = icon.keywords.join(" ")
      return `${icon.type} ${icon.name} ${groupNameValue} ${keywords}`
        .toLowerCase()
        .includes(normalizedSearch)
    })
  }, [data.groups, data.icons, iconTypeFilter, normalizedSearch])

  const hasExportableData = data.icons.length > 0

  function handleAddGroup(event: FormEvent) {
    event.preventDefault()
    if (addGroup(groupName)) {
      setGroupName("")
    }
  }

  function startGroupEdit(groupId: string, name: string) {
    setEditingGroupId(groupId)
    setEditingGroupName(name)
  }

  function saveGroupEdit(event: FormEvent) {
    event.preventDefault()
    if (!editingGroupId) {
      return
    }
    renameGroup(editingGroupId, editingGroupName)
    setEditingGroupId(null)
    setEditingGroupName("")
  }

  async function handleRemoveGroup(groupId: string, name: string) {
    const iconCount = data.icons.filter(
      (icon) => icon.groupId === groupId
    ).length
    const confirmed = await confirm({
      label: t("library.removeGroupTitle", { name }),
      description: t("library.removeGroupConfirm", {
        name,
        count: iconCount,
      }),
      type: ConfirmError,
      media: <Trash2 className="size-5" />,
      confirmLabel: t("common.remove"),
      cancelLabel: t("common.cancel"),
      dismissible: false,
    })
    if (!confirmed) {
      return
    }

    removeGroup(groupId)
    if (editingGroupId === groupId) {
      setEditingGroupId(null)
      setEditingGroupName("")
    }
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) {
      return
    }

    setImportNotice(null)
    try {
      const payload = JSON.parse(await file.text()) as unknown
      const confirmed = await confirm({
        label: t("library.importTitle"),
        description: t("library.importDescription", { name: file.name }),
        type: ConfirmWarning,
        media: <Upload className="size-5" />,
        confirmLabel: t("library.import"),
        cancelLabel: t("common.cancel"),
        dismissible: false,
      })
      if (!confirmed) {
        return
      }

      const result = importData(payload)
      setEditingIcon(null)
      setEditingGroupId(null)
      setSearch("")
      setImportNotice({
        type: "success",
        message: t("library.importSuccess", result),
      })
    } catch (error) {
      const message =
        error instanceof Error && error.message === "unsupported-type"
          ? t("library.importUnsupported")
          : t("library.importInvalid")
      setImportNotice({ type: "error", message })
    }
  }

  function openIconEditor(icon: SavedIcon) {
    setEditingIcon(icon)
    setEditingKeywordText(formatKeywordText(icon.keywords))
  }

  function saveIconEditor() {
    if (!editingIcon) {
      return
    }
    updateIconKeywords(editingIcon, parseKeywordText(editingKeywordText))
    setEditingIcon(null)
  }

  return (
    <>
      <div className="grid gap-4">
        <div className="flex flex-col gap-2 lg:flex-row">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={search}
              placeholder={t("library.search")}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <form className="flex gap-2" onSubmit={handleAddGroup}>
            <Input
              className="lg:w-48"
              value={groupName}
              placeholder={t("library.newGroup")}
              onChange={(event) => setGroupName(event.target.value)}
            />
            <Button
              type="submit"
              variant="outline"
              aria-label={t("library.addGroup")}
            >
              <FolderPlus />
              <span className="hidden sm:inline">{t("library.addGroup")}</span>
            </Button>
          </form>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => void handleImportFile(event)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload />
              {t("library.import")}
            </Button>
            <Button onClick={exportData} disabled={!hasExportableData}>
              <Download />
              {t("library.export")}
            </Button>
          </div>
        </div>

        {importNotice ? (
          <div
            className={
              importNotice.type === "success"
                ? "rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300"
                : "rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            }
          >
            {importNotice.message}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-y py-3 text-xs text-muted-foreground">
          <IconTypeFilterControl
            value={iconTypeFilter}
            onChange={setIconTypeFilter}
          />
          <Badge>
            {t("library.visible", {
              count: visibleIcons.length.toLocaleString(locale),
            })}
          </Badge>
          <span>
            {t("library.savedTotal", {
              count: data.icons.length.toLocaleString(locale),
            })}
          </span>
        </div>

        {data.groups.length === 0 ? (
          <div className="grid min-h-80 place-items-center border border-dashed p-6 text-center text-sm text-muted-foreground">
            {t("library.noGroups")}
          </div>
        ) : (
          <div className="grid gap-8">
            {data.groups.map((group) => {
              const groupIcons = visibleIcons.filter(
                (icon) => icon.groupId === group.id
              )

              return (
                <section key={group.id} className="grid gap-3">
                  <div className="flex min-h-10 items-center gap-2 border-b pb-2">
                    {editingGroupId === group.id ? (
                      <form
                        className="flex flex-1 items-center gap-2"
                        onSubmit={saveGroupEdit}
                      >
                        <Input
                          autoFocus
                          value={editingGroupName}
                          onChange={(event) =>
                            setEditingGroupName(event.target.value)
                          }
                        />
                        <Button type="submit" size="sm">
                          {t("library.saveGroup")}
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label={t("library.cancelGroupEdit")}
                          onClick={() => setEditingGroupId(null)}
                        >
                          <X />
                        </Button>
                      </form>
                    ) : (
                      <>
                        <div className="min-w-0 flex-1 truncate font-semibold">
                          {group.name}
                        </div>
                        <Badge>
                          {groupIcons.length.toLocaleString(locale)}
                        </Badge>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={t("library.renameGroup", {
                            name: group.name,
                          })}
                          title={t("library.renameGroup", { name: group.name })}
                          onClick={() => startGroupEdit(group.id, group.name)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="destructive"
                          aria-label={t("library.removeGroup", {
                            name: group.name,
                          })}
                          title={t("library.removeGroup", {
                            name: group.name,
                          })}
                          onClick={() =>
                            void handleRemoveGroup(group.id, group.name)
                          }
                        >
                          <Trash2 />
                        </Button>
                      </>
                    )}
                  </div>

                  {groupIcons.length === 0 ? (
                    <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                      {normalizedSearch || iconTypeFilter !== "all"
                        ? t("library.noMatches")
                        : t("library.emptyGroup")}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 xl:grid-cols-3">
                      {groupIcons.map((icon) => (
                        <IconRow
                          key={iconId(icon)}
                          icon={icon}
                          groups={data.groups}
                          onMove={(groupId) => moveIcon(icon, groupId)}
                          onEdit={() => openIconEditor(icon)}
                          onRemove={() => removeIcon(icon)}
                          onDiscard={() => discardIcon(icon)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )}
      </div>

      {editingIcon ? (
        <div
          className="fixed inset-0 z-40 grid place-items-end bg-black/40 p-0 sm:place-items-center sm:p-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setEditingIcon(null)
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("library.editDialog", { name: editingIcon.name })}
            className="grid max-h-[90svh] w-full gap-5 overflow-y-auto rounded-t-2xl border bg-background p-5 shadow-2xl sm:max-w-xl sm:rounded-2xl"
          >
            <div className="flex items-start gap-4">
              <div className="grid size-16 shrink-0 place-items-center rounded-xl border bg-muted/40">
                <IconPreview
                  icon={editingIcon}
                  size={36}
                  color={editingIcon.color}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-sm font-semibold break-all">
                  {editingIcon.name}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <IconTypeBadge type={editingIcon.type} />
                  <span>{t("library.separateKeywords")}</span>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                aria-label={t("library.closeEditor")}
                onClick={() => setEditingIcon(null)}
              >
                <X />
              </Button>
            </div>
            <KeywordTextarea
              value={editingKeywordText}
              onChange={setEditingKeywordText}
            />
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setEditingIcon(null)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={saveIconEditor}>
                {t("library.saveKeywords")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

function IconRow({
  icon,
  groups,
  onMove,
  onEdit,
  onRemove,
  onDiscard,
}: {
  icon: SavedIcon
  groups: { id: string; name: string }[]
  onMove: (groupId: string) => void
  onEdit: () => void
  onRemove: () => void
  onDiscard: () => void
}) {
  const { confirm } = useConfirm()
  const { select } = useSelect()
  const { t } = useTranslation()
  const keywordCount = icon.keywords.length
  const currentGroup = groups.find((group) => group.id === icon.groupId)

  async function chooseGroup() {
    const selected = await select({
      items: groups,
      itemValue: "id",
      itemLabel: "name",
      defaultValue: currentGroup ?? null,
      title: t("library.moveIcon", { name: icon.name }),
      description: t("library.moveIconDescription"),
      search: groups.length > 8,
      searchPlaceholder: t("common.search"),
      saveLabel: t("common.select"),
      cancelLabel: t("common.cancel"),
    })

    if (selected && selected.id !== icon.groupId) {
      onMove(selected.id)
    }
  }

  async function remove() {
    const confirmed = await confirm({
      label: t("library.removeIconTitle", { name: icon.name }),
      description: t("library.removeIconDescription"),
      type: ConfirmError,
      media: <Trash2 className="size-5" />,
      confirmLabel: t("common.remove"),
      cancelLabel: t("common.cancel"),
      dismissible: false,
    })
    if (confirmed) {
      onRemove()
    }
  }

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
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <IconTypeBadge type={icon.type} />
            <span>{t("library.keywordCount", { count: keywordCount })}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-w-0 flex-1 justify-between px-2"
            aria-label={t("library.moveIcon", { name: icon.name })}
            onClick={() => void chooseGroup()}
          >
            <span className="truncate">{currentGroup?.name ?? "—"}</span>
            <ChevronDown />
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            aria-label={t("library.editKeywords", { name: icon.name })}
            title={t("library.editKeywords", { name: icon.name })}
            onClick={onEdit}
          >
            <Pencil />
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            aria-label={t("library.discardIcon", { name: icon.name })}
            title={t("library.discardIcon", { name: icon.name })}
            onClick={onDiscard}
          >
            <ArchiveX />
          </Button>
          <Button
            size="icon-sm"
            variant="destructive"
            aria-label={t("library.removeIcon", { name: icon.name })}
            title={t("library.removeIcon", { name: icon.name })}
            onClick={() => void remove()}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
    </article>
  )
}
