import {
  iconId,
  normalizeKeywords,
  type IconGroup,
  type IconReference,
  type SavedIcon,
} from "@/lib/icon-sorter-data"

export const AI_KEYWORD_BATCH_SIZE = 8
export const AI_KEYWORD_REQUEST_TIMEOUT_MS = 180_000
export const AI_KEYWORD_PROMPT_TIMEOUT_MS = 45_000
export const AI_KEYWORD_TRANSLATION_TIMEOUT_MS = 45_000
export const AI_KEYWORD_LIVE_UPDATE_CHUNK_SIZE = 16
export const AI_KEYWORD_TRANSLATION_BLOCK_SIZE = 24
export const AI_KEYWORD_MIN_COUNT = 3
export const AI_KEYWORD_MAX_COUNT = 8
export const AI_KEYWORD_DEFAULT_COUNT = 4
export const AI_KEYWORD_CANDIDATE_BUFFER = 3

export type KeywordGenerationScope = "missing" | "all"

export type KeywordLanguageDefinition = {
  code: string
  label: string
  nativeLabel: string
}

export type KeywordLanguageSetting = {
  code: string
  enabled: boolean
  count: number
}

export const AI_KEYWORD_LANGUAGES: readonly KeywordLanguageDefinition[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "hu", label: "Hungarian", nativeLabel: "Magyar" },
  { code: "ro", label: "Romanian", nativeLabel: "Română" },
  { code: "de", label: "German", nativeLabel: "Deutsch" },
]

export const DEFAULT_AI_KEYWORD_LANGUAGE_SETTINGS: KeywordLanguageSetting[] =
  AI_KEYWORD_LANGUAGES.map((language) => ({
    code: language.code,
    enabled: true,
    count: AI_KEYWORD_DEFAULT_COUNT,
  }))

export type AiKeywordTarget = IconReference & {
  groupId: string
  existingKeywords: string[]
}

export type AiKeywordSeedResult = IconReference & {
  englishKeywords: string[]
}

export type AiKeywordResult = IconReference & {
  keywords: string[]
}

const KEYWORD_STOP_WORDS = new Set(["and", "icon", "the"])

export function clampKeywordCount(value: number) {
  if (!Number.isFinite(value)) {
    return AI_KEYWORD_DEFAULT_COUNT
  }

  return Math.min(
    Math.max(Math.round(value), AI_KEYWORD_MIN_COUNT),
    AI_KEYWORD_MAX_COUNT
  )
}

export function selectedKeywordLanguages(
  settings: readonly KeywordLanguageSetting[]
) {
  return settings
    .filter((setting) => setting.enabled)
    .map((setting) => ({
      ...setting,
      count: clampKeywordCount(setting.count),
    }))
}

export function getAiKeywordCandidateCount(
  settings: readonly KeywordLanguageSetting[]
) {
  const selected = selectedKeywordLanguages(settings)
  const largestTarget = Math.max(
    AI_KEYWORD_MIN_COUNT,
    ...selected.map((setting) => setting.count)
  )

  return largestTarget + AI_KEYWORD_CANDIDATE_BUFFER
}

export function createAiKeywordTargets(
  icons: readonly SavedIcon[],
  scope: KeywordGenerationScope
): AiKeywordTarget[] {
  return icons
    .filter((icon) => scope === "all" || icon.keywords.length === 0)
    .map(({ type, name, groupId, keywords }) => ({
      type,
      name,
      groupId,
      existingKeywords: [...keywords],
    }))
}

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

export function normalizeGeneratedKeyword(value: unknown) {
  if (typeof value !== "string") {
    return ""
  }

  const keyword = value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (
    keyword.length < 2 ||
    /^\d+$/u.test(keyword) ||
    KEYWORD_STOP_WORDS.has(keyword)
  ) {
    return ""
  }

  return keyword
}

export function normalizeGeneratedKeywords(
  values: readonly unknown[],
  limit = Number.POSITIVE_INFINITY
) {
  const normalized = values
    .map(normalizeGeneratedKeyword)
    .filter(Boolean)

  return normalizeKeywords(normalized).slice(0, limit)
}

export function createAiKeywordSystemPrompt(candidateCount: number) {
  return [
    "Generate concise English search keywords for icon names.",
    `Return exactly ${candidateCount} lowercase English keyword strings for every input item, in the same order.`,
    "Each item must be an array of individual words or short search phrases.",
    "Describe the icon object, action, state, and common English synonyms.",
    "Use the supplied group only as semantic context.",
    "Do not return translations, icon names, numbering, confidence values, or explanations.",
  ].join("\n")
}

export function createAiKeywordPrompt(
  icons: readonly AiKeywordTarget[],
  groups: readonly IconGroup[]
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

export function createAiKeywordResponseSchema(
  icons: readonly IconReference[],
  candidateCount: number
) {
  return {
    type: "array",
    items: {
      type: "array",
      minItems: candidateCount,
      maxItems: candidateCount,
      items: {
        type: "string",
        minLength: 2,
        maxLength: 48,
      },
    },
    minItems: icons.length,
    maxItems: icons.length,
  } as const
}

export function parseAiKeywordResponse(
  response: string,
  icons: readonly IconReference[],
  candidateCount: number
) {
  const parsed: unknown = JSON.parse(response)
  if (!Array.isArray(parsed)) {
    throw new Error("invalid-ai-keyword-response")
  }

  const results: AiKeywordSeedResult[] = []
  const completedIds = new Set<string>()

  for (let index = 0; index < icons.length; index += 1) {
    const icon = icons[index]
    const candidate = parsed[index]
    if (!icon || !Array.isArray(candidate)) {
      continue
    }

    const englishKeywords = normalizeGeneratedKeywords(
      candidate,
      candidateCount
    )
    if (englishKeywords.length < AI_KEYWORD_MIN_COUNT) {
      continue
    }

    results.push({
      type: icon.type,
      name: icon.name,
      englishKeywords,
    })
    completedIds.add(iconId(icon))
  }

  return {
    results,
    missingIcons: icons.filter((icon) => !completedIds.has(iconId(icon))),
  }
}

export function createLocalizedKeywordResult(
  target: AiKeywordTarget,
  englishCandidates: readonly string[],
  translatedCandidates: Readonly<Record<string, readonly string[]>>,
  settings: readonly KeywordLanguageSetting[]
): AiKeywordResult | null {
  const generated: string[] = []

  for (const setting of selectedKeywordLanguages(settings)) {
    const candidates =
      setting.code === "en"
        ? englishCandidates
        : translatedCandidates[setting.code] ?? []
    const keywords = normalizeGeneratedKeywords(candidates, setting.count)

    if (keywords.length < setting.count) {
      return null
    }

    generated.push(...keywords)
  }

  return {
    type: target.type,
    name: target.name,
    keywords: normalizeKeywords([...target.existingKeywords, ...generated]),
  }
}
