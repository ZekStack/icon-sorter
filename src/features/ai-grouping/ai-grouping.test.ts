import { describe, expect, it } from "vitest"

import {
  createAiGroupingResponseSchema,
  normalizeIconLabel,
  parseAiGroupingResponse,
} from "@/features/ai-grouping/ai-grouping"
import type { IconGroup, IconReference } from "@/lib/icon-sorter-data"

const groups: IconGroup[] = [
  {
    id: "security",
    name: "Security & Access",
    createdAt: "2026-07-31T00:00:00.000Z",
  },
]

const icons: IconReference[] = [
  { type: "HugeIcon", name: "DoorLock02Icon" },
]

describe("AI grouping", () => {
  it("normalizes Hugeicon and HsH names for the model", () => {
    expect(normalizeIconLabel("DoorLock02Icon")).toBe("door lock 02")
    expect(normalizeIconLabel("garage-door")).toBe("garage door")
  })

  it("constrains ids and group names in the response schema", () => {
    const schema = createAiGroupingResponseSchema(icons, groups)
    const item = schema.properties.results.items

    expect(item.properties.id.enum).toEqual(["HugeIcon:DoorLock02Icon"])
    expect(item.properties.group.enum).toEqual(["Security & Access"])
  })

  it("parses valid classifications and reports missing icons", () => {
    const secondIcon: IconReference = {
      type: "HsHIcon",
      name: "garage-door",
    }
    const result = parseAiGroupingResponse(
      JSON.stringify({
        results: [
          {
            id: "HugeIcon:DoorLock02Icon",
            group: "Security & Access",
            keywords: ["door", "lock", "ajtó", "door"],
            confidence: "high",
          },
        ],
      }),
      [...icons, secondIcon],
      groups
    )

    expect(result.classifications).toEqual([
      {
        type: "HugeIcon",
        name: "DoorLock02Icon",
        groupId: "security",
        keywords: ["door", "lock", "ajtó"],
        confidence: "high",
      },
    ])
    expect(result.missingIcons).toEqual([secondIcon])
  })
})
