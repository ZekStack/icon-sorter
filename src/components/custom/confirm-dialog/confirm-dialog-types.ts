import type * as React from "react"

export const ConfirmSuccess = "success" as const
export const ConfirmWarning = "warning" as const
export const ConfirmError = "error" as const

export type ConfirmType =
  | typeof ConfirmSuccess
  | typeof ConfirmWarning
  | typeof ConfirmError

export type ConfirmOptions = {
  label: React.ReactNode
  description?: React.ReactNode
  type?: ConfirmType
  media?: React.ReactNode
  confirmLabel?: React.ReactNode
  cancelLabel?: React.ReactNode
  dismissible?: boolean
}

export type ConfirmRequest = ConfirmOptions & {
  id: number
  resolve: (value: boolean) => void
}
