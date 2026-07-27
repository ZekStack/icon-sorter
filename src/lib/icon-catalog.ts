import type { ComponentProps } from "react"
import * as freeIcons from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

export type HugeIconData = ComponentProps<typeof HugeiconsIcon>["icon"]

export type IconCatalogItem = {
  name: string
  icon: HugeIconData
}

function isHugeIconData(value: unknown): value is HugeIconData {
  return Array.isArray(value)
}

export const iconCatalog: IconCatalogItem[] = Object.entries(freeIcons)
  .filter(
    (entry): entry is [string, HugeIconData] =>
      entry[0].endsWith("Icon") && isHugeIconData(entry[1])
  )
  .map(([name, icon]) => ({ name, icon }))
  .sort((left, right) => left.name.localeCompare(right.name))

export const iconCatalogByName = new Map(
  iconCatalog.map((item) => [item.name, item] as const)
)
