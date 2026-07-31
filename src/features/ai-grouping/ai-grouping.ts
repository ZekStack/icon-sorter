import {
  iconId,
  type IconGroup,
  type IconReference,
} from "@/lib/icon-sorter-data"

export const AI_GROUPING_BATCH_SIZE = 64
export const AI_GROUPING_MIN_BATCH_SIZE = 8

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

export type AiGroupingSource = "rule" | "ai"

export type AiIconClassification = IconReference & {
  groupId: string
  source: AiGroupingSource
}

type GroupRule = {
  groupName: (typeof DEFAULT_AI_GROUPS)[number]
  terms: readonly string[]
}

const GROUP_RULES: readonly GroupRule[] = [
  {
    groupName: "Navigation",
    terms: [
      "arrow", "chevron", "navigation", "direction", "compass", "route",
      "cursor", "back", "forward", "previous", "next", "expand",
      "collapse", "menu",
    ],
  },
  {
    groupName: "Actions & Editing",
    terms: [
      "add", "remove", "edit", "delete", "trash", "copy", "cut", "paste",
      "undo", "redo", "refresh", "reload", "search", "filter", "sort",
      "save", "check", "close", "plus", "minus", "magic", "wand",
    ],
  },
  {
    groupName: "Status & Feedback",
    terms: [
      "alert", "warning", "error", "info", "question", "help", "loading",
      "success", "failure", "thumbs up", "thumbs down", "notification",
    ],
  },
  {
    groupName: "Files & Data",
    terms: [
      "file", "folder", "document", "database", "archive", "download",
      "upload", "spreadsheet", "table", "data", "cloud save",
    ],
  },
  {
    groupName: "Communication",
    terms: [
      "mail", "email", "message", "chat", "conversation", "phone", "call",
      "send", "paper plane", "inbox", "contact",
    ],
  },
  {
    groupName: "Users & Authentication",
    terms: [
      "user", "users", "account", "profile", "login", "logout", "password",
      "authentication", "fingerprint", "face id", "identity",
    ],
  },
  {
    groupName: "Home & Rooms",
    terms: [
      "home", "house", "room", "bedroom", "bathroom", "kitchen", "garage",
      "terrace", "attic", "cellar", "office", "corridor", "pantry", "couch",
      "sofa", "bed", "armchair", "wc", "wellness",
    ],
  },
  {
    groupName: "Lighting & Electrical",
    terms: [
      "lamp", "light", "lightbulb", "bulb", "led", "socket", "plug",
      "electric", "electricity", "battery", "power", "switch",
    ],
  },
  {
    groupName: "Climate & Heating",
    terms: [
      "thermostat", "temperature", "therm", "heating", "heater", "boiler",
      "radiator", "ventillator", "ventilator", "fan", "air conditioner",
      "climate", "hysteresis",
    ],
  },
  {
    groupName: "Weather",
    terms: [
      "weather", "sun", "moon", "cloud", "rain", "snow", "storm", "wind",
      "thunder", "forecast",
    ],
  },
  {
    groupName: "Security & Access",
    terms: [
      "lock", "unlock", "key", "shield", "security", "door", "gate",
      "access", "alarm", "detect",
    ],
  },
  {
    groupName: "Shading & Windows",
    terms: [
      "curtain", "blind", "shade", "shader", "shutter", "window",
      "roof window",
    ],
  },
  {
    groupName: "Water & Irrigation",
    terms: [
      "water", "droplet", "drop", "pump", "watering", "irrigation",
      "faucet", "shower", "bath",
    ],
  },
  {
    groupName: "Devices & Appliances",
    terms: [
      "device", "controller", "remote", "monitor", "television", "tv",
      "appliance", "refrigerator", "washing machine", "robot", "motor",
    ],
  },
  {
    groupName: "Media",
    terms: [
      "play", "pause", "stop", "music", "audio", "video", "camera", "image",
      "photo", "microphone", "volume", "film", "record",
    ],
  },
  {
    groupName: "Transportation",
    terms: [
      "car", "bike", "bicycle", "bus", "train", "plane", "ship", "vehicle",
      "truck", "motorcycle",
    ],
  },
  {
    groupName: "Nature & Outdoors",
    terms: [
      "flower", "tree", "grass", "bush", "leaf", "garden", "mountain",
      "earth", "plant", "outdoor",
    ],
  },
  {
    groupName: "Development & System",
    terms: [
      "code", "terminal", "bug", "developer", "server", "api", "system",
      "microchip", "chip", "cpu", "factory reset", "wifi", "bluetooth",
      "network",
    ],
  },
  {
    groupName: "Commerce",
    terms: [
      "cart", "shopping", "money", "wallet", "credit", "bank", "dollar",
      "euro", "shop", "store", "receipt", "payment",
    ],
  },
]

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

function scoreRule(label: string, tokens: Set<string>, rule: GroupRule) {
  return rule.terms.reduce((score, term) => {
    if (term.includes(" ")) {
      return score + (label.includes(term) ? 3 : 0)
    }

    return score + (tokens.has(term) ? 1 : 0)
  }, 0)
}

export function classifyIconsByRules(
  icons: IconReference[],
  groups: IconGroup[]
) {
  const groupsByName = new Map(
    groups.map((group) => [group.name.toLowerCase(), group] as const)
  )
  const availableRules = GROUP_RULES.flatMap((rule) => {
    const group = groupsByName.get(rule.groupName.toLowerCase())
    return group ? [{ rule, group }] : []
  })
  const classifications: AiIconClassification[] = []
  const unresolvedIcons: IconReference[] = []

  for (const icon of icons) {
    const label = normalizeIconLabel(icon.name)
    const tokens = new Set(label.split(" ").filter(Boolean))
    const matches = availableRules
      .map(({ rule, group }) => ({
        group,
        score: scoreRule(label, tokens, rule),
      }))
      .filter((match) => match.score > 0)
      .sort((left, right) => right.score - left.score)

    const best = matches[0]
    const runnerUp = matches[1]
    if (!best || (runnerUp && runnerUp.score === best.score)) {
      unresolvedIcons.push(icon)
      continue
    }

    classifications.push({
      type: icon.type,
      name: icon.name,
      groupId: best.group.id,
      source: "rule",
    })
  }

  return { classifications, unresolvedIcons }
}

export function createAiGroupingSystemPrompt(groups: IconGroup[]) {
  const taxonomy = groups
    .map((group, index) => `${index}: ${group.name}`)
    .join("\n")

  return [
    "Classify icon names into the indexed taxonomy.",
    "Return exactly one integer group index for every input item, in the same order.",
    "Do not return icon names, keywords, confidence values, objects, or explanations.",
    "Numbered visual variants normally use the same group.",
    "Taxonomy:",
    taxonomy,
  ].join("\n")
}

export function createAiGroupingPrompt(icons: IconReference[]) {
  return JSON.stringify(icons.map((icon) => normalizeIconLabel(icon.name)))
}

export function createAiGroupingResponseSchema(
  icons: IconReference[],
  groups: IconGroup[]
) {
  return {
    type: "array",
    items: {
      type: "integer",
      minimum: 0,
      maximum: Math.max(groups.length - 1, 0),
    },
    minItems: icons.length,
    maxItems: icons.length,
  } as const
}

export function parseAiGroupingResponse(
  response: string,
  icons: IconReference[],
  groups: IconGroup[]
) {
  const parsed: unknown = JSON.parse(response)
  if (!Array.isArray(parsed)) {
    throw new Error("invalid-ai-response")
  }

  const classifications: AiIconClassification[] = []
  const classifiedIds = new Set<string>()

  for (let index = 0; index < icons.length; index += 1) {
    const groupIndex = parsed[index]
    const icon = icons[index]
    if (
      !icon ||
      typeof groupIndex !== "number" ||
      !Number.isInteger(groupIndex) ||
      !groups[groupIndex]
    ) {
      continue
    }

    classifications.push({
      type: icon.type,
      name: icon.name,
      groupId: groups[groupIndex].id,
      source: "ai",
    })
    classifiedIds.add(iconId(icon))
  }

  return {
    classifications,
    missingIcons: icons.filter((icon) => !classifiedIds.has(iconId(icon))),
  }
}
