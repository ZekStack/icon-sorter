import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import type { IconType } from "@/lib/icon-sorter-data"

export function IconTypeBadge({ type }: { type: IconType }) {
  const { t } = useTranslation()

  return <Badge className="bg-transparent">{t(`iconType.${type}`)}</Badge>
}
