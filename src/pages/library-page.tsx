import { useMemo, useState, type FormEvent } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Download,
  FolderPlus,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react"

import { KeywordFields } from "@/components/keyword-fields"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { iconCatalogByName } from "@/lib/icon-catalog"
import {
  useIconSorter,
  type IconKeywords,
  type SavedIcon,
} from "@/lib/icon-sorter-store"

export function LibraryPage() {
  const {
    data,
    addGroup,
    renameGroup,
    moveIcon,
    updateIconKeywords,
    removeIcon,
    exportData,
  } = useIconSorter()
  const [search, setSearch] = useState("")
  const [groupName, setGroupName] = useState("")
  const [editingIcon, setEditingIcon] = useState<SavedIcon | null>(null)
  const [editingKeywords, setEditingKeywords] = useState<IconKeywords>({})
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingGroupName, setEditingGroupName] = useState("")

  const normalizedSearch = search.trim().toLowerCase()
  const visibleIcons = useMemo(() => {
    if (!normalizedSearch) {
      return data.icons
    }

    return data.icons.filter((icon) => {
      const groupNameValue =
        data.groups.find((group) => group.id === icon.groupId)?.name ?? ""
      const keywords = Object.values(icon.keywords).flat().join(" ")
      return `${icon.name} ${groupNameValue} ${keywords}`
        .toLowerCase()
        .includes(normalizedSearch)
    })
  }, [data.groups, data.icons, normalizedSearch])

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

  function openIconEditor(icon: SavedIcon) {
    setEditingIcon(icon)
    setEditingKeywords(icon.keywords)
  }

  function saveIconEditor() {
    if (!editingIcon) {
      return
    }
    updateIconKeywords(editingIcon.name, editingKeywords)
    setEditingIcon(null)
  }

  return (
    <>
      <div className="grid gap-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={search}
              placeholder="Search names, groups, or keywords"
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <form className="flex gap-2" onSubmit={handleAddGroup}>
            <Input
              className="sm:w-48"
              value={groupName}
              placeholder="New group"
              onChange={(event) => setGroupName(event.target.value)}
            />
            <Button type="submit" variant="outline" aria-label="Add group">
              <FolderPlus />
              <span className="hidden sm:inline">Add group</span>
            </Button>
          </form>
          <Button onClick={exportData} disabled={data.icons.length === 0}>
            <Download />
            Export JSON
          </Button>
        </div>

        <div className="flex items-center gap-2 border-y py-3 text-xs text-muted-foreground">
          <Badge>{visibleIcons.length.toLocaleString()} visible</Badge>
          <span>{data.icons.length.toLocaleString()} saved total</span>
        </div>

        {data.groups.length === 0 ? (
          <div className="grid min-h-80 place-items-center border border-dashed p-6 text-center text-sm text-muted-foreground">
            No groups yet. Create one here or start sorting icons.
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
                          Save
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label="Cancel group editing"
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
                        <Badge>{groupIcons.length}</Badge>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Rename ${group.name}`}
                          onClick={() => startGroupEdit(group.id, group.name)}
                        >
                          <Pencil />
                        </Button>
                      </>
                    )}
                  </div>

                  {groupIcons.length === 0 ? (
                    <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                      {normalizedSearch
                        ? "No matching icons in this group."
                        : "This group is empty."}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 xl:grid-cols-3">
                      {groupIcons.map((icon) => (
                        <IconRow
                          key={icon.name}
                          icon={icon}
                          groups={data.groups}
                          onMove={(groupId) => moveIcon(icon.name, groupId)}
                          onEdit={() => openIconEditor(icon)}
                          onRemove={() => removeIcon(icon.name)}
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
          className="fixed inset-0 z-50 grid place-items-end bg-black/40 p-0 sm:place-items-center sm:p-6"
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
            aria-label={`Edit ${editingIcon.name}`}
            className="grid max-h-[90svh] w-full gap-5 overflow-y-auto rounded-t-2xl border bg-background p-5 shadow-2xl sm:max-w-xl sm:rounded-2xl"
          >
            <div className="flex items-start gap-4">
              <div className="grid size-16 shrink-0 place-items-center rounded-xl border bg-muted/40">
                <HugeIconPreview name={editingIcon.name} size={36} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-sm font-semibold break-all">
                  {editingIcon.name}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Comma-separate multiple keywords.
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Close editor"
                onClick={() => setEditingIcon(null)}
              >
                <X />
              </Button>
            </div>
            <KeywordFields
              groups={data.keywordGroups}
              value={editingKeywords}
              onChange={setEditingKeywords}
            />
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setEditingIcon(null)}>
                Cancel
              </Button>
              <Button onClick={saveIconEditor}>Save keywords</Button>
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
}: {
  icon: SavedIcon
  groups: { id: string; name: string }[]
  onMove: (groupId: string) => void
  onEdit: () => void
  onRemove: () => void
}) {
  const keywordCount = Object.values(icon.keywords).flat().length

  return (
    <article className="grid grid-cols-[4rem_minmax(0,1fr)] gap-3 bg-background p-3">
      <div className="grid size-16 place-items-center rounded-xl border bg-muted/30">
        <HugeIconPreview name={icon.name} size={34} />
      </div>
      <div className="grid min-w-0 content-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-mono text-xs font-medium" title={icon.name}>
            {icon.name}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {keywordCount} keyword{keywordCount === 1 ? "" : "s"}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <select
            className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={icon.groupId}
            aria-label={`Move ${icon.name}`}
            onChange={(event) => onMove(event.target.value)}
          >
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          <Button
            size="icon-sm"
            variant="outline"
            aria-label={`Edit ${icon.name} keywords`}
            onClick={onEdit}
          >
            <Pencil />
          </Button>
          <Button
            size="icon-sm"
            variant="destructive"
            aria-label={`Remove ${icon.name} and return it to the queue`}
            onClick={onRemove}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
    </article>
  )
}

function HugeIconPreview({ name, size }: { name: string; size: number }) {
  const catalogItem = iconCatalogByName.get(name)
  if (!catalogItem) {
    return <span className="text-xs text-muted-foreground">?</span>
  }

  return (
    <HugeiconsIcon icon={catalogItem.icon} size={size} strokeWidth={1.4} />
  )
}
