import { describe, expect, it, vi } from "vitest"

import {
  AiKeywordModelCreationError,
  createAiKeywordModels,
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

describe("AI keyword model startup", () => {
  it("starts the prompt model and every translator before awaiting", async () => {
    const calls: string[] = []
    const prompt = deferred<{ id: string }>()
    const hungarian = deferred<{ id: string }>()
    const romanian = deferred<{ id: string }>()

    const modelsPromise = createAiKeywordModels({
      translators: [
        { code: "hu", label: "Magyar" },
        { code: "ro", label: "Română" },
      ],
      createSession: () => {
        calls.push("prompt")
        return prompt.promise
      },
      createTranslator: (languageCode) => {
        calls.push(languageCode)
        return languageCode === "hu" ? hungarian.promise : romanian.promise
      },
      destroySession: vi.fn(),
      destroyTranslator: vi.fn(),
    })

    expect(calls).toEqual(["prompt", "hu", "ro"])

    prompt.resolve({ id: "prompt" })
    hungarian.resolve({ id: "hu" })
    romanian.resolve({ id: "ro" })

    const models = await modelsPromise
    expect(models.session).toEqual({ id: "prompt" })
    expect([...models.translators]).toEqual([
      ["hu", { id: "hu" }],
      ["ro", { id: "ro" }],
    ])
  })

  it("reports the failing language and destroys partial models", async () => {
    const promptSession = { id: "prompt" }
    const germanTranslator = { id: "de" }
    const destroySession = vi.fn()
    const destroyTranslator = vi.fn()
    const onFailure = vi.fn()

    const modelsPromise = createAiKeywordModels({
      translators: [
        { code: "hu", label: "Magyar" },
        { code: "de", label: "Deutsch" },
      ],
      createSession: async () => promptSession,
      createTranslator: async (languageCode) => {
        if (languageCode === "hu") {
          throw new Error("Requires a user gesture")
        }
        return germanTranslator
      },
      destroySession,
      destroyTranslator,
      onFailure,
    })

    await expect(modelsPromise).rejects.toMatchObject({
      name: "AiKeywordModelCreationError",
      model: "translator",
      languageCode: "hu",
      message: "Magyar (hu): Requires a user gesture",
    } satisfies Partial<AiKeywordModelCreationError>)
    expect(onFailure).toHaveBeenCalledTimes(1)
    expect(destroySession).toHaveBeenCalledWith(promptSession)
    expect(destroyTranslator).toHaveBeenCalledWith(germanTranslator)
  })
})
