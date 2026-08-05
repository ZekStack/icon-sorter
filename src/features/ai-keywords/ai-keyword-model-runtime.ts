export const AI_KEYWORD_PROMPT_MODEL_TIMEOUT_MS = 20 * 60_000
export const AI_KEYWORD_TRANSLATOR_MODEL_TIMEOUT_MS = 5 * 60_000

export class AiKeywordModelTimeoutError extends Error {
  readonly label: string

  constructor(label: string) {
    super(`${label}: model preparation timed out`)
    this.name = "AiKeywordModelTimeoutError"
    this.label = label
  }
}

export class AiKeywordModelCreationError extends Error {
  readonly label: string
  readonly cause: unknown

  constructor(label: string, cause: unknown) {
    const detail = cause instanceof Error ? cause.message : String(cause)
    super(`${label}: ${detail}`)
    this.name = "AiKeywordModelCreationError"
    this.label = label
    this.cause = cause
  }
}

type StartAiKeywordModelCreationOptions<T> = {
  label: string
  timeoutMs: number
  parentSignal?: AbortSignal
  create: (signal: AbortSignal) => Promise<T>
  destroy?: (model: T) => void
}

function createAbortError() {
  return new DOMException("Model preparation aborted", "AbortError")
}

function safelyDestroy<T>(model: T, destroy?: (model: T) => void) {
  if (!destroy) {
    return
  }

  try {
    destroy(model)
  } catch {
    // Cleanup errors must not hide the original preparation failure.
  }
}

/**
 * Starts exactly one browser AI model creation synchronously.
 *
 * Chrome may consume transient user activation when create() is called, so the
 * caller must invoke this function directly from the trusted event handler and
 * must use a separate trusted interaction for every model or translator.
 */
export function startAiKeywordModelCreation<T>({
  label,
  timeoutMs,
  parentSignal,
  create,
  destroy,
}: StartAiKeywordModelCreationOptions<T>): Promise<T> {
  if (parentSignal?.aborted) {
    return Promise.reject(createAbortError())
  }

  const controller = new AbortController()
  let settled = false
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let removeParentAbort: (() => void) | undefined

  let creationPromise: Promise<T>
  try {
    // Intentionally executed before this function returns and before any await.
    creationPromise = create(controller.signal)
  } catch (cause) {
    return Promise.reject(new AiKeywordModelCreationError(label, cause))
  }

  return new Promise<T>((resolve, reject) => {
    const finish = (callback: () => void) => {
      if (settled) {
        return false
      }

      settled = true
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId)
      }
      removeParentAbort?.()
      callback()
      return true
    }

    if (parentSignal) {
      const handleParentAbort = () => {
        controller.abort(parentSignal.reason)
        finish(() => reject(createAbortError()))
      }
      parentSignal.addEventListener("abort", handleParentAbort, { once: true })
      removeParentAbort = () =>
        parentSignal.removeEventListener("abort", handleParentAbort)
    }

    timeoutId = setTimeout(() => {
      const error = new AiKeywordModelTimeoutError(label)
      controller.abort(error)
      finish(() => reject(error))
    }, timeoutMs)

    creationPromise.then(
      (model) => {
        if (!finish(() => resolve(model))) {
          safelyDestroy(model, destroy)
        }
      },
      (cause) => {
        finish(() => {
          if (controller.signal.aborted) {
            reject(
              controller.signal.reason instanceof AiKeywordModelTimeoutError
                ? controller.signal.reason
                : createAbortError()
            )
            return
          }

          reject(new AiKeywordModelCreationError(label, cause))
        })
      }
    )
  })
}
