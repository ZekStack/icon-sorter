import { normalizeKeywords, type IconKeywords } from "@/lib/icon-sorter-data"

export function parseKeywordText(value: string): IconKeywords {
  return normalizeKeywords(value.split(/\s+/u))
}

export function formatKeywordText(keywords: IconKeywords) {
  return keywords.join("\n")
}
