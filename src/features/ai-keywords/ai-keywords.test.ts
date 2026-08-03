import { describe, expect, it } from "vitest"

import {
  AI_KEYWORD_BATCH_SIZE,
  createAiKeywordPrompt,
  createAiKeywordResponseSchema,
  parseAiKeywordResponse,
} from "@/features/ai-keywords/ai-keywords"
import { runBatchQueue } from "@/features/ai-grouping/ai-grouping-runtime"
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

  it("processes more than 128 keyword targets in bounded batches", async () => {
    const targets = Array.from({ length: 160 }, (_, index) => index)
    const processed: number[] = []
    const batchSizes: number[] = []

    const result = await runBatchQueue({
      items: targets,
      startIndex: 0,
      batchSize: AI_KEYWORD_BATCH_SIZE,
      signal: new AbortController().signal,
      timeoutMs: 1_000,
      shouldPause: () => false,
      processBatch: async (batch) => {
        batchSizes.push(batch.length)
        return [...batch]
      },
      onBatchResult: (batch) => {
        processed.push(...batch)
      },
      onBatchError: () => {
        throw new Error("unexpected keyword batch failure")
      },
      yieldControl: async () => undefined,
    })

    expect(result).toEqual({ cursor: 160, paused: false })
    expect(processed).toEqual(targets)
    expect(batchSizes).toEqual(Array.from({ length: 10 }, () => 16))
  })
})
