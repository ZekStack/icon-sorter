import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

export function Badge({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full border border-border bg-muted px-2 text-xs font-medium text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}
