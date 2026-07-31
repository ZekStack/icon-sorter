import {
  iconId,
  normalizeKeywords,
  type IconGroup,
  type IconReference,
} from "@/lib/icon-sorter-data"

export const AI_GROUPING_BATCH_SIZE = 12

export const DEFAULT_AI_GROUPS = [
  "Navigation",
  "Actions & Editing",
  "Status & Feedback",
  "Files & Data",
  "Communication",
  "Users & Authentication",
  "Home & Rooms",
  "Lighting & Electrical",
  "Climate & Heating",
  "Weather",
  "Security & Access",
  "Shading & Windows",
  "Water & Irrigation",
  "Devices & Appliances",
  "Media",
  "Transportation",
  "Nature & Outdoors",
  "Development & System",
  "Commerce",
  "Miscellaneous",
] as const

export type AiGroupingConfidence = "high" | "medium" | "low"

export type AiIconClassification = IconReference & {
  groupId: string
  keywords: string[]
  confidence: AiGroupingConfidence
}

type RawClassification = {
  id?: unknown
  group?: unknown
  keywords?: unknown
  confidence?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
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

export function createAiGroupingSystemPrompt(groups: IconGroup[]) {
  const taxonomy = groups.map((group) => `- ${group.name}`).join("\n")

  return [
    "You classify icon names for a multilingual icon search library.",
    "Use only the exact group names from the approved taxonomy.",
    "Create concise search keywords that describe the icon, its object, action, state, and common synonyms.",
    "Include useful English and Hungarian keywords when the meaning is clear.",
    "Do not invent product behavior that is not implied by the icon name.",
    "Numbered icon variants normally belong to the same group.",
    "Return exactly one result for every supplied icon and copy each id exactly.",
    "Approved taxonomy:",
    taxonomy,
  ].join("\n")
}

export function createAiGroupingPrompt(icons: IconReference[]) {
  return JSON.stringify({
    task: "Classify every icon into one approved group and generate search keywords.",
    icons: icons.map((icon) => ({
      id: iconId(icon),
      label: normalizeIconLabel(icon.name),
    })),
  })
}

export function createAiGroupingResponseSchema(
  icons: IconReference[],
  groups: IconGroup[]
) {
  return {
    type: "object",
    properties: {
      results: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: {
              type: "string",
              enum: icons.map(iconId),
            },
            group: {
              type: "string",
              enum: groups.map((group) => group.name),
            },
            keywords: {
              type: "array",
              items: { type: "string" },
            },
            confidence: {
              type: "string",
              enum: ["high", "medium", "low"],
            },
          },
          required: ["id", "group", "keywords", "confidence"],
          additionalProperties: false,
        },
      },
    },
    required: ["results"],
    additionalProperties: false,
  } as const
}

export function parseAiGroupingResponse(
  response: string,
  icons: IconReference[],
  groups: IconGroup[]
) {
  const parsed: unknown = JSON.parse(response)
  if (!isRecord(parsed) || !Array.isArray(parsed.results)) {
    throw new Error("invalid-ai-response")
  }

  const iconsById = new Map(icons.map((icon) => [iconId(icon), icon] as const))
  const groupsByName = new Map(
    groups.map((group) => [group.name.toLowerCase(), group] as const)
  )
  const classifications = new Map<string, AiIconClassification>()

  for (const candidate of parsed.results) {
    if (!isRecord(candidate)) {
      continue
    }

    const raw = candidate as RawClassification
    if (typeof raw.id !== "string" || typeof raw.group !== "string") {
      continue
    }

    const icon = iconsById.get(raw.id)
    const group = groupsByName.get(raw.group.trim().toLowerCase())
    if (!icon || !group || classifications.has(raw.id)) {
      continue
    }

    const confidence: AiGroupingConfidence =
      raw.confidence === "high" ||
      raw.confidence === "medium" ||
      raw.confidence === "low"
        ? raw.confidence
        : "medium"

    classifications.set(raw.id, {
      type: icon.type,
      name: icon.name,
      groupId: group.id,
      keywords: normalizeKeywords(raw.keywords).slice(0, 12),
      confidence,
    })
  }

  return {
    classifications: [...classifications.values()],
    missingIcons: icons.filter((icon) => !classifications.has(iconId(icon))),
  }
}
