import * as React from "react"
import { Check, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import type {
  Accessor,
  AnyItem,
  ItemOf,
  ItemsArray,
  SelectDialogProps,
  SelectDialogValue,
} from "./select-dialog-types"

function readAccessor<TItem extends AnyItem, TValue>(
  item: TItem,
  index: number,
  accessor: Accessor<TItem, TValue> | undefined,
  fallbackKey: string
): TValue | undefined {
  if (typeof accessor === "function") {
    return accessor(item, index)
  }

  const key = accessor ?? fallbackKey
  return (item as Record<string, unknown>)[key] as TValue | undefined
}

function valueToItemArray<TItem extends AnyItem>(value: unknown): TItem[] {
  if (Array.isArray(value)) {
    return value as TItem[]
  }

  return value ? [value as TItem] : []
}

function getSearchText(value: React.ReactNode): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value)
  }

  return ""
}

export function SelectDialog<
  TItems extends ItemsArray,
  TMulti extends boolean = false,
>(props: SelectDialogProps<TItems, TMulti>) {
  const {
    items,
    multi,
    itemLabel,
    itemDescription,
    itemMedia,
    itemValue,
    value,
    defaultValue,
    onValueChange,
    open,
    onOpenChange,
    trigger,
    title = "Select item",
    description,
    search = true,
    searchPlaceholder = "Search...",
    emptyText = "No items found.",
    saveLabel = "Save",
    cancelLabel = "Cancel",
    selectAllLabel = "Select all",
    deselectAllLabel = "Deselect all",
    disabled,
    className,
    contentClassName,
    bodyClassName,
    onConfirm,
    onCancel,
    renderItem,
  } = props

  const [internalOpen, setInternalOpen] = React.useState(false)
  const [internalValue, setInternalValue] = React.useState<
    SelectDialogValue<ItemOf<TItems>, TMulti>
  >(() => {
    if (defaultValue !== undefined) {
      return defaultValue
    }

    return (multi ? [] : null) as SelectDialogValue<ItemOf<TItems>, TMulti>
  })
  const [query, setQuery] = React.useState("")
  const [draftKeys, setDraftKeys] = React.useState<Set<string>>(new Set())

  const actualOpen = open ?? internalOpen
  const actualValue = value !== undefined ? value : internalValue

  const getItemKey = React.useCallback(
    (item: ItemOf<TItems>, index: number) => {
      const key = readAccessor(item, index, itemValue, "value")
      return key === undefined || key === null ? String(index) : String(key)
    },
    [itemValue]
  )

  const valueToKeys = React.useCallback(
    (selectedValue: SelectDialogValue<ItemOf<TItems>, TMulti>) => {
      const selectedItems = valueToItemArray<ItemOf<TItems>>(selectedValue)
      const keys = new Set<string>()

      for (const selectedItem of selectedItems) {
        const index = items.findIndex((item) => item === selectedItem)
        if (index >= 0) {
          keys.add(getItemKey(items[index], index))
          continue
        }

        if (itemValue) {
          const selectedKey = readAccessor(selectedItem, 0, itemValue, "value")
          if (selectedKey !== undefined && selectedKey !== null) {
            keys.add(String(selectedKey))
          }
        }
      }

      return keys
    },
    [getItemKey, itemValue, items]
  )

  const keysToValue = React.useCallback(
    (keys: Set<string>) => {
      const selectedItems = items.filter((item, index) =>
        keys.has(getItemKey(item, index))
      )

      return (multi ? selectedItems : (selectedItems[0] ?? null)) as SelectDialogValue<
        ItemOf<TItems>,
        TMulti
      >
    },
    [getItemKey, items, multi]
  )

  React.useEffect(() => {
    if (!actualOpen) {
      return
    }

    setQuery("")
    setDraftKeys(valueToKeys(actualValue))
  }, [actualOpen, actualValue, valueToKeys])

  React.useEffect(() => {
    if (!actualOpen) {
      return undefined
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel?.()
        if (open === undefined) {
          setInternalOpen(false)
        }
        onOpenChange?.(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [actualOpen, onCancel, onOpenChange, open])

  const filteredItems = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return items
    }

    return items.filter((item, index) => {
      const label = readAccessor(item, index, itemLabel, "label")
      const descriptionValue = readAccessor(
        item,
        index,
        itemDescription,
        "description"
      )

      return `${getSearchText(label)} ${getSearchText(descriptionValue)}`
        .toLowerCase()
        .includes(normalizedQuery)
    })
  }, [itemDescription, itemLabel, items, query])

  const allSelected = items.length > 0 && draftKeys.size === items.length

  function setOpen(nextOpen: boolean) {
    if (open === undefined) {
      setInternalOpen(nextOpen)
    }
    onOpenChange?.(nextOpen)
  }

  function cancel() {
    onCancel?.()
    setOpen(false)
  }

  function save() {
    const nextValue = keysToValue(draftKeys)
    if (value === undefined) {
      setInternalValue(nextValue)
    }
    onValueChange?.(nextValue)
    onConfirm?.(nextValue)
    setOpen(false)
  }

  function toggleItem(item: ItemOf<TItems>, index: number) {
    const key = getItemKey(item, index)
    setDraftKeys((previous) => {
      const next = new Set(previous)
      if (multi) {
        if (next.has(key)) {
          next.delete(key)
        } else {
          next.add(key)
        }
        return next
      }

      next.clear()
      next.add(key)
      return next
    })
  }

  function toggleAll() {
    if (!multi) {
      return
    }

    setDraftKeys(
      allSelected
        ? new Set()
        : new Set(items.map((item, index) => getItemKey(item, index)))
    )
  }

  return (
    <>
      {trigger ? (
        <span
          role="button"
          tabIndex={disabled ? -1 : 0}
          onClick={() => !disabled && setOpen(true)}
          onKeyDown={(event) => {
            if (!disabled && (event.key === "Enter" || event.key === " ")) {
              setOpen(true)
            }
          }}
        >
          {trigger}
        </span>
      ) : null}

      {actualOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-end bg-black/45 sm:place-items-center sm:p-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              cancel()
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className={cn(
              "grid max-h-[90svh] w-full grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-t-2xl border bg-background shadow-2xl sm:max-w-lg sm:rounded-2xl",
              contentClassName
            )}
          >
            <div className="grid gap-1 border-b p-5">
              <div className="font-semibold">{title}</div>
              {description ? (
                <div className="text-sm text-muted-foreground">{description}</div>
              ) : null}
            </div>

            <div className={cn("grid min-h-0 gap-4 p-4 sm:p-5", className)}>
              {search ? (
                <label className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    autoFocus
                    value={query}
                    className="pl-9"
                    placeholder={searchPlaceholder}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
              ) : null}

              <div
                className={cn(
                  "min-h-0 overflow-y-auto overscroll-contain pr-1",
                  bodyClassName
                )}
              >
                <div className="grid gap-2">
                  {filteredItems.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      {emptyText}
                    </div>
                  ) : null}

                  {filteredItems.map((item) => {
                    const realIndex = items.findIndex(
                      (candidate) => candidate === item
                    )
                    const index = realIndex >= 0 ? realIndex : 0
                    const key = getItemKey(item, index)
                    const selected = draftKeys.has(key)
                    const label = readAccessor(item, index, itemLabel, "label")
                    const descriptionValue = readAccessor(
                      item,
                      index,
                      itemDescription,
                      "description"
                    )
                    const media = readAccessor(item, index, itemMedia, "media")
                    const toggle = () => toggleItem(item, index)

                    if (renderItem) {
                      return (
                        <React.Fragment key={key}>
                          {renderItem({
                            item,
                            index,
                            selected,
                            label,
                            description: descriptionValue,
                            media,
                            toggle,
                          })}
                        </React.Fragment>
                      )
                    }

                    return (
                      <button
                        key={key}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-muted",
                          selected && "border-foreground bg-muted"
                        )}
                        onClick={toggle}
                      >
                        {media ? (
                          <div className="grid size-12 shrink-0 place-items-center rounded-lg border bg-background">
                            {media}
                          </div>
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{label}</div>
                          {descriptionValue ? (
                            <div className="mt-0.5 truncate text-xs text-muted-foreground">
                              {descriptionValue}
                            </div>
                          ) : null}
                        </div>
                        <div
                          className={cn(
                            "grid size-6 shrink-0 place-items-center rounded-full border",
                            selected && "border-foreground bg-foreground text-background"
                          )}
                        >
                          {selected ? <Check className="size-3.5" /> : null}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t p-4 sm:p-5">
              {multi ? (
                <Button type="button" variant="ghost" onClick={toggleAll}>
                  {allSelected ? deselectAllLabel : selectAllLabel}
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={cancel}>
                  {cancelLabel}
                </Button>
                <Button
                  type="button"
                  disabled={!multi && draftKeys.size === 0}
                  onClick={save}
                >
                  {saveLabel}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
