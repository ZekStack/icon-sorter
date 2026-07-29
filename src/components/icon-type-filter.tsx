import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import type { IconTypeFilter } from "@/lib/icon-catalog"
import { ICON_TYPES } from "@/lib/icon-sorter-data"

type IconTypeFilterProps = {
  value: IconTypeFilter
  onChange: (value: IconTypeFilter) => void
}

export function IconTypeFilterControl({
  value,
  onChange,
}: IconTypeFilterProps) {
  const { t } = useTranslation()
  const options: IconTypeFilter[] = ["all", ...ICON_TYPES]

  return (
    <div
      className="inline-flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1"
      aria-label={t("iconType.filter")}
      role="group"
    >
      {options.map((option) => (
        <Button
          key={option}
          type="button"
          size="sm"
          variant={value === option ? "secondary" : "ghost"}
          aria-pressed={value === option}
          onClick={() => onChange(option)}
        >
          {t(`iconType.${option}`)}
        </Button>
      ))}
    </div>
  )
}
