import { useEffect, useMemo, useState, type FormEvent } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight, Check, FolderPlus, Languages } from "lucide-react"

import { KeywordFields } from "@/components/keyword-fields"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { iconCatalog } from "@/lib/icon-catalog"
import {
  useIconSorter,
  type IconKeywords,
} from "@/lib/icon-sorter-store"
import { cn } from "@/lib/utils"

export function SortPage() {
  const { data, addGroup, addKeywordGroup, assignIcon } = useIconSorter()
  const [selectedGroupId, setSelectedGroupId] = useState("")
  const [groupName, setGroupName] = useState("")
  const [keywordGroupName, setKeywordGroupName] = useState("")
  const [keywords, setKeywords] = useState<IconKeywords>({})

  useEffect(() => {
    if (
      !selectedGroupId ||
      !data.groups.some((group) => group.id === selectedGroupId)
    ) {
      setSelectedGroupId(data.groups[0]?.id ?? "")
    }
  }, [data.groups, selectedGroupId])

  const reviewed = useMemo(
    () => new Set(data.reviewedIconNames),
    [data.reviewedIconNames]
  )
  const currentIcon = useMemo(
    () => iconCatalog.find((icon) => !reviewed.has(icon.name)),
    [reviewed]
  )
  const remainingCount = Math.max(
    iconCatalog.length - data.reviewedIconNames.length,
    0
  )
  const progress = iconCatalog.length
    ? Math.min(
        (data.reviewedIconNames.length / iconCatalog.length) * 100,
        100
      )
    : 0

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

  function handleAssign() {
    if (!currentIcon || !selectedGroupId) {
      return
    }

    assignIcon({
      name: currentIcon.name,
      groupId: selectedGroupId,
      keywords,
    })
    setKeywords({})
  }

  if (!currentIcon) {
    return (
      <div className="grid min-h-[calc(100svh-8rem)] place-items-center border-x border-dashed px-6 text-center">
        <div className="grid max-w-sm gap-4">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-foreground text-background">
            <Check className="size-6" />
          </div>
          <div className="text-lg font-semibold">Every icon is sorted.</div>
          <p className="text-sm text-muted-foreground">
            Open the library to review, move, edit, remove, or export the result.
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
              {data.reviewedIconNames.length.toLocaleString()} /{" "}
              {iconCatalog.length.toLocaleString()}
            </span>
            <Badge>{remainingCount.toLocaleString()} remaining</Badge>
          </div>

          <div className="grid flex-1 place-items-center px-4 py-10 sm:px-8">
            <div className="grid justify-items-center gap-6 text-center">
              <div className="grid size-48 place-items-center rounded-[2rem] border bg-muted/35 sm:size-56">
                <HugeiconsIcon
                  icon={currentIcon.icon}
                  size={124}
                  strokeWidth={1.35}
                />
              </div>
              <div className="max-w-full font-mono text-sm font-medium break-all sm:text-base">
                {currentIcon.name}
              </div>
            </div>
          </div>

          <div className="border-t p-4 sm:p-6">
            <Button
              size="lg"
              className="w-full"
              disabled={!selectedGroupId}
              onClick={handleAssign}
            >
              Assign and continue
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </section>

        <aside className="grid content-start divide-y">
          <section className="grid gap-3 p-4 sm:p-5">
            <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Group
            </div>
            <div className="grid max-h-52 gap-1 overflow-y-auto pr-1">
              {data.groups.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Create the first group before assigning this icon.
                </div>
              ) : (
                data.groups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    className={cn(
                      "flex min-h-10 items-center justify-between rounded-lg border px-3 text-left text-sm transition-colors",
                      selectedGroupId === group.id
                        ? "border-foreground bg-foreground text-background"
                        : "hover:bg-muted"
                    )}
                    onClick={() => setSelectedGroupId(group.id)}
                  >
                    <span className="truncate">{group.name}</span>
                    {selectedGroupId === group.id ? (
                      <Check className="size-4" />
                    ) : null}
                  </button>
                ))
              )}
            </div>
            <form className="flex gap-2" onSubmit={handleAddGroup}>
              <Input
                value={groupName}
                placeholder="New group"
                onChange={(event) => setGroupName(event.target.value)}
              />
              <Button
                type="submit"
                size="icon-lg"
                variant="outline"
                aria-label="Add group"
              >
                <FolderPlus />
              </Button>
            </form>
          </section>

          <section className="grid gap-3 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <Languages className="size-4" />
              Keywords
            </div>
            <KeywordFields
              groups={data.keywordGroups}
              value={keywords}
              onChange={setKeywords}
            />
            <form className="flex gap-2" onSubmit={handleAddKeywordGroup}>
              <Input
                value={keywordGroupName}
                placeholder="Keyword bucket"
                onChange={(event) => setKeywordGroupName(event.target.value)}
              />
              <Button type="submit" variant="outline">
                Add
              </Button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  )
}
