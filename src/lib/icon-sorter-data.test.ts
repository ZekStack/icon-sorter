import { describe, expect, it } from "vitest"

import {
  createExportPayload,
  ICON_SORTER_VERSION,
  ICON_TYPES,
  iconId,
  normalizeData,
} from "@/lib/icon-sorter-data"

const group = {
  id: "interior",
  name: "Interior",
  createdAt: "2026-07-29T00:00:00.000Z",
}

function currentPayload(): Record<string, unknown> {
  return {
    version: ICON_SORTER_VERSION,
    iconTypes: [...ICON_TYPES],
    groups: [group],
    icons: [],
    discardedIcons: [],
    reviewedIcons: [],
  }
}

describe("icon sorter data", () => {
  it("keeps same-named icons from different catalogs distinct", () => {
    const payload = currentPayload()
    payload.icons = [
      {
        type: "HugeIcon",
        name: "home",
        groupId: group.id,
        keywords: [],
        color: "#ffffff",
        savedAt: "2026-07-29T00:00:00.000Z",
      },
      {
        type: "HsHIcon",
        name: "home",
        groupId: group.id,
        keywords: [],
        color: "#000000",
        savedAt: "2026-07-29T00:00:00.000Z",
      },
    ]

    const normalized = normalizeData(payload)

    expect(normalized.icons.map(iconId)).toEqual([
      "HugeIcon:home",
      "HsHIcon:home",
    ])
    expect(normalized.reviewedIcons.map(iconId)).toEqual([
      "HugeIcon:home",
      "HsHIcon:home",
    ])
  })

  it("rejects older schemas instead of migrating them", () => {
    expect(() =>
      normalizeData({ ...currentPayload(), version: 3 })
    ).toThrowError("invalid-data")
  })

  it("rejects incomplete or unknown icon types", () => {
    expect(() =>
      normalizeData({ ...currentPayload(), iconTypes: ["HugeIcon"] })
    ).toThrowError("unsupported-type")

    expect(() =>
      normalizeData({
        ...currentPayload(),
        reviewedIcons: [{ type: "OtherIcon", name: "home" }],
      })
    ).toThrowError("unsupported-type")
  })

  it("lets a discarded icon replace only its matching saved identity", () => {
    const payload = currentPayload()
    payload.icons = [
      {
        type: "HugeIcon",
        name: "home",
        groupId: group.id,
        keywords: [],
        color: "#ffffff",
        savedAt: "2026-07-29T00:00:00.000Z",
      },
      {
        type: "HsHIcon",
        name: "home",
        groupId: group.id,
        keywords: [],
        color: "#000000",
        savedAt: "2026-07-29T00:00:00.000Z",
      },
    ]
    payload.discardedIcons = [
      {
        type: "HsHIcon",
        name: "home",
        color: "#000000",
        discardedAt: "2026-07-29T00:00:00.000Z",
      },
    ]

    const normalized = normalizeData(payload)

    expect(normalized.icons.map(iconId)).toEqual(["HugeIcon:home"])
    expect(normalized.discardedIcons.map(iconId)).toEqual(["HsHIcon:home"])
  })

  it("exports only consumer-facing icon metadata with group names", () => {
    const payload = currentPayload()
    payload.icons = [
      {
        type: "HsHIcon",
        name: "home",
        groupId: group.id,
        keywords: ["house", "building"],
        color: "#ff0000",
        savedAt: "2026-07-29T00:00:00.000Z",
      },
    ]

    expect(createExportPayload(normalizeData(payload))).toEqual([
      {
        type: "HsHIcon",
        name: "home",
        group: "Interior",
        keywords: ["house", "building"],
      },
    ])
  })
})
