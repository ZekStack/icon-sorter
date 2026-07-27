import * as React from "react"

import { SelectDialog } from "./select-dialog"
import { SelectDialogContext } from "./select-dialog-context"

import type { SelectDialogContextValue } from "./select-dialog-context"
import type {
  AnyItem,
  ItemsArray,
  SelectDialogRequest,
  SelectDialogValue,
} from "./select-dialog-types"

type ActiveSelectRequest = {
  id: string
  props: SelectDialogRequest<ItemsArray, boolean>
  resolve: (value: SelectDialogValue<AnyItem, boolean> | undefined) => void
}

const SELECT_DIALOG_CLOSE_DELAY_MS = 180

function createRequestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function SelectDialogProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [activeRequest, setActiveRequest] =
    React.useState<ActiveSelectRequest | null>(null)
  const [open, setOpen] = React.useState(false)
  const activeRequestRef = React.useRef<ActiveSelectRequest | null>(null)
  const closeTimeoutRef = React.useRef<number | null>(null)

  const clearCloseTimeout = React.useCallback(() => {
    if (closeTimeoutRef.current === null) {
      return
    }

    window.clearTimeout(closeTimeoutRef.current)
    closeTimeoutRef.current = null
  }, [])

  const select = React.useCallback<SelectDialogContextValue["select"]>(
    (props) =>
      new Promise((resolve) => {
        clearCloseTimeout()
        activeRequestRef.current?.resolve(undefined)
        const nextRequest: ActiveSelectRequest = {
          id: createRequestId(),
          props: props as unknown as SelectDialogRequest<ItemsArray, boolean>,
          resolve: resolve as (
            value: SelectDialogValue<AnyItem, boolean> | undefined
          ) => void,
        }
        activeRequestRef.current = nextRequest
        setOpen(false)
        setActiveRequest(nextRequest)
      }),
    [clearCloseTimeout]
  )

  React.useEffect(() => {
    if (!activeRequest) {
      return undefined
    }

    const frame = window.requestAnimationFrame(() => setOpen(true))
    return () => window.cancelAnimationFrame(frame)
  }, [activeRequest])

  const closeActiveRequest = React.useCallback(
    (requestId: string) => {
      clearCloseTimeout()
      closeTimeoutRef.current = window.setTimeout(() => {
        closeTimeoutRef.current = null
        setActiveRequest((currentRequest) => {
          if (currentRequest?.id !== requestId) {
            return currentRequest
          }

          activeRequestRef.current = null
          return null
        })
      }, SELECT_DIALOG_CLOSE_DELAY_MS)
    },
    [clearCloseTimeout]
  )

  React.useEffect(
    () => () => {
      clearCloseTimeout()
      activeRequestRef.current?.resolve(undefined)
      activeRequestRef.current = null
    },
    [clearCloseTimeout]
  )

  return (
    <SelectDialogContext.Provider value={{ select }}>
      {children}
      {activeRequest ? (
        <SelectDialog<ItemsArray, boolean>
          key={activeRequest.id}
          {...activeRequest.props}
          open={open}
          onConfirm={(selectedValue) => {
            activeRequest.props.onConfirm?.(selectedValue)
            activeRequest.resolve(selectedValue)
            setOpen(false)
            closeActiveRequest(activeRequest.id)
          }}
          onCancel={() => {
            activeRequest.props.onCancel?.()
            activeRequest.resolve(undefined)
            setOpen(false)
            closeActiveRequest(activeRequest.id)
          }}
        />
      ) : null}
    </SelectDialogContext.Provider>
  )
}
