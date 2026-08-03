export const AI_GROUPING_BATCH_SIZE = 16
export const AI_GROUPING_REQUEST_TIMEOUT_MS = 45_000
export const AI_GROUPING_LIVE_UPDATE_CHUNK_SIZE = 64

export class AiGroupingTimeoutError extends Error {
  constructor() {
    super("ai-grouping-request-timeout")
    this.name = "AiGroupingTimeoutError"
  }
}

export function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError"
}

function createAbortError() {
  return new DOMException("Operation aborted", "AbortError")
}

export async function runWithTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  parentSignal: AbortSignal,
  timeoutMs: number
): Promise<T> {
  if (parentSignal.aborted) {
    throw createAbortError()
  }

  const controller = new AbortController()
  let handleParentAbort: (() => void) | undefined
  const abortPromise = new Promise<never>((_, reject) => {
    handleParentAbort = () => {
      controller.abort(parentSignal.reason)
      reject(createAbortError())
    }
    parentSignal.addEventListener("abort", handleParentAbort, { once: true })
  })

  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let timedOut = false
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      timedOut = true
      controller.abort(new AiGroupingTimeoutError())
      reject(new AiGroupingTimeoutError())
    }, timeoutMs)
  })

  try {
    return await Promise.race([
      operation(controller.signal),
      timeoutPromise,
      abortPromise,
    ])
  } catch (error) {
    if (timedOut && !parentSignal.aborted) {
      throw new AiGroupingTimeoutError()
    }
    throw error
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }
    if (handleParentAbort) {
      parentSignal.removeEventListener("abort", handleParentAbort)
    }
  }
}

type SchedulerWithYield = {
  yield: () => Promise<void>
}

export async function yieldToMainThread() {
  const scheduler = (globalThis as typeof globalThis & {
    scheduler?: SchedulerWithYield
  }).scheduler

  if (scheduler?.yield) {
    await scheduler.yield()
    return
  }

  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

type RunBatchQueueOptions<TItem, TResult> = {
  items: readonly TItem[]
  startIndex: number
  batchSize: number
  signal: AbortSignal
  timeoutMs: number
  shouldPause: () => boolean
  processBatch: (
    batch: readonly TItem[],
    signal: AbortSignal
  ) => Promise<TResult>
  onBatchResult: (
    result: TResult,
    batch: readonly TItem[]
  ) => Promise<void> | void
  onBatchError: (
    error: unknown,
    batch: readonly TItem[]
  ) => Promise<void> | void
  yieldControl?: () => Promise<void>
}

export type RunBatchQueueResult = {
  cursor: number
  paused: boolean
}

export async function runBatchQueue<TItem, TResult>({
  items,
  startIndex,
  batchSize,
  signal,
  timeoutMs,
  shouldPause,
  processBatch,
  onBatchResult,
  onBatchError,
  yieldControl = yieldToMainThread,
}: RunBatchQueueOptions<TItem, TResult>): Promise<RunBatchQueueResult> {
  let cursor = startIndex

  while (cursor < items.length) {
    if (signal.aborted) {
      throw createAbortError()
    }

    if (shouldPause()) {
      return { cursor, paused: true }
    }

    const batch = items.slice(cursor, cursor + batchSize)

    try {
      const result = await runWithTimeout(
        (batchSignal) => processBatch(batch, batchSignal),
        signal,
        timeoutMs
      )
      await onBatchResult(result, batch)
    } catch (error) {
      if (signal.aborted) {
        throw error
      }
      await onBatchError(error, batch)
    }

    cursor += batch.length
    await yieldControl()
  }

  return { cursor, paused: false }
}
