import { describe, expect, it } from "vitest"

import {
  AI_KEYWORD_BATCH_SIZE,
  DEFAULT_AI_KEYWORD_LANGUAGE_SETTINGS,
  createAiKeywordPrompt,
  createAiKeywordResponseSchema,
  createAiKeywordTargets,
  createLocalizedKeywordResult,
  getAiKeywordCandidateCount,
  parseAiKeywordResponse,
} from "@/features/ai-keywords/ai-keywords"
import { runBatchQueue } from "@/features/ai-grouping/ai-grouping-runtime"
import type { IconGroup, SavedIcon } from "@/lib/icon-sorter-data"

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
    existingKeywords: [],
  },
  {
    type: "HsHIcon" as const,
    name: "gate-open",
    groupId: "security",
    existingKeywords: [],
  },
]

describe("AI keywords", () => {
  it("uses icon names and group context in compact prompts", () => {
    expect(JSON.parse(createAiKeywordPrompt(icons, groups))).toEqual([
      { icon: "door lock 02", group: "Security & Access" },
      { icon: "gate open", group: "Security & Access" },
    ])
  })

  it("requires multiple keyword strings for every icon", () => {
    expect(createAiKeywordResponseSchema(icons, 7)).toMatchObject({
      type: "array",
      minItems: 2,
      maxItems: 2,
      items: {
        type: "array",
        minItems: 7,
        maxItems: 7,
        items: {
          type: "string",
          minLength: 2,
          maxLength: 48,
        },
      },
    })
  })

  it("normalizes structured English candidates and reports unusable results", () => {
    const result = parseAiKeywordResponse(
      JSON.stringify([
        [
          "Door",
          "lock",
          "security",
          "ACCESS",
          "entrance",
          "door",
          "entry control",
        ],
        ["123", "!", "icon"],
      ]),
      icons,
      7
    )

    expect(result.results).toEqual([
      {
        type: "HugeIcon",
        name: "DoorLock02Icon",
        englishKeywords: [
          "door",
          "lock",
          "security",
          "access",
          "entrance",
          "entry control",
        ],
      },
    ])
    expect(result.missingIcons).toEqual([icons[1]])
  })

  it("uses the largest selected language target plus candidate buffer", () => {
    const settings = DEFAULT_AI_KEYWORD_LANGUAGE_SETTINGS.map((setting) => ({
      ...setting,
      count: setting.code === "ro" ? 7 : 4,
    }))

    expect(getAiKeywordCandidateCount(settings)).toBe(10)
  })

  it("flattens selected languages and preserves existing keywords", () => {
    const settings = DEFAULT_AI_KEYWORD_LANGUAGE_SETTINGS.map((setting) => ({
      ...setting,
      enabled: setting.code !== "de",
      count: 3,
    }))
    const result = createLocalizedKeywordResult(
      { ...icons[0], existingKeywords: ["manual", "door"] },
      ["door", "lock", "security", "entrance"],
      {
        hu: ["ajtó", "zár", "biztonság", "bejárat"],
        ro: ["ușă", "încuietoare", "securitate", "intrare"],
      },
      settings
    )

    expect(result).toEqual({
      type: "HugeIcon",
      name: "DoorLock02Icon",
      keywords: [
        "manual",
        "door",
        "lock",
        "security",
        "ajtó",
        "zár",
        "biztonság",
        "ușă",
        "încuietoare",
        "securitate",
      ],
    })
  })

  it("requires the configured count for every selected language", () => {
    const settings = DEFAULT_AI_KEYWORD_LANGUAGE_SETTINGS.map((setting) => ({
      ...setting,
      enabled: setting.code === "en" || setting.code === "hu",
      count: 4,
    }))

    expect(
      createLocalizedKeywordResult(
        icons[0],
        ["door", "lock", "security", "entrance"],
        { hu: ["ajtó", "zár", "biztonság"] },
        settings
      )
    ).toBeNull()
  })

  it("supports missing-only and enrich-all targets from an existing save", () => {
    const savedIcons: SavedIcon[] = [
      {
        type: "HugeIcon",
        name: "DoorLock02Icon",
        groupId: "security",
        keywords: [],
        color: "#a1a1aa",
        savedAt: "2026-08-04T00:00:00.000Z",
      },
      {
        type: "HsHIcon",
        name: "gate-open",
        groupId: "security",
        keywords: ["gate"],
        color: "#a1a1aa",
        savedAt: "2026-08-04T00:00:00.000Z",
      },
    ]

    expect(createAiKeywordTargets(savedIcons, "missing")).toHaveLength(1)
    expect(createAiKeywordTargets(savedIcons, "all")).toEqual([
      { ...icons[0], existingKeywords: [] },
      { ...icons[1], existingKeywords: ["gate"] },
    ])
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
    expect(batchSizes).toEqual(Array.from({ length: 20 }, () => 8))
  })
})
