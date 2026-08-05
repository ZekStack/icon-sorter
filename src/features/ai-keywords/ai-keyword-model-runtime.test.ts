import { describe, expect, it, vi } from "vitest"

import {
  AiKeywordModelCreationError,
  AiKeywordModelTimeoutError,
  startAiKeywordModelCreation,
} from "@/features/ai-keywords/ai-keyword-model-runtime"

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })
  return { promise, resolve, reject }
}

describe("AI keyword model preparation", () => {
  it("invokes create synchronously for one trusted interaction", async () => {
    const pending = deferred<{ id: string }>()
    const calls: string[] = []

    const modelPromise = startAiKeywordModelCreation({
      label: "Magyar",
      timeoutMs: 1_000,
      create: () => {
        calls.push("create")
        return pending.promise
      },
    })

    expect(calls).toEqual(["create"])
    pending.resolve({ id: "hu" })
    await expect(modelPromise).resolves.toEqual({ id: "hu" })
  })

  it("wraps synchronous browser creation failures with the model label", async () => {
    const modelPromise = startAiKeywordModelCreation({
      label: "Deutsch (de)",
      timeoutMs: 1_000,
      create: () => {
        throw new DOMException("Language pack limit exceeded", "OperationError")
      },
    })

    await expect(modelPromise).rejects.toMatchObject({
      name: "AiKeywordModelCreationError",
      label: "Deutsch (de)",
      message: "Deutsch (de): Language pack limit exceeded",
    } satisfies Partial<AiKeywordModelCreationError>)
  })

  it("aborts and reports model preparation timeouts", async () => {
    vi.useFakeTimers()
    const observedSignals: AbortSignal[] = []

    const modelPromise = startAiKeywordModelCreation({
      label: "Română (ro)",
      timeoutMs: 5_000,
      create: (signal) => {
        observedSignals.push(signal)
        return new Promise(() => undefined)
      },
    })

    await vi.advanceTimersByTimeAsync(5_000)
    await expect(modelPromise).rejects.toMatchObject({
      name: "AiKeywordModelTimeoutError",
      label: "Română (ro)",
    } satisfies Partial<AiKeywordModelTimeoutError>)
    expect(observedSignals[0]?.aborted).toBe(true)
    vi.useRealTimers()
  })

  it("destroys a model that resolves after the timeout", async () => {
    vi.useFakeTimers()
    const pending = deferred<{ id: string }>()
    const destroy = vi.fn()

    const modelPromise = startAiKeywordModelCreation({
      label: "English keyword model",
      timeoutMs: 5_000,
      create: () => pending.promise,
      destroy,
    })

    await vi.advanceTimersByTimeAsync(5_000)
    await expect(modelPromise).rejects.toBeInstanceOf(AiKeywordModelTimeoutError)

    pending.resolve({ id: "late" })
    await Promise.resolve()
    expect(destroy).toHaveBeenCalledWith({ id: "late" })
    vi.useRealTimers()
  })
})
