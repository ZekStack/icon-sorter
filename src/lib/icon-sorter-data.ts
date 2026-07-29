export const ICON_SORTER_VERSION = 4 as const
export const ICON_TYPES = ["HugeIcon", "HsHIcon"] as const
export const DEFAULT_ICON_COLOR = "#a1a1aa"

export type IconType = (typeof ICON_TYPES)[number]

export type IconReference = {
  type: IconType
  name: string
}

export type IconGroup = {
  id: string
  name: string
  createdAt: string
}

export type IconKeywords = string[]

export type SavedIcon = IconReference & {
  groupId: string
  keywords: IconKeywords
  color: string
  savedAt: string
}

export type DiscardedIcon = IconReference & {
  color: string
  discardedAt: string
  previousIcon?: SavedIcon
}

export type IconSorterData = {
  version: typeof ICON_SORTER_VERSION
  iconTypes: IconType[]
  groups: IconGroup[]
  icons: SavedIcon[]
  discardedIcons: DiscardedIcon[]
  reviewedIcons: IconReference[]
}

export type ExportedIcon = IconReference & {
  group: string
  keywords: IconKeywords
}

type StoredData = Record<string, unknown>

export function iconId(icon: IconReference) {
  return `${icon.type}:${icon.name}`
}

export function isIconType(value: unknown): value is IconType {
  return ICON_TYPES.some((type) => type === value)
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

export function normalizeColor(value: unknown) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)
    ? value.toLowerCase()
    : DEFAULT_ICON_COLOR
}

export function normalizeKeywords(value: unknown): IconKeywords {
  if (!Array.isArray(value)) {
    return []
  }

  return uniqueValues(
    value.filter((keyword): keyword is string => typeof keyword === "string")
  )
}

function normalizeReference(value: unknown): IconReference | null {
  if (!isRecord(value)) {
    return null
  }
  if (!isIconType(value.type)) {
    throw new Error("unsupported-type")
  }

  const name = typeof value.name === "string" ? value.name.trim() : ""
  return name ? { type: value.type, name } : null
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
  groupIds: Set<string>
): SavedIcon | null {
  const reference = normalizeReference(value)
  if (!reference || !isRecord(value)) {
    return null
  }

  const groupId = typeof value.groupId === "string" ? value.groupId.trim() : ""
  if (!groupId || !groupIds.has(groupId)) {
    return null
  }

  return {
    ...reference,
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
  groupIds: Set<string>
): DiscardedIcon | null {
  const reference = normalizeReference(value)
  if (!reference || !isRecord(value)) {
    return null
  }

  const previousIcon = normalizeSavedIcon(value.previousIcon, groupIds)
  const matchingPreviousIcon =
    previousIcon && iconId(previousIcon) === iconId(reference)
      ? previousIcon
      : undefined

  return {
    ...reference,
    color: matchingPreviousIcon?.color ?? normalizeColor(value.color),
    discardedAt:
      typeof value.discardedAt === "string"
        ? value.discardedAt
        : new Date().toISOString(),
    previousIcon: matchingPreviousIcon,
  }
}

function assertCurrentSchema(payload: StoredData) {
  if (payload.version !== ICON_SORTER_VERSION) {
    throw new Error("invalid-data")
  }

  const iconTypes = payload.iconTypes
  if (
    !Array.isArray(iconTypes) ||
    iconTypes.length !== ICON_TYPES.length ||
    !ICON_TYPES.every((type) => iconTypes.includes(type))
  ) {
    throw new Error("unsupported-type")
  }
}

export function createEmptyData(): IconSorterData {
  return {
    version: ICON_SORTER_VERSION,
    iconTypes: [...ICON_TYPES],
    groups: [],
    icons: [],
    discardedIcons: [],
    reviewedIcons: [],
  }
}

export function createExportPayload(data: IconSorterData): ExportedIcon[] {
  const groupNames = new Map(
    data.groups.map((group) => [group.id, group.name] as const)
  )

  return data.icons.flatMap((icon) => {
    const group = groupNames.get(icon.groupId)
    if (!group) {
      return []
    }

    return [
      {
        type: icon.type,
        name: icon.name,
        group,
        keywords: icon.keywords,
      },
    ]
  })
}

export function normalizeData(payload: unknown): IconSorterData {
  if (!isRecord(payload)) {
    throw new Error("invalid-data")
  }

  assertCurrentSchema(payload)

  const groups = normalizeGroups(payload.groups)
  const groupIds = new Set(groups.map((group) => group.id))

  const iconsById = new Map<string, SavedIcon>()
  if (Array.isArray(payload.icons)) {
    for (const candidate of payload.icons) {
      const icon = normalizeSavedIcon(candidate, groupIds)
      if (icon) {
        iconsById.set(iconId(icon), icon)
      }
    }
  }

  const discardedById = new Map<string, DiscardedIcon>()
  if (Array.isArray(payload.discardedIcons)) {
    for (const candidate of payload.discardedIcons) {
      const icon = normalizeDiscardedIcon(candidate, groupIds)
      if (icon) {
        discardedById.set(iconId(icon), icon)
      }
    }
  }

  for (const discardedId of discardedById.keys()) {
    iconsById.delete(discardedId)
  }

  const reviewedById = new Map<string, IconReference>()
  if (Array.isArray(payload.reviewedIcons)) {
    for (const candidate of payload.reviewedIcons) {
      const reference = normalizeReference(candidate)
      if (reference) {
        reviewedById.set(iconId(reference), reference)
      }
    }
  }
  for (const icon of [...iconsById.values(), ...discardedById.values()]) {
    reviewedById.set(iconId(icon), { type: icon.type, name: icon.name })
  }

  return {
    version: ICON_SORTER_VERSION,
    iconTypes: [...ICON_TYPES],
    groups,
    icons: [...iconsById.values()],
    discardedIcons: [...discardedById.values()],
    reviewedIcons: [...reviewedById.values()],
  }
}
