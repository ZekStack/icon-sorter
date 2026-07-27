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
  savedAt: string
}

export type IconSorterData = {
  version: 1
  groups: IconGroup[]
  icons: SavedIcon[]
  reviewedIconNames: string[]
  keywordGroups: string[]
}

type IconSorterContextValue = {
  data: IconSorterData
  addGroup: (name: string) => string | null
  renameGroup: (groupId: string, name: string) => void
  addKeywordGroup: (name: string) => void
  assignIcon: (icon: Omit<SavedIcon, "savedAt">) => void
  moveIcon: (iconName: string, groupId: string) => void
  updateIconKeywords: (iconName: string, keywords: IconKeywords) => void
  removeIcon: (iconName: string) => void
  exportData: () => void
}

const emptyData: IconSorterData = {
  version: 1,
  groups: [],
  icons: [],
  reviewedIconNames: [],
  keywordGroups: DEFAULT_KEYWORD_GROUPS,
}

const IconSorterContext = createContext<IconSorterContextValue | null>(null)

function createId() {
  return crypto.randomUUID()
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

function uniqueValues(values: string[]) {
  return [...new Set(values.map(normalizeName).filter(Boolean))]
}

function normalizeKeywords(keywords: IconKeywords): IconKeywords {
  return Object.fromEntries(
    Object.entries(keywords).map(([group, values]) => [
      normalizeName(group).toLowerCase(),
      uniqueValues(values),
    ])
  )
}

function loadData(): IconSorterData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return emptyData
    }

    const parsed = JSON.parse(raw) as Partial<IconSorterData>
    return {
      version: 1,
      groups: Array.isArray(parsed.groups) ? parsed.groups : [],
      icons: Array.isArray(parsed.icons) ? parsed.icons : [],
      reviewedIconNames: Array.isArray(parsed.reviewedIconNames)
        ? parsed.reviewedIconNames
        : [],
      keywordGroups: Array.isArray(parsed.keywordGroups)
        ? uniqueValues([...DEFAULT_KEYWORD_GROUPS, ...parsed.keywordGroups])
        : DEFAULT_KEYWORD_GROUPS,
    }
  } catch {
    return emptyData
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
      reviewedIconNames: current.reviewedIconNames.filter(
        (name) => name !== iconName
      ),
    }))
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
      addKeywordGroup,
      assignIcon,
      moveIcon,
      updateIconKeywords,
      removeIcon,
      exportData,
    }),
    [
      data,
      addGroup,
      renameGroup,
      addKeywordGroup,
      assignIcon,
      moveIcon,
      updateIconKeywords,
      removeIcon,
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
