/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

const STORAGE_KEY = "icon-sorter.library.v1"
const DEFAULT_KEYWORD_GROUPS = ["hu", "en"]

export const ICON_LIBRARY_TYPE = "Huge icons" as const
export const DEFAULT_ICON_COLOR = "#a1a1aa"

export type IconLibraryType = typeof ICON_LIBRARY_TYPE

export type IconGroup = {
  id: string
  name: string
  createdAt: string
}

export type IconKeywords = Record<string, string[]>

export type SavedIcon = {
  type: IconLibraryType
  name: string
  groupId: string
  keywords: IconKeywords
  color: string
  savedAt: string
}

export type DiscardedIcon = {
  type: IconLibraryType
  name: string
  color: string
  discardedAt: string
  previousIcon?: SavedIcon
}

export type IconSorterData = {
  version: 3
  type: IconLibraryType
  groups: IconGroup[]
  icons: SavedIcon[]
  discardedIcons: DiscardedIcon[]
  reviewedIconNames: string[]
  keywordGroups: string[]
}

export type IconSorterImportResult = {
  groups: number
  icons: number
  discardedIcons: number
}

type AssignIconInput = Omit<SavedIcon, "savedAt" | "type"> & {
  type?: IconLibraryType
}

type IconSorterContextValue = {
  data: IconSorterData
  addGroup: (name: string) => string | null
  renameGroup: (groupId: string, name: string) => void
  removeGroup: (groupId: string) => void
  addKeywordGroup: (name: string) => void
  removeKeywordGroup: (name: string) => void
  assignIcon: (icon: AssignIconInput) => void
  moveIcon: (iconName: string, groupId: string) => void
  updateIconKeywords: (iconName: string, keywords: IconKeywords) => void
  removeIcon: (iconName: string) => void
  discardIcon: (iconName: string, color?: string) => void
  restoreDiscardedIcon: (iconName: string) => void
  exportData: () => void
  importData: (payload: unknown) => IconSorterImportResult
}

type StoredData = Record<string, unknown> & {
  discardedIconNames?: unknown
}

const IconSorterContext = createContext<IconSorterContextValue | null>(null)

function createEmptyData(): IconSorterData {
  return {
    version: 3,
    type: ICON_LIBRARY_TYPE,
    groups: [],
    icons: [],
    discardedIcons: [],
    reviewedIconNames: [],
    keywordGroups: DEFAULT_KEYWORD_GROUPS,
  }
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

function uniqueValues(values: string[]) {
  return [...new Set(values.map(normalizeName).filter(Boolean))]
}

function normalizeColor(value: unknown) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)
    ? value.toLowerCase()
    : DEFAULT_ICON_COLOR
}

function normalizeKeywords(value: unknown): IconKeywords {
  if (!isRecord(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([group, keywords]) => {
      const normalizedGroup = normalizeName(group).toLowerCase()
      if (!normalizedGroup || !Array.isArray(keywords)) {
        return []
      }

      return [
        [
          normalizedGroup,
          uniqueValues(
            keywords.filter(
              (keyword): keyword is string => typeof keyword === "string"
            )
          ),
        ],
      ]
    })
  )
}

function assertSupportedType(value: unknown, strict: boolean) {
  if (value === undefined || value === ICON_LIBRARY_TYPE) {
    return
  }

  if (strict) {
    throw new Error("unsupported-type")
  }
}

function normalizeGroups(value: unknown): IconGroup[] {
  if (!Array.isArray(value)) {
    return []
  }

  const groups = new Map<string, IconGroup>()
  for (const candidate of value) {
    if (!isRecord(candidate)) {
      continue
    }

    const id = typeof candidate.id === "string" ? candidate.id.trim() : ""
    const name =
      typeof candidate.name === "string" ? normalizeName(candidate.name) : ""
    if (!id || !name || groups.has(id)) {
      continue
    }

    groups.set(id, {
      id,
      name,
      createdAt:
        typeof candidate.createdAt === "string"
          ? candidate.createdAt
          : new Date().toISOString(),
    })
  }

  return [...groups.values()]
}

function normalizeSavedIcon(
  value: unknown,
  groupIds: Set<string>,
  strict: boolean
): SavedIcon | null {
  if (!isRecord(value)) {
    return null
  }

  assertSupportedType(value.type, strict)

  const name = typeof value.name === "string" ? value.name.trim() : ""
  const groupId =
    typeof value.groupId === "string" ? value.groupId.trim() : ""
  if (!name || !groupId || !groupIds.has(groupId)) {
    return null
  }

  return {
    type: ICON_LIBRARY_TYPE,
    name,
    groupId,
    keywords: normalizeKeywords(value.keywords),
    color: normalizeColor(value.color),
    savedAt:
      typeof value.savedAt === "string"
        ? value.savedAt
        : new Date().toISOString(),
  }
}

function normalizeDiscardedIcon(
  value: unknown,
  groupIds: Set<string>,
  strict: boolean
): DiscardedIcon | null {
  if (!isRecord(value)) {
    return null
  }

  assertSupportedType(value.type, strict)

  const name = typeof value.name === "string" ? value.name.trim() : ""
  if (!name) {
    return null
  }

  const previousIcon = normalizeSavedIcon(value.previousIcon, groupIds, strict)
  return {
    type: ICON_LIBRARY_TYPE,
    name,
    color: previousIcon?.color ?? normalizeColor(value.color),
    discardedAt:
      typeof value.discardedAt === "string"
        ? value.discardedAt
        : new Date().toISOString(),
    previousIcon: previousIcon ?? undefined,
  }
}

function normalizeData(payload: unknown, strict: boolean): IconSorterData {
  if (!isRecord(payload)) {
    throw new Error("invalid-data")
  }

  const parsed = payload as StoredData
  assertSupportedType(parsed.type, strict)

  const groups = normalizeGroups(parsed.groups)
  const groupIds = new Set(groups.map((group) => group.id))

  const iconsByName = new Map<string, SavedIcon>()
  if (Array.isArray(parsed.icons)) {
    for (const candidate of parsed.icons) {
      const icon = normalizeSavedIcon(candidate, groupIds, strict)
      if (icon && !iconsByName.has(icon.name)) {
        iconsByName.set(icon.name, icon)
      }
    }
  }

  const discardedByName = new Map<string, DiscardedIcon>()
  if (Array.isArray(parsed.discardedIcons)) {
    for (const candidate of parsed.discardedIcons) {
      const icon = normalizeDiscardedIcon(candidate, groupIds, strict)
      if (icon && !discardedByName.has(icon.name)) {
        discardedByName.set(icon.name, icon)
      }
    }
  } else if (Array.isArray(parsed.discardedIconNames)) {
    for (const name of parsed.discardedIconNames) {
      if (typeof name === "string" && name.trim()) {
        discardedByName.set(name.trim(), {
          type: ICON_LIBRARY_TYPE,
          name: name.trim(),
          color: DEFAULT_ICON_COLOR,
          discardedAt: new Date().toISOString(),
        })
      }
    }
  }

  for (const discardedName of discardedByName.keys()) {
    iconsByName.delete(discardedName)
  }

  const icons = [...iconsByName.values()]
  const discardedIcons = [...discardedByName.values()]
  const reviewedIconNames = uniqueValues([
    ...(Array.isArray(parsed.reviewedIconNames)
      ? parsed.reviewedIconNames.filter(
          (name): name is string => typeof name === "string"
        )
      : []),
    ...icons.map((icon) => icon.name),
    ...discardedIcons.map((icon) => icon.name),
  ])

  const keywordGroups = Array.isArray(parsed.keywordGroups)
    ? uniqueValues(
        parsed.keywordGroups
          .filter((group): group is string => typeof group === "string")
          .map((group) => group.toLowerCase())
      )
    : DEFAULT_KEYWORD_GROUPS

  return {
    version: 3,
    type: ICON_LIBRARY_TYPE,
    groups,
    icons,
    discardedIcons,
    reviewedIconNames,
    keywordGroups,
  }
}

function removeKeywordFromIcon(icon: SavedIcon, keywordGroup: string) {
  const keywords = { ...icon.keywords }
  delete keywords[keywordGroup]
  return { ...icon, keywords }
}

function loadData(): IconSorterData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? normalizeData(JSON.parse(raw), false) : createEmptyData()
  } catch {
    return createEmptyData()
  }
}

export function IconSorterProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<IconSorterData>(loadData)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  const addGroup = useCallback(
    (name: string) => {
      const normalizedName = normalizeName(name)
      if (!normalizedName) {
        return null
      }

      const existing = data.groups.find(
        (group) => group.name.toLowerCase() === normalizedName.toLowerCase()
      )
      if (existing) {
        return existing.id
      }

      const groupId = createId()
      setData((current) => ({
        ...current,
        groups: [
          ...current.groups,
          {
            id: groupId,
            name: normalizedName,
            createdAt: new Date().toISOString(),
          },
        ],
      }))
      return groupId
    },
    [data.groups]
  )

  const renameGroup = useCallback((groupId: string, name: string) => {
    const normalizedName = normalizeName(name)
    if (!normalizedName) {
      return
    }

    setData((current) => ({
      ...current,
      groups: current.groups.map((group) =>
        group.id === groupId ? { ...group, name: normalizedName } : group
      ),
    }))
  }, [])

  const removeGroup = useCallback((groupId: string) => {
    setData((current) => {
      const returnedIconNames = new Set(
        current.icons
          .filter((icon) => icon.groupId === groupId)
          .map((icon) => icon.name)
      )

      return {
        ...current,
        groups: current.groups.filter((group) => group.id !== groupId),
        icons: current.icons.filter((icon) => icon.groupId !== groupId),
        reviewedIconNames: current.reviewedIconNames.filter(
          (name) => !returnedIconNames.has(name)
        ),
      }
    })
  }, [])

  const addKeywordGroup = useCallback((name: string) => {
    const normalizedName = normalizeName(name).toLowerCase()
    if (!normalizedName) {
      return
    }

    setData((current) => ({
      ...current,
      keywordGroups: uniqueValues([...current.keywordGroups, normalizedName]),
    }))
  }, [])

  const removeKeywordGroup = useCallback((name: string) => {
    const normalizedName = normalizeName(name).toLowerCase()
    if (!normalizedName) {
      return
    }

    setData((current) => ({
      ...current,
      keywordGroups: current.keywordGroups.filter(
        (group) => group !== normalizedName
      ),
      icons: current.icons.map((icon) =>
        removeKeywordFromIcon(icon, normalizedName)
      ),
      discardedIcons: current.discardedIcons.map((discardedIcon) => ({
        ...discardedIcon,
        previousIcon: discardedIcon.previousIcon
          ? removeKeywordFromIcon(discardedIcon.previousIcon, normalizedName)
          : undefined,
      })),
    }))
  }, [])

  const assignIcon = useCallback((icon: AssignIconInput) => {
    setData((current) => {
      if (current.reviewedIconNames.includes(icon.name)) {
        return current
      }

      return {
        ...current,
        icons: [
          ...current.icons,
          {
            ...icon,
            type: ICON_LIBRARY_TYPE,
            color: normalizeColor(icon.color),
            keywords: normalizeKeywords(icon.keywords),
            savedAt: new Date().toISOString(),
          },
        ],
        reviewedIconNames: [...current.reviewedIconNames, icon.name],
      }
    })
  }, [])

  const moveIcon = useCallback((iconName: string, groupId: string) => {
    setData((current) => {
      if (!current.groups.some((group) => group.id === groupId)) {
        return current
      }

      return {
        ...current,
        icons: current.icons.map((icon) =>
          icon.name === iconName ? { ...icon, groupId } : icon
        ),
      }
    })
  }, [])

  const updateIconKeywords = useCallback(
    (iconName: string, keywords: IconKeywords) => {
      setData((current) => ({
        ...current,
        icons: current.icons.map((icon) =>
          icon.name === iconName
            ? { ...icon, keywords: normalizeKeywords(keywords) }
            : icon
        ),
      }))
    },
    []
  )

  const removeIcon = useCallback((iconName: string) => {
    setData((current) => ({
      ...current,
      icons: current.icons.filter((icon) => icon.name !== iconName),
      discardedIcons: current.discardedIcons.filter(
        (icon) => icon.name !== iconName
      ),
      reviewedIconNames: current.reviewedIconNames.filter(
        (name) => name !== iconName
      ),
    }))
  }, [])

  const discardIcon = useCallback(
    (iconName: string, color = DEFAULT_ICON_COLOR) => {
      setData((current) => {
        if (current.discardedIcons.some((icon) => icon.name === iconName)) {
          return current
        }

        const previousIcon = current.icons.find((icon) => icon.name === iconName)
        return {
          ...current,
          icons: current.icons.filter((icon) => icon.name !== iconName),
          discardedIcons: [
            ...current.discardedIcons,
            {
              type: ICON_LIBRARY_TYPE,
              name: iconName,
              color: previousIcon?.color ?? normalizeColor(color),
              discardedAt: new Date().toISOString(),
              previousIcon,
            },
          ],
          reviewedIconNames: current.reviewedIconNames.includes(iconName)
            ? current.reviewedIconNames
            : [...current.reviewedIconNames, iconName],
        }
      })
    },
    []
  )

  const restoreDiscardedIcon = useCallback((iconName: string) => {
    setData((current) => {
      const discardedIcon = current.discardedIcons.find(
        (icon) => icon.name === iconName
      )
      if (!discardedIcon) {
        return current
      }

      const canRestoreToLibrary =
        discardedIcon.previousIcon &&
        current.groups.some(
          (group) => group.id === discardedIcon.previousIcon?.groupId
        )

      return {
        ...current,
        icons: canRestoreToLibrary
          ? [...current.icons, discardedIcon.previousIcon as SavedIcon]
          : current.icons,
        discardedIcons: current.discardedIcons.filter(
          (icon) => icon.name !== iconName
        ),
        reviewedIconNames: canRestoreToLibrary
          ? current.reviewedIconNames
          : current.reviewedIconNames.filter((name) => name !== iconName),
      }
    })
  }, [])

  const exportData = useCallback(() => {
    const payload = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        ...data,
      },
      null,
      2
    )
    const blob = new Blob([payload], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `hugeicons-library-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }, [data])

  const importData = useCallback((payload: unknown) => {
    const imported = normalizeData(payload, true)
    setData(imported)
    return {
      groups: imported.groups.length,
      icons: imported.icons.length,
      discardedIcons: imported.discardedIcons.length,
    }
  }, [])

  const value = useMemo(
    () => ({
      data,
      addGroup,
      renameGroup,
      removeGroup,
      addKeywordGroup,
      removeKeywordGroup,
      assignIcon,
      moveIcon,
      updateIconKeywords,
      removeIcon,
      discardIcon,
      restoreDiscardedIcon,
      exportData,
      importData,
    }),
    [
      data,
      addGroup,
      renameGroup,
      removeGroup,
      addKeywordGroup,
      removeKeywordGroup,
      assignIcon,
      moveIcon,
      updateIconKeywords,
      removeIcon,
      discardIcon,
      restoreDiscardedIcon,
      exportData,
      importData,
    ]
  )

  return (
    <IconSorterContext.Provider value={value}>
      {children}
    </IconSorterContext.Provider>
  )
}

export function useIconSorter() {
  const context = useContext(IconSorterContext)
  if (!context) {
    throw new Error("useIconSorter must be used inside IconSorterProvider")
  }
  return context
}
