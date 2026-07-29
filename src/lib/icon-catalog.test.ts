import { describe, expect, it } from "vitest"

import {
  hshIconCatalog,
  hugeIconCatalog,
  iconCatalog,
  iconCatalogById,
} from "@/lib/icon-catalog"
import { iconId } from "@/lib/icon-sorter-data"

describe("icon catalog", () => {
  it("combines the complete typed catalogs", () => {
    expect(hshIconCatalog).toHaveLength(162)
    expect(hshIconCatalog.every((icon) => icon.type === "HsHIcon")).toBe(true)
    expect(hugeIconCatalog.length).toBeGreaterThan(6_000)
    expect(hugeIconCatalog.every((icon) => icon.type === "HugeIcon")).toBe(true)
    expect(iconCatalog).toHaveLength(
      hshIconCatalog.length + hugeIconCatalog.length
    )
  })

  it("indexes icons by composite type and name", () => {
    const hshHome = { type: "HsHIcon", name: "home" } as const
    const hugeHome = { type: "HugeIcon", name: "HomeIcon" } as const

    expect(iconCatalogById.get(iconId(hshHome))).toMatchObject(hshHome)
    expect(iconCatalogById.get(iconId(hugeHome))).toMatchObject(hugeHome)
  })
})
