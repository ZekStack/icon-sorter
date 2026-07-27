import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import {
  ConfirmError,
  ConfirmSuccess,
  ConfirmWarning,
  type ConfirmRequest,
  type ConfirmType,
} from "./confirm-dialog-types"

type ConfirmDialogProps = {
  open: boolean
  request: ConfirmRequest | null
  onOpenChange: (open: boolean) => void
  onSettle: (value: boolean) => void
}

const typeStyles: Record<ConfirmType, { media: string; panel: string }> = {
  [ConfirmSuccess]: {
    media: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    panel: "border-emerald-500/20",
  },
  [ConfirmWarning]: {
    media: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    panel: "border-amber-500/20",
  },
  [ConfirmError]: {
    media: "bg-destructive/10 text-destructive",
    panel: "border-destructive/25",
  },
}

export function ConfirmDialog({
  open,
  request,
  onOpenChange,
  onSettle,
}: ConfirmDialogProps) {
  const type = request?.type ?? ConfirmWarning
  const styles = typeStyles[type]

  useEffect(() => {
    if (!open || !request?.dismissible) {
      return undefined
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onOpenChange, open, request?.dismissible])

  if (!open || !request) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-black/45 sm:place-items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && request.dismissible) {
          onOpenChange(false)
        }
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`confirm-title-${request.id}`}
        aria-describedby={
          request.description ? `confirm-description-${request.id}` : undefined
        }
        className={cn(
          "grid w-full gap-5 rounded-t-2xl border bg-background p-5 shadow-2xl sm:max-w-md sm:rounded-2xl",
          styles.panel
        )}
      >
        <div className="flex items-start gap-4">
          {request.media ? (
            <div
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-full",
                styles.media
              )}
            >
              {request.media}
            </div>
          ) : null}

          <div className="min-w-0 space-y-2">
            <div id={`confirm-title-${request.id}`} className="font-semibold">
              {request.label}
            </div>
            {request.description ? (
              <div
                id={`confirm-description-${request.id}`}
                className="text-sm leading-relaxed text-muted-foreground"
              >
                {request.description}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onSettle(false)}>
            {request.cancelLabel ?? "Cancel"}
          </Button>
          <Button
            type="button"
            variant={type === ConfirmError ? "destructive" : "default"}
            onClick={() => onSettle(true)}
          >
            {request.confirmLabel ?? "Confirm"}
          </Button>
        </div>
      </div>
    </div>
  )
}
