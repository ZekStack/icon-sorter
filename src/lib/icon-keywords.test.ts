import { describe, expect, it } from "vitest"

import { formatKeywordText, parseKeywordText } from "@/lib/icon-keywords"

describe("icon keywords", () => {
  it("splits words on spaces, tabs, and new lines", () => {
    expect(parseKeywordText("door entrance\nbejárat\tTür")).toEqual([
      "door",
      "entrance",
      "bejárat",
      "Tür",
    ])
  })

  it("deduplicates words and formats one keyword per line", () => {
    const keywords = parseKeywordText("door  door\nentrance")

    expect(keywords).toEqual(["door", "entrance"])
    expect(formatKeywordText(keywords)).toBe("door\nentrance")
  })
})
