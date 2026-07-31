import { describe, expect, it } from "vitest"

import {
  classifyIconsByRules,
  createAiGroupingPrompt,
  createAiGroupingResponseSchema,
  normalizeIconLabel,
  parseAiGroupingResponse,
} from "@/features/ai-grouping/ai-grouping"
import type { IconGroup, IconReference } from "@/lib/icon-sorter-data"

const groups: IconGroup[] = [
  {
    id: "navigation",
    name: "Navigation",
    createdAt: "2026-07-31T00:00:00.000Z",
  },
  {
    id: "security",
    name: "Security & Access",
    createdAt: "2026-07-31T00:00:00.000Z",
  },
  {
    id: "home",
    name: "Home & Rooms",
    createdAt: "2026-07-31T00:00:00.000Z",
  },
]

const icons: IconReference[] = [
  { type: "HugeIcon", name: "DoorLock02Icon" },
  { type: "HugeIcon", name: "ArrowDownIcon" },
]

describe("AI grouping", () => {
  it("normalizes Hugeicon and HsH names", () => {
    expect(normalizeIconLabel("DoorLock02Icon")).toBe("door lock 02")
    expect(normalizeIconLabel("garage-door")).toBe("garage door")
  })

  it("groups obvious icon names without invoking AI", () => {
    const result = classifyIconsByRules(icons, groups)

    expect(result.classifications).toEqual([
      {
        type: "HugeIcon",
        name: "DoorLock02Icon",
        groupId: "security",
        source: "rule",
      },
      {
        type: "HugeIcon",
        name: "ArrowDownIcon",
        groupId: "navigation",
        source: "rule",
      },
    ])
    expect(result.unresolvedIcons).toEqual([])
  })

  it("leaves tied or custom-taxonomy matches for AI", () => {
    const ambiguous: IconReference = {
      type: "HugeIcon",
      name: "HomeMenuIcon",
    }
    const customGroups: IconGroup[] = [
      {
        id: "custom",
        name: "My custom category",
        createdAt: "2026-07-31T00:00:00.000Z",
      },
    ]

    expect(classifyIconsByRules([ambiguous], groups).unresolvedIcons).toEqual([
      ambiguous,
    ])
    expect(
      classifyIconsByRules(icons, customGroups).unresolvedIcons
    ).toEqual(icons)
  })

  it("uses compact positional prompts and integer-array responses", () => {
    expect(JSON.parse(createAiGroupingPrompt(icons))).toEqual([
      "door lock 02",
      "arrow down",
    ])

    const schema = createAiGroupingResponseSchema(icons, groups)
    expect(schema).toMatchObject({
      type: "array",
      minItems: 2,
      maxItems: 2,
      items: {
        type: "integer",
        minimum: 0,
        maximum: 2,
      },
    })
  })

  it("maps positional group indexes and reports invalid results", () => {
    const result = parseAiGroupingResponse(
      JSON.stringify([1, 99]),
      icons,
      groups
    )

    expect(result.classifications).toEqual([
      {
        type: "HugeIcon",
        name: "DoorLock02Icon",
        groupId: "security",
        source: "ai",
      },
    ])
    expect(result.missingIcons).toEqual([icons[1]])
  })
})
