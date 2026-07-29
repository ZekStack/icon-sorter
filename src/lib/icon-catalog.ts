import type { ComponentProps } from "react"
import * as freeIcons from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { hshIconNames } from "@/lib/hsh-icon-names.generated"
import {
  iconId,
  type IconReference,
  type IconType,
} from "@/lib/icon-sorter-data"

export type HugeIconData = ComponentProps<typeof HugeiconsIcon>["icon"]

export type HugeIconCatalogItem = IconReference & {
  type: "HugeIcon"
  icon: HugeIconData
}

export type HsHIconCatalogItem = IconReference & {
  type: "HsHIcon"
}

export type IconCatalogItem = HugeIconCatalogItem | HsHIconCatalogItem
export type IconTypeFilter = IconType | "all"

function isHugeIconData(value: unknown): value is HugeIconData {
  return Array.isArray(value)
}

export const hugeIconCatalog: HugeIconCatalogItem[] = Object.entries(freeIcons)
  .filter(
    (entry): entry is [string, HugeIconData] =>
      entry[0].endsWith("Icon") && isHugeIconData(entry[1])
  )
  .map(([name, icon]) => ({ type: "HugeIcon" as const, name, icon }))
  .sort((left, right) => left.name.localeCompare(right.name))

export const hshIconCatalog: HsHIconCatalogItem[] = hshIconNames.map(
  (name) => ({
    type: "HsHIcon",
    name,
  })
)

export const iconCatalog: IconCatalogItem[] = [
  ...hshIconCatalog,
  ...hugeIconCatalog,
]

export const iconCatalogById = new Map(
  iconCatalog.map((item) => [iconId(item), item] as const)
)
