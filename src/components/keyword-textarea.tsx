import { useId } from "react"
import { useTranslation } from "react-i18next"

import { Textarea } from "@/components/ui/textarea"

type KeywordTextareaProps = {
  value: string
  onChange: (value: string) => void
}

export function KeywordTextarea({ value, onChange }: KeywordTextareaProps) {
  const { t } = useTranslation()
  const inputId = useId()

  return (
    <div className="grid gap-1.5">
      <label htmlFor={inputId} className="sr-only">
        {t("keywords.label")}
      </label>
      <Textarea
        id={inputId}
        value={value}
        placeholder={t("keywords.placeholder")}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}
