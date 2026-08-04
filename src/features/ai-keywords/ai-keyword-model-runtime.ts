export type AiKeywordTranslatorDefinition = {
  code: string
  label: string
}

export class AiKeywordModelCreationError extends Error {
  readonly model: "prompt" | "translator"
  readonly languageCode?: string

  constructor(options: {
    model: "prompt" | "translator"
    languageCode?: string
    label: string
    cause: unknown
  }) {
    const detail =
      options.cause instanceof Error
        ? options.cause.message
        : String(options.cause)

    super(`${options.label}: ${detail}`)
    this.name = "AiKeywordModelCreationError"
    this.model = options.model
    this.languageCode = options.languageCode
  }
}

type CreateAiKeywordModelsOptions<TSession, TTranslator> = {
  translators: readonly AiKeywordTranslatorDefinition[]
  createSession: () => Promise<TSession>
  createTranslator: (languageCode: string) => Promise<TTranslator>
  destroySession: (session: TSession) => void
  destroyTranslator: (translator: TTranslator) => void
  onFailure?: (error: AiKeywordModelCreationError) => void
}

export type CreatedAiKeywordModels<TSession, TTranslator> = {
  session: TSession
  translators: Map<string, TTranslator>
}

function safelyDestroy<T>(value: T, destroy: (value: T) => void) {
  try {
    destroy(value)
  } catch {
    // Cleanup must not hide the model creation error.
  }
}

export async function createAiKeywordModels<TSession, TTranslator>({
  translators,
  createSession,
  createTranslator,
  destroySession,
  destroyTranslator,
  onFailure,
}: CreateAiKeywordModelsOptions<
  TSession,
  TTranslator
>): Promise<CreatedAiKeywordModels<TSession, TTranslator>> {
  let primaryError: AiKeywordModelCreationError | undefined

  const registerFailure = (error: AiKeywordModelCreationError) => {
    if (!primaryError) {
      primaryError = error
      onFailure?.(error)
    }
    return error
  }

  const startSession = () => {
    try {
      return createSession().catch((cause) => {
        throw registerFailure(
          new AiKeywordModelCreationError({
            model: "prompt",
            label: "English keyword model",
            cause,
          })
        )
      })
    } catch (cause) {
      return Promise.reject(
        registerFailure(
          new AiKeywordModelCreationError({
            model: "prompt",
            label: "English keyword model",
            cause,
          })
        )
      )
    }
  }

  const startTranslator = (definition: AiKeywordTranslatorDefinition) => {
    try {
      return createTranslator(definition.code).catch((cause) => {
        throw registerFailure(
          new AiKeywordModelCreationError({
            model: "translator",
            languageCode: definition.code,
            label: `${definition.label} (${definition.code})`,
            cause,
          })
        )
      })
    } catch (cause) {
      return Promise.reject(
        registerFailure(
          new AiKeywordModelCreationError({
            model: "translator",
            languageCode: definition.code,
            label: `${definition.label} (${definition.code})`,
            cause,
          })
        )
      )
    }
  }

  // These calls intentionally run before the first await. Chrome requires
  // create() to happen while the originating user activation is still active
  // when a built-in model or language pack must be downloaded.
  const sessionPromise = startSession()
  const translatorPromises = translators.map((definition) => ({
    definition,
    promise: startTranslator(definition),
  }))

  const settled = await Promise.allSettled([
    sessionPromise,
    ...translatorPromises.map(({ promise }) => promise),
  ])
  const sessionResult = settled[0]
  const translatorResults = settled.slice(1)
  const failed = settled.some((result) => result.status === "rejected")

  if (failed || !sessionResult || sessionResult.status !== "fulfilled") {
    if (sessionResult?.status === "fulfilled") {
      safelyDestroy(sessionResult.value, destroySession)
    }

    for (const result of translatorResults) {
      if (result?.status === "fulfilled") {
        safelyDestroy(result.value, destroyTranslator)
      }
    }

    const fallbackError = settled.find(
      (result): result is PromiseRejectedResult => result.status === "rejected"
    )?.reason
    throw primaryError ?? fallbackError ?? new Error("ai-model-creation-failed")
  }

  const createdTranslators = new Map<string, TTranslator>()
  for (let index = 0; index < translatorPromises.length; index += 1) {
    const definition = translatorPromises[index]?.definition
    const result = translatorResults[index]
    if (definition && result?.status === "fulfilled") {
      createdTranslators.set(definition.code, result.value)
    }
  }

  return {
    session: sessionResult.value,
    translators: createdTranslators,
  }
}
