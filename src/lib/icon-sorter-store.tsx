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
export const DEFAULT_ICON_COLOR = "#18181b"

export type IconGroup = {
  id: string
  name: string
  createdAt: string
}

export type IconKeywords = Record<string, string[]>

export type SavedIcon = {
  name: string
  groupId: string
  keywords: IconKeywords
  color: string
  savedAt: string
}

export type DiscardedIcon = {
  name: string
  color: string
  discardedAt: string
  previousIcon?: SavedIcon
}

export type IconSorterData = {
  version: 2
  groups: IconGroup[]
  icons: SavedIcon[]
  discardedIcons: DiscardedIcon[]
  reviewedIconNames: string[]
  keywordGroups: string[]
}

type IconSorterContextValue = {
  data: IconSorterData
  addGroup: (name: string) => string | null
  renameGroup: (groupId: string, name: string) => void
  removeGroup: (groupId: string) => void
  addKeywordGroup: (name: string) => void
  removeKeywordGroup: (name: string) => void
  assignIcon: (icon: Omit<SavedIcon, "savedAt">) => void
  moveIcon: (iconName: string, groupId: string) => void
  updateIconKeywords: (iconName: string, keywords: IconKeywords) => void
  removeIcon: (iconName: string) => void
  discardIcon: (iconName: string, color?: string) => void
  restoreDiscardedIcon: (iconName: string) => void
  exportData: () => void
}

type StoredData = Partial<IconSorterData> & {
  version?: number
  discardedIconNames?: unknown
}

const IconSorterContext = createContext<IconSorterContextValue | null>(null)

function createEmptyData(): IconSorterData {
  return {
    version: 2,
    groups: [],
    icons: [],
    discardedIcons: [],
    reviewedIconNames: [],
    keywordGroups: DEFAULT_KEYWORD_GROUPS,
  }
}

function createId() {
  return crypto.randomUUID()
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

function normalizeKeywords(keywords: IconKeywords): IconKeywords {
  return Object.fromEntries(
    Object.entries(keywords).map(([group, values]) => [
      normalizeName(group).toLowerCase(),
      uniqueValues(values),
    ])
  )
}

function removeKeywordFromIcon(icon: SavedIcon, keywordGroup: string) {
  const keywords = { ...icon.keywords }
  delete keywords[keywordGroup]
  return { ...icon, keywords }
}

function loadData(): IconSorterData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return createEmptyData()
    }

    const parsed = JSON.parse(raw) as StoredData
    const groups = Array.isArray(parsed.groups) ? parsed.groups : []
    const groupIds = new Set(groups.map((group) => group.id))
    const icons = Array.isArray(parsed.icons)
      ? parsed.icons
          .filter(
            (icon): icon is SavedIcon =>
              Boolean(icon) &&
              typeof icon.name === "string" &&
              typeof icon.groupId === "string" &&
              groupIds.has(icon.groupId)
          )
          .map((icon) => ({
            ...icon,
            color: normalizeColor(icon.color),
            keywords: normalizeKeywords(icon.keywords ?? {}),
          }))
      : []

    const discardedIcons = Array.isArray(parsed.discardedIcons)
      ? parsed.discardedIcons
          .filter(
            (icon): icon is DiscardedIcon =>
              Boolean(icon) && typeof icon.name === "string"
          )
          .map((icon) => ({
            ...icon,
            color: normalizeColor(icon.color),
            previousIcon: icon.previousIcon
              ? {
                  ...icon.previousIcon,
                  color: normalizeColor(icon.previousIcon.color),
                  keywords: normalizeKeywords(icon.previousIcon.keywords ?? {}),
                }
              : undefined,
          }))
      : Array.isArray(parsed.discardedIconNames)
        ? parsed.discardedIconNames
            .filter((name): name is string => typeof name === "string")
            .map((name) => ({
              name,
              color: DEFAULT_ICON_COLOR,
              discardedAt: new Date().toISOString(),
            }))
        : []

    const discardedNames = new Set(discardedIcons.map((icon) => icon.name))
    const normalizedIcons = icons.filter((icon) => !discardedNames.has(icon.name))
    const reviewedIconNames = uniqueValues([
      ...(Array.isArray(parsed.reviewedIconNames)
        ? parsed.reviewedIconNames.filter(
            (name): name is string => typeof name === "string"
          )
        : []),
      ...normalizedIcons.map((icon) => icon.name),
      ...discardedIcons.map((icon) => icon.name),
    ])

    return {
      version: 2,
      groups,
      icons: normalizedIcons,
      discardedIcons,
      reviewedIconNames,
      keywordGroups: Array.isArray(parsed.keywordGroups)
        ? uniqueValues(
            parsed.keywordGroups
              .filter((group): group is string => typeof group === "string")
              .map((group) => group.toLowerCase())
          )
        : DEFAULT_KEYWORD_GROUPS,
    }
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

  const assignIcon = useCallback((icon: Omit<SavedIcon, "savedAt">) => {
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
    setData((current) => ({
      ...current,
      icons: current.icons.map((icon) =>
        icon.name === iconName ? { ...icon, groupId } : icon
      ),
    }))
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
