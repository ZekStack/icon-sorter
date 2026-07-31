import { AiGroupingPanel } from "@/features/ai-grouping/ai-grouping-panel"
import { AiKeywordsPanel } from "@/features/ai-keywords/ai-keywords-panel"

export function AiGroupingPage() {
  return (
    <div className="grid gap-4">
      <AiGroupingPanel />
      <AiKeywordsPanel />
    </div>
  )
}
