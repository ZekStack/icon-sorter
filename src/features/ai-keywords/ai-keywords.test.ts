import { describe, expect, it } from "vitest"

import {
  createAiKeywordPrompt,
  createAiKeywordResponseSchema,
  parseAiKeywordResponse,
} from "@/features/ai-keywords/ai-keywords"
import type { IconGroup } from "@/lib/icon-sorter-data"

const groups: IconGroup[] = [
  {
    id: "security",
    name: "Security & Access",
    createdAt: "2026-07-31T00:00:00.000Z",
  },
]

const icons = [
  {
    type: "HugeIcon" as const,
    name: "DoorLock02Icon",
    groupId: "security",
  },
  {
    type: "HsHIcon" as const,
    name: "gate-open",
    groupId: "security",
  },
]

describe("AI keywords", () => {
  it("uses icon names and group context in compact prompts", () => {
    expect(JSON.parse(createAiKeywordPrompt(icons, groups))).toEqual([
      { icon: "door lock 02", group: "Security & Access" },
      { icon: "gate open", group: "Security & Access" },
    ])
  })

  it("requires one keyword string for each icon", () => {
    expect(createAiKeywordResponseSchema(icons)).toMatchObject({
      type: "array",
      minItems: 2,
      maxItems: 2,
      items: {
        type: "string",
        minLength: 1,
        maxLength: 128,
      },
    })
  })

  it("normalizes English keywords and reports unusable results", () => {
    const result = parseAiKeywordResponse(
      JSON.stringify([
        "Door lock security ACCESS entrance door",
        "123 ; ;",
      ]),
      icons
    )

    expect(result.results).toEqual([
      {
        type: "HugeIcon",
        name: "DoorLock02Icon",
        keywords: ["door", "lock", "security", "access", "entrance"],
      },
    ])
    expect(result.missingIcons).toEqual([icons[1]])
  })
})
