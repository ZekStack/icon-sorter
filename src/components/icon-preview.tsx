import { HugeiconsIcon } from "@hugeicons/react"

import { iconCatalogById } from "@/lib/icon-catalog"
import { iconId, type IconReference } from "@/lib/icon-sorter-data"

type IconPreviewProps = {
  icon: IconReference
  size: number
  color: string
}

export function IconPreview({ icon, size, color }: IconPreviewProps) {
  const catalogItem = iconCatalogById.get(iconId(icon))
  if (!catalogItem) {
    return <span className="text-xs text-muted-foreground">?</span>
  }

  if (catalogItem.type === "HsHIcon") {
    return (
      <span
        aria-hidden="true"
        className="inline-flex items-center justify-center leading-none"
        style={{ color, fontSize: size }}
      >
        <i className={`ico-hsh-${catalogItem.name}`} />
      </span>
    )
  }

  return (
    <HugeiconsIcon
      icon={catalogItem.icon}
      size={size}
      strokeWidth={1.4}
      color={color}
      aria-hidden="true"
    />
  )
}
