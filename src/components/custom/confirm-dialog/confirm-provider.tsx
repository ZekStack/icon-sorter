import * as React from "react"

import { ConfirmDialog } from "./confirm-dialog"
import { ConfirmContext } from "./confirm-context"

import type { ConfirmOptions, ConfirmRequest } from "./confirm-dialog-types"

const CONFIRM_DIALOG_CLOSE_DELAY_MS = 180

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const [request, setRequest] = React.useState<ConfirmRequest | null>(null)

  const idRef = React.useRef(0)
  const requestRef = React.useRef<ConfirmRequest | null>(null)
  const queueRef = React.useRef<ConfirmRequest[]>([])
  const settledRef = React.useRef(false)
  const closeTimeoutRef = React.useRef<number | null>(null)

  const clearCloseTimeout = React.useCallback(() => {
    if (closeTimeoutRef.current === null) {
      return
    }

    window.clearTimeout(closeTimeoutRef.current)
    closeTimeoutRef.current = null
  }, [])

  const showRequest = React.useCallback(
    (nextRequest: ConfirmRequest) => {
      clearCloseTimeout()
      requestRef.current = nextRequest
      settledRef.current = false
      setRequest(nextRequest)
      window.requestAnimationFrame(() => setOpen(true))
    },
    [clearCloseTimeout]
  )

  const showNextRequest = React.useCallback(() => {
    const nextRequest = queueRef.current.shift()
    if (nextRequest) {
      showRequest(nextRequest)
    }
  }, [showRequest])

  const settle = React.useCallback((value: boolean) => {
    const currentRequest = requestRef.current
    if (!currentRequest || settledRef.current) {
      return
    }

    settledRef.current = true
    currentRequest.resolve(value)
    setOpen(false)
  }, [])

  const confirm = React.useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        const nextRequest: ConfirmRequest = {
          ...options,
          id: ++idRef.current,
          resolve,
        }

        if (requestRef.current) {
          queueRef.current.push(nextRequest)
          return
        }

        showRequest(nextRequest)
      }),
    [showRequest]
  )

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setOpen(true)
        return
      }

      if (requestRef.current?.dismissible) {
        settle(false)
      }
    },
    [settle]
  )

  React.useEffect(() => {
    if (open || !request || !settledRef.current) {
      return undefined
    }

    clearCloseTimeout()
    closeTimeoutRef.current = window.setTimeout(() => {
      closeTimeoutRef.current = null
      if (requestRef.current?.id !== request.id) {
        return
      }

      requestRef.current = null
      settledRef.current = false
      setRequest(null)
      showNextRequest()
    }, CONFIRM_DIALOG_CLOSE_DELAY_MS)

    return clearCloseTimeout
  }, [clearCloseTimeout, open, request, showNextRequest])

  React.useEffect(
    () => () => {
      clearCloseTimeout()
      requestRef.current?.resolve(false)
      requestRef.current = null
      for (const queuedRequest of queueRef.current) {
        queuedRequest.resolve(false)
      }
      queueRef.current = []
    },
    [clearCloseTimeout]
  )

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmDialog
        open={open}
        request={request}
        onOpenChange={handleOpenChange}
        onSettle={settle}
      />
    </ConfirmContext.Provider>
  )
}
