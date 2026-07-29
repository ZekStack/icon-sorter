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

import {
  createExportPayload,
  createEmptyData,
  DEFAULT_ICON_COLOR,
  iconId,
  normalizeColor,
  normalizeData,
  normalizeKeywords,
  type IconKeywords,
  type IconReference,
  type IconSorterData,
  type SavedIcon,
} from "@/lib/icon-sorter-data"

export {
  DEFAULT_ICON_COLOR,
  type DiscardedIcon,
  type IconKeywords,
  type IconReference,
  type IconSorterData,
  type IconType,
  type SavedIcon,
} from "@/lib/icon-sorter-data"

const STORAGE_KEY = "icon-sorter.library.v2"

export type IconSorterImportResult = {
  groups: number
  icons: number
  discardedIcons: number
}

type AssignIconInput = Omit<SavedIcon, "savedAt">

type IconSorterContextValue = {
  data: IconSorterData
  addGroup: (name: string) => string | null
  renameGroup: (groupId: string, name: string) => void
  removeGroup: (groupId: string) => void
  assignIcon: (icon: AssignIconInput) => void
  moveIcon: (icon: IconReference, groupId: string) => void
  updateIconKeywords: (icon: IconReference, keywords: IconKeywords) => void
  removeIcon: (icon: IconReference) => void
  discardIcon: (icon: IconReference, color?: string) => void
  restoreDiscardedIcon: (icon: IconReference) => void
  exportData: () => void
  importData: (payload: unknown) => IconSorterImportResult
}

const IconSorterContext = createContext<IconSorterContextValue | null>(null)

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

function loadData(): IconSorterData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? normalizeData(JSON.parse(raw)) : createEmptyData()
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
      const returnedIconIds = new Set(
        current.icons.filter((icon) => icon.groupId === groupId).map(iconId)
      )

      return {
        ...current,
        groups: current.groups.filter((group) => group.id !== groupId),
        icons: current.icons.filter((icon) => icon.groupId !== groupId),
        reviewedIcons: current.reviewedIcons.filter(
          (icon) => !returnedIconIds.has(iconId(icon))
        ),
      }
    })
  }, [])

  const assignIcon = useCallback((icon: AssignIconInput) => {
    setData((current) => {
      const targetId = iconId(icon)
      if (
        current.reviewedIcons.some(
          (reviewedIcon) => iconId(reviewedIcon) === targetId
        ) ||
        !current.groups.some((group) => group.id === icon.groupId)
      ) {
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
        reviewedIcons: [
          ...current.reviewedIcons,
          { type: icon.type, name: icon.name },
        ],
      }
    })
  }, [])

  const moveIcon = useCallback((icon: IconReference, groupId: string) => {
    setData((current) => {
      if (!current.groups.some((group) => group.id === groupId)) {
        return current
      }

      const targetId = iconId(icon)
      return {
        ...current,
        icons: current.icons.map((savedIcon) =>
          iconId(savedIcon) === targetId ? { ...savedIcon, groupId } : savedIcon
        ),
      }
    })
  }, [])

  const updateIconKeywords = useCallback(
    (icon: IconReference, keywords: IconKeywords) => {
      const targetId = iconId(icon)
      setData((current) => ({
        ...current,
        icons: current.icons.map((savedIcon) =>
          iconId(savedIcon) === targetId
            ? { ...savedIcon, keywords: normalizeKeywords(keywords) }
            : savedIcon
        ),
      }))
    },
    []
  )

  const removeIcon = useCallback((icon: IconReference) => {
    const targetId = iconId(icon)
    setData((current) => ({
      ...current,
      icons: current.icons.filter(
        (savedIcon) => iconId(savedIcon) !== targetId
      ),
      discardedIcons: current.discardedIcons.filter(
        (discardedIcon) => iconId(discardedIcon) !== targetId
      ),
      reviewedIcons: current.reviewedIcons.filter(
        (reviewedIcon) => iconId(reviewedIcon) !== targetId
      ),
    }))
  }, [])

  const discardIcon = useCallback(
    (icon: IconReference, color = DEFAULT_ICON_COLOR) => {
      const targetId = iconId(icon)
      setData((current) => {
        if (
          current.discardedIcons.some(
            (discardedIcon) => iconId(discardedIcon) === targetId
          )
        ) {
          return current
        }

        const previousIcon = current.icons.find(
          (savedIcon) => iconId(savedIcon) === targetId
        )
        const isReviewed = current.reviewedIcons.some(
          (reviewedIcon) => iconId(reviewedIcon) === targetId
        )

        return {
          ...current,
          icons: current.icons.filter(
            (savedIcon) => iconId(savedIcon) !== targetId
          ),
          discardedIcons: [
            ...current.discardedIcons,
            {
              ...icon,
              color: previousIcon?.color ?? normalizeColor(color),
              discardedAt: new Date().toISOString(),
              previousIcon,
            },
          ],
          reviewedIcons: isReviewed
            ? current.reviewedIcons
            : [...current.reviewedIcons, icon],
        }
      })
    },
    []
  )

  const restoreDiscardedIcon = useCallback((icon: IconReference) => {
    const targetId = iconId(icon)
    setData((current) => {
      const discardedIcon = current.discardedIcons.find(
        (candidate) => iconId(candidate) === targetId
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
          (candidate) => iconId(candidate) !== targetId
        ),
        reviewedIcons: canRestoreToLibrary
          ? current.reviewedIcons
          : current.reviewedIcons.filter(
              (reviewedIcon) => iconId(reviewedIcon) !== targetId
            ),
      }
    })
  }, [])

  const exportData = useCallback(() => {
    const payload = JSON.stringify(createExportPayload(data), null, 2)
    const blob = new Blob([payload], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `icon-library-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }, [data])

  const importData = useCallback((payload: unknown) => {
    const imported = normalizeData(payload)
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
