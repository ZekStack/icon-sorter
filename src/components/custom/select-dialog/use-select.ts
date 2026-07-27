import { useContext } from "react"

import { SelectDialogContext } from "./select-dialog-context"

export function useSelect() {
  const context = useContext(SelectDialogContext)

  if (!context) {
    throw new Error("useSelect must be used inside SelectDialogProvider")
  }

  return context
}
