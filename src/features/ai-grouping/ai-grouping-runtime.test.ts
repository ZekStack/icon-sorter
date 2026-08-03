import { describe, expect, it, vi } from "vitest"

import {
  AiGroupingTimeoutError,
  runBatchQueue,
  runWithTimeout,
} from "@/features/ai-grouping/ai-grouping-runtime"

describe("AI grouping runtime", () => {
  it("continues through more than 128 items", async () => {
    const items = Array.from({ length: 160 }, (_, index) => index)
    const processed: number[] = []
    const controller = new AbortController()

    const result = await runBatchQueue({
      items,
      startIndex: 0,
      batchSize: 16,
      signal: controller.signal,
      timeoutMs: 1_000,
      shouldPause: () => false,
      processBatch: async (batch) => [...batch],
      onBatchResult: (batch) => {
        processed.push(...batch)
      },
      onBatchError: () => {
        throw new Error("unexpected batch failure")
      },
      yieldControl: async () => undefined,
    })

    expect(result).toEqual({ cursor: 160, paused: false })
    expect(processed).toEqual(items)
  })

  it("aborts even when the operation ignores its signal", async () => {
    const controller = new AbortController()
    const operation = runWithTimeout(
      () => new Promise<never>(() => undefined),
      controller.signal,
      60_000
    )

    controller.abort()

    await expect(operation).rejects.toMatchObject({ name: "AbortError" })
  })

  it("times out a stuck operation", async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const operation = runWithTimeout(
      () => new Promise<never>(() => undefined),
      controller.signal,
      250
    )

    await vi.advanceTimersByTimeAsync(250)

    await expect(operation).rejects.toBeInstanceOf(AiGroupingTimeoutError)
    vi.useRealTimers()
  })

  it("normalizes abort rejection caused by a timeout", async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const operation = runWithTimeout(
      (signal) =>
        new Promise<never>((_resolve, reject) => {
          signal.addEventListener(
            "abort",
            () => reject(new DOMException("aborted", "AbortError")),
            { once: true }
          )
        }),
      controller.signal,
      250
    )

    await vi.advanceTimersByTimeAsync(250)

    await expect(operation).rejects.toBeInstanceOf(AiGroupingTimeoutError)
    vi.useRealTimers()
  })

  it("marks a timed-out batch failed and continues", async () => {
    vi.useFakeTimers()
    const items = Array.from({ length: 48 }, (_, index) => index)
    const completed: number[] = []
    const failed: number[] = []
    const controller = new AbortController()
    let batchIndex = 0

    const queue = runBatchQueue({
      items,
      startIndex: 0,
      batchSize: 16,
      signal: controller.signal,
      timeoutMs: 100,
      shouldPause: () => false,
      processBatch: async (batch) => {
        batchIndex += 1
        if (batchIndex === 2) {
          return new Promise<never>(() => undefined)
        }
        return [...batch]
      },
      onBatchResult: (batch) => {
        completed.push(...batch)
      },
      onBatchError: (_error, batch) => {
        failed.push(...batch)
      },
      yieldControl: async () => undefined,
    })

    await vi.advanceTimersByTimeAsync(100)
    const result = await queue

    expect(result).toEqual({ cursor: 48, paused: false })
    expect(completed).toEqual([...items.slice(0, 16), ...items.slice(32)])
    expect(failed).toEqual(items.slice(16, 32))
    vi.useRealTimers()
  })
})
