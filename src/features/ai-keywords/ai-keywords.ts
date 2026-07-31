import {
  iconId,
  normalizeKeywords,
  type IconGroup,
  type IconReference,
} from "@/lib/icon-sorter-data"

export const AI_KEYWORD_BATCH_SIZE = 64
export const AI_KEYWORD_MIN_BATCH_SIZE = 8

export type AiKeywordTarget = IconReference & {
  groupId: string
}

export type AiKeywordResult = IconReference & {
  keywords: string[]
}

const KEYWORD_STOP_WORDS = new Set(["and", "icon"])

export function normalizeIconLabel(name: string) {
  return name
    .replace(/Icon$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Za-z])(\d+)/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

function normalizeEnglishKeywords(value: unknown) {
  if (typeof value !== "string") {
    return []
  }

  return normalizeKeywords(
    value
      .toLowerCase()
      .split(/[\s,;]+/)
      .map((keyword) => keyword.replace(/[^a-z0-9-]/g, ""))
      .filter(
        (keyword) =>
          keyword.length > 1 &&
          !/^\d+$/.test(keyword) &&
          !KEYWORD_STOP_WORDS.has(keyword)
      )
  ).slice(0, 8)
}

export function createAiKeywordSystemPrompt() {
  return [
    "Generate concise English search keywords for icon names.",
    "Return exactly one space-separated lowercase keyword string for every input item, in the same order.",
    "Use 3 to 8 useful keywords describing the icon object, action, state, and common English synonyms.",
    "Use the supplied group only as semantic context.",
    "Do not return translations, icon names, objects, numbering, confidence values, or explanations.",
  ].join("\n")
}

export function createAiKeywordPrompt(
  icons: AiKeywordTarget[],
  groups: IconGroup[]
) {
  const groupNames = new Map(
    groups.map((group) => [group.id, group.name] as const)
  )

  return JSON.stringify(
    icons.map((icon) => ({
      icon: normalizeIconLabel(icon.name),
      group: groupNames.get(icon.groupId) ?? "Miscellaneous",
    }))
  )
}

export function createAiKeywordResponseSchema(icons: IconReference[]) {
  return {
    type: "array",
    items: {
      type: "string",
      minLength: 1,
      maxLength: 128,
    },
    minItems: icons.length,
    maxItems: icons.length,
  } as const
}

export function parseAiKeywordResponse(
  response: string,
  icons: IconReference[]
) {
  const parsed: unknown = JSON.parse(response)
  if (!Array.isArray(parsed)) {
    throw new Error("invalid-ai-keyword-response")
  }

  const results: AiKeywordResult[] = []
  const completedIds = new Set<string>()

  for (let index = 0; index < icons.length; index += 1) {
    const icon = icons[index]
    if (!icon) {
      continue
    }

    const keywords = normalizeEnglishKeywords(parsed[index])
    if (keywords.length === 0) {
      continue
    }

    results.push({
      type: icon.type,
      name: icon.name,
      keywords,
    })
    completedIds.add(iconId(icon))
  }

  return {
    results,
    missingIcons: icons.filter((icon) => !completedIds.has(iconId(icon))),
  }
}
