import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { KeyRound, LoaderCircle, Pause, Play, Square } from "lucide-react"
import { useTranslation } from "react-i18next"

import { IconPreview } from "@/components/icon-preview"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AI_KEYWORD_BATCH_SIZE,
  AI_KEYWORD_LANGUAGES,
  AI_KEYWORD_LIVE_UPDATE_CHUNK_SIZE,
  AI_KEYWORD_MAX_COUNT,
  AI_KEYWORD_MIN_COUNT,
  AI_KEYWORD_PROMPT_TIMEOUT_MS,
  AI_KEYWORD_REQUEST_TIMEOUT_MS,
  AI_KEYWORD_TRANSLATION_BLOCK_SIZE,
  AI_KEYWORD_TRANSLATION_TIMEOUT_MS,
  DEFAULT_AI_KEYWORD_LANGUAGE_SETTINGS,
  clampKeywordCount,
  createAiKeywordPrompt,
  createAiKeywordResponseSchema,
  createAiKeywordSystemPrompt,
  createAiKeywordTargets,
  createLocalizedKeywordResult,
  getAiKeywordCandidateCount,
  normalizeGeneratedKeyword,
  parseAiKeywordResponse,
  selectedKeywordLanguages,
  type AiKeywordResult,
  type AiKeywordTarget,
  type KeywordGenerationScope,
  type KeywordLanguageSetting,
} from "@/features/ai-keywords/ai-keywords"
import {
  isAbortError,
  runBatchQueue,
  runWithTimeout,
  yieldToMainThread,
} from "@/features/ai-grouping/ai-grouping-runtime"
import {
  iconId,
  type IconGroup,
  type IconReference,
} from "@/lib/icon-sorter-data"
import { DEFAULT_ICON_COLOR, useIconSorter } from "@/lib/icon-sorter-store"

const MODEL_CAPABILITIES = {
  expectedInputs: [{ type: "text", languages: ["en"] }],
  expectedOutputs: [{ type: "text", languages: ["en"] }],
} as const

type KeywordStatus =
  | "idle"
  | "checking"
  | "downloading"
  | "preparing"
  | "running"
  | "pausing"
  | "paused"
  | "stopped"
  | "completed"
  | "unavailable"
  | "error"

type BuiltInAvailability =
  | "unavailable"
  | "downloadable"
  | "downloading"
  | "available"

type DownloadMonitor = {
  addEventListener: (
    type: "downloadprogress",
    listener: (event: { loaded: number }) => void
  ) => void
}

type LanguageModelSession = {
  prompt: (
    input: string,
    options?: {
      signal?: AbortSignal
      responseConstraint?: unknown
    }
  ) => Promise<string>
  clone: (options?: { signal?: AbortSignal }) => Promise<LanguageModelSession>
  destroy: () => void
}

type LanguageModelFactory = {
  availability: (
    options: typeof MODEL_CAPABILITIES
  ) => Promise<BuiltInAvailability>
  create: (
    options: typeof MODEL_CAPABILITIES & {
      signal?: AbortSignal
      initialPrompts: Array<{ role: "system"; content: string }>
      monitor: (monitor: DownloadMonitor) => void
    }
  ) => Promise<LanguageModelSession>
}

type TranslatorSession = {
  translate: (
    input: string,
    options?: { signal?: AbortSignal }
  ) => Promise<string>
  destroy: () => void
}

type TranslatorFactory = {
  availability: (options: {
    sourceLanguage: string
    targetLanguage: string
  }) => Promise<BuiltInAvailability>
  create: (options: {
    sourceLanguage: string
    targetLanguage: string
    signal?: AbortSignal
    monitor?: (monitor: DownloadMonitor) => void
  }) => Promise<TranslatorSession>
}

type TranslationCache = Map<string, Map<string, string>>

type BatchResult = {
  results: AiKeywordResult[]
  missingIcons: IconReference[]
}

type KeywordProgress = {
  total: number
  processed: number
  updated: number
  failed: number
}

const COPY = {
  en: {
    title: "Multilingual AI keywords",
    local: "Runs locally",
    description: (count: string) =>
      `Generate selected-language search keywords for ${count} saved icons. Existing keywords are preserved.`,
    scope: "Icons to process",
    missingScope: "Only icons without keywords",
    allScope: "All saved icons (merge existing)",
    languages: "Languages and keyword counts",
    keywordCount: "Keywords",
    startMissing: "Generate missing keywords",
    startAll: "Enrich all saved icons",
    retry: "Run again",
    pause: "Pause",
    resume: "Resume",
    stop: "Stop",
    updated: "Updated",
    failed: "Needs retry",
    remaining: "Remaining",
    noLanguages: "Select at least one language.",
    unavailable:
      "Chrome's built-in Prompt or Translator API is unavailable for one of the selected languages.",
    error: (message: string) => `Keyword generation failed: ${message}`,
    status: {
      idle: "Ready",
      checking: "Checking built-in AI language support…",
      downloading: "Downloading a browser language model…",
      preparing: "Preparing keyword and translation models…",
      running: "Generating and translating keywords…",
      pausing: "Finishing the current batch…",
      paused: "Paused",
      stopped: "Stopped",
      completed: "Keyword generation complete",
      unavailable: "Required browser AI unavailable",
      error: "Keyword generation failed",
    } satisfies Record<KeywordStatus, string>,
  },
  hu: {
    title: "Többnyelvű AI kulcsszavak",
    local: "Helyben fut",
    description: (count: string) =>
      `Keresési kulcsszavak készítése a kiválasztott nyelveken ${count} mentett ikonhoz. A meglévő kulcsszavak megmaradnak.`,
    scope: "Feldolgozandó ikonok",
    missingScope: "Csak kulcsszó nélküli ikonok",
    allScope: "Minden mentett ikon (meglévők bővítése)",
    languages: "Nyelvek és kulcsszavak száma",
    keywordCount: "Kulcsszó",
    startMissing: "Hiányzó kulcsszavak készítése",
    startAll: "Minden mentett ikon bővítése",
    retry: "Újrafuttatás",
    pause: "Szünet",
    resume: "Folytatás",
    stop: "Leállítás",
    updated: "Frissítve",
    failed: "Újrapróbálandó",
    remaining: "Hátralévő",
    noLanguages: "Válassz ki legalább egy nyelvet.",
    unavailable:
      "A Chrome beépített Prompt vagy Translator API-ja nem érhető el valamelyik kiválasztott nyelvhez.",
    error: (message: string) => `A kulcsszavak készítése sikertelen: ${message}`,
    status: {
      idle: "Indításra kész",
      checking: "A beépített AI nyelvi támogatásának ellenőrzése…",
      downloading: "Böngészőben futó nyelvi modell letöltése…",
      preparing: "Kulcsszó- és fordítómodellek előkészítése…",
      running: "Kulcsszavak készítése és fordítása…",
      pausing: "Az aktuális köteg befejezése…",
      paused: "Szüneteltetve",
      stopped: "Leállítva",
      completed: "A kulcsszavak elkészültek",
      unavailable: "A szükséges böngésző AI nem érhető el",
      error: "A kulcsszavak készítése sikertelen",
    } satisfies Record<KeywordStatus, string>,
  },
} as const

function getLanguageModelFactory() {
  return (
    globalThis as typeof globalThis & {
      LanguageModel?: LanguageModelFactory
    }
  ).LanguageModel
}

function getTranslatorFactory() {
  return (
    globalThis as typeof globalThis & {
      Translator?: TranslatorFactory
    }
  ).Translator
}

async function translateKeywordBlock(
  translator: TranslatorSession,
  keywords: readonly string[],
  signal: AbortSignal
) {
  const translate = (input: string) =>
    runWithTimeout(
      (translationSignal) =>
        translator.translate(input, { signal: translationSignal }),
      signal,
      AI_KEYWORD_TRANSLATION_TIMEOUT_MS
    )

  const translatedBlock = await translate(keywords.join("\n"))
  const translatedLines = translatedBlock
    .split(/\r?\n/u)
    .map((line) => line.trim())

  if (
    translatedLines.length === keywords.length &&
    translatedLines.every((line) => normalizeGeneratedKeyword(line))
  ) {
    return translatedLines
  }

  const translated: string[] = []
  for (const keyword of keywords) {
    translated.push(await translate(keyword))
  }
  return translated
}

async function translateKeywords(
  translator: TranslatorSession,
  languageCode: string,
  keywords: readonly string[],
  cache: TranslationCache,
  signal: AbortSignal
) {
  let languageCache = cache.get(languageCode)
  if (!languageCache) {
    languageCache = new Map<string, string>()
    cache.set(languageCode, languageCache)
  }

  const uniqueKeywords = [...new Set(keywords)]
  const uncached = uniqueKeywords.filter(
    (keyword) => !languageCache?.has(keyword)
  )

  for (
    let index = 0;
    index < uncached.length;
    index += AI_KEYWORD_TRANSLATION_BLOCK_SIZE
  ) {
    const block = uncached.slice(
      index,
      index + AI_KEYWORD_TRANSLATION_BLOCK_SIZE
    )
    const translations = await translateKeywordBlock(translator, block, signal)

    for (let offset = 0; offset < block.length; offset += 1) {
      const source = block[offset]
      const translated = normalizeGeneratedKeyword(translations[offset])
      if (source && translated) {
        languageCache.set(source, translated)
      }
    }
  }

  return new Map(
    uniqueKeywords
      .map((keyword) => [keyword, languageCache?.get(keyword)] as const)
      .filter(
        (entry): entry is readonly [string, string] => Boolean(entry[1])
      )
  )
}

async function generateKeywordBatch(options: {
  session: LanguageModelSession
  translators: ReadonlyMap<string, TranslatorSession>
  translationCache: TranslationCache
  icons: readonly AiKeywordTarget[]
  groups: readonly IconGroup[]
  settings: readonly KeywordLanguageSetting[]
  candidateCount: number
  signal: AbortSignal
}): Promise<BatchResult> {
  const {
    session,
    translators,
    translationCache,
    icons,
    groups,
    settings,
    candidateCount,
    signal,
  } = options

  const inputIcons = [...icons]
  const response = await runWithTimeout(
    async (promptSignal) => {
      const clone = await session.clone({ signal: promptSignal })
      try {
        return await clone.prompt(createAiKeywordPrompt(inputIcons, groups), {
          signal: promptSignal,
          responseConstraint: createAiKeywordResponseSchema(
            inputIcons,
            candidateCount
          ),
        })
      } finally {
        clone.destroy()
      }
    },
    signal,
    AI_KEYWORD_PROMPT_TIMEOUT_MS
  )

  const parsed = parseAiKeywordResponse(
    response,
    inputIcons,
    candidateCount
  )
  const seedById = new Map(
    parsed.results.map((result) => [iconId(result), result] as const)
  )
  const selected = selectedKeywordLanguages(settings)
  const translatedByLanguage = new Map<string, Map<string, string>>()
  const allEnglishKeywords = parsed.results.flatMap(
    (result) => result.englishKeywords
  )

  for (const setting of selected) {
    if (setting.code === "en") {
      continue
    }

    const translator = translators.get(setting.code)
    if (!translator) {
      throw new Error(`missing-translator-${setting.code}`)
    }

    translatedByLanguage.set(
      setting.code,
      await translateKeywords(
        translator,
        setting.code,
        allEnglishKeywords,
        translationCache,
        signal
      )
    )
  }

  const results: AiKeywordResult[] = []
  const missingIcons: IconReference[] = [...parsed.missingIcons]

  for (const target of inputIcons) {
    const seed = seedById.get(iconId(target))
    if (!seed) {
      continue
    }

    const translatedCandidates: Record<string, string[]> = {}
    for (const setting of selected) {
      if (setting.code === "en") {
        continue
      }

      const translations = translatedByLanguage.get(setting.code)
      translatedCandidates[setting.code] = seed.englishKeywords
        .map((keyword) => translations?.get(keyword) ?? "")
        .filter(Boolean)
    }

    const result = createLocalizedKeywordResult(
      target,
      seed.englishKeywords,
      translatedCandidates,
      selected
    )

    if (result) {
      results.push(result)
    } else {
      missingIcons.push({ type: target.type, name: target.name })
    }
  }

  return { results, missingIcons }
}

export function AiKeywordsPanel() {
  const { data, updateIconsKeywords } = useIconSorter()
  const { i18n } = useTranslation()
  const language = i18n.language.startsWith("hu") ? "hu" : "en"
  const locale = language === "hu" ? "hu-HU" : "en-US"
  const copy = COPY[language]

  const [scope, setScope] = useState<KeywordGenerationScope>("missing")
  const [languageSettings, setLanguageSettings] = useState<
    KeywordLanguageSetting[]
  >(() => DEFAULT_AI_KEYWORD_LANGUAGE_SETTINGS.map((setting) => ({ ...setting })))
  const [status, setStatus] = useState<KeywordStatus>("idle")
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadLanguage, setDownloadLanguage] = useState("")
  const [progress, setProgress] = useState<KeywordProgress>({
    total: 0,
    processed: 0,
    updated: 0,
    failed: 0,
  })
  const [currentResult, setCurrentResult] = useState<AiKeywordResult | null>(
    null
  )
  const [errorMessage, setErrorMessage] = useState("")

  const queueRef = useRef<AiKeywordTarget[]>([])
  const cursorRef = useRef(0)
  const groupsRef = useRef<IconGroup[]>([])
  const settingsRef = useRef<KeywordLanguageSetting[]>([])
  const candidateCountRef = useRef(0)
  const sessionRef = useRef<LanguageModelSession | null>(null)
  const translatorsRef = useRef(new Map<string, TranslatorSession>())
  const translationCacheRef = useRef<TranslationCache>(new Map())
  const abortRef = useRef<AbortController | null>(null)
  const pauseRequestedRef = useRef(false)
  const stopRequestedRef = useRef(false)
  const runningRef = useRef(false)

  const targets = useMemo(
    () => createAiKeywordTargets(data.icons, scope),
    [data.icons, scope]
  )
  const selectedLanguages = useMemo(
    () => selectedKeywordLanguages(languageSettings),
    [languageSettings]
  )
  const percentage = progress.total
    ? Math.min((progress.processed / progress.total) * 100, 100)
    : 0

  const destroyModels = useCallback(() => {
    sessionRef.current?.destroy()
    sessionRef.current = null
    for (const translator of translatorsRef.current.values()) {
      translator.destroy()
    }
    translatorsRef.current.clear()
  }, [])

  const applyResults = useCallback(
    async (results: AiKeywordResult[], signal: AbortSignal) => {
      for (
        let index = 0;
        index < results.length;
        index += AI_KEYWORD_LIVE_UPDATE_CHUNK_SIZE
      ) {
        if (signal.aborted) {
          throw new DOMException("Keyword generation aborted", "AbortError")
        }

        const chunk = results.slice(
          index,
          index + AI_KEYWORD_LIVE_UPDATE_CHUNK_SIZE
        )
        updateIconsKeywords(chunk)
        setCurrentResult(chunk.at(-1) ?? null)
        setProgress((current) => ({
          ...current,
          processed: current.processed + chunk.length,
          updated: current.updated + chunk.length,
        }))
        await yieldToMainThread()
      }
    },
    [updateIconsKeywords]
  )

  const runQueue = useCallback(async () => {
    const session = sessionRef.current
    const signal = abortRef.current?.signal
    if (!session || !signal) {
      throw new Error("missing-ai-keyword-session")
    }

    const result = await runBatchQueue({
      items: queueRef.current,
      startIndex: cursorRef.current,
      batchSize: AI_KEYWORD_BATCH_SIZE,
      signal,
      timeoutMs: AI_KEYWORD_REQUEST_TIMEOUT_MS,
      shouldPause: () => pauseRequestedRef.current,
      processBatch: (batch, batchSignal) =>
        generateKeywordBatch({
          session,
          translators: translatorsRef.current,
          translationCache: translationCacheRef.current,
          icons: batch,
          groups: groupsRef.current,
          settings: settingsRef.current,
          candidateCount: candidateCountRef.current,
          signal: batchSignal,
        }),
      onBatchResult: async (batchResult) => {
        if (batchResult.results.length > 0) {
          await applyResults(batchResult.results, signal)
        }

        if (batchResult.missingIcons.length > 0) {
          setProgress((current) => ({
            ...current,
            processed: current.processed + batchResult.missingIcons.length,
            failed: current.failed + batchResult.missingIcons.length,
          }))
        }
      },
      onBatchError: (_error, batch) => {
        setProgress((current) => ({
          ...current,
          processed: current.processed + batch.length,
          failed: current.failed + batch.length,
        }))
      },
    })

    cursorRef.current = result.cursor
    if (result.paused) {
      setStatus("paused")
      return
    }

    setStatus("completed")
    destroyModels()
  }, [applyResults, destroyModels])

  const beginRun = useCallback(async () => {
    if (runningRef.current) {
      return
    }

    const selected = selectedKeywordLanguages(languageSettings)
    if (targets.length === 0 || selected.length === 0) {
      setProgress({ total: 0, processed: 0, updated: 0, failed: 0 })
      setStatus(targets.length === 0 ? "completed" : "idle")
      return
    }

    const modelFactory = getLanguageModelFactory()
    const translatedLanguages = selected.filter(
      (setting) => setting.code !== "en"
    )
    const translatorFactory = getTranslatorFactory()
    if (!modelFactory || (translatedLanguages.length > 0 && !translatorFactory)) {
      setStatus("unavailable")
      return
    }

    runningRef.current = true
    pauseRequestedRef.current = false
    stopRequestedRef.current = false
    setErrorMessage("")
    setCurrentResult(null)
    setDownloadProgress(0)
    setDownloadLanguage("")
    setProgress({
      total: targets.length,
      processed: 0,
      updated: 0,
      failed: 0,
    })
    queueRef.current = targets
    cursorRef.current = 0
    groupsRef.current = data.groups
    settingsRef.current = selected
    candidateCountRef.current = getAiKeywordCandidateCount(selected)
    translationCacheRef.current = new Map()

    const controller = new AbortController()
    abortRef.current = controller

    try {
      setStatus("checking")
      const modelAvailability = await modelFactory.availability(
        MODEL_CAPABILITIES
      )
      if (modelAvailability === "unavailable") {
        setStatus("unavailable")
        return
      }

      if (translatorFactory) {
        for (const setting of translatedLanguages) {
          const availability = await translatorFactory.availability({
            sourceLanguage: "en",
            targetLanguage: setting.code,
          })
          if (availability === "unavailable") {
            setStatus("unavailable")
            return
          }
        }
      }

      setStatus(
        modelAvailability === "downloadable" ||
          modelAvailability === "downloading"
          ? "downloading"
          : "preparing"
      )
      setDownloadLanguage("English keyword model")
      sessionRef.current = await modelFactory.create({
        ...MODEL_CAPABILITIES,
        signal: controller.signal,
        initialPrompts: [
          {
            role: "system",
            content: createAiKeywordSystemPrompt(candidateCountRef.current),
          },
        ],
        monitor(monitor) {
          monitor.addEventListener("downloadprogress", (event) => {
            setDownloadProgress(Math.round(event.loaded * 100))
          })
        },
      })

      if (translatorFactory) {
        for (const setting of translatedLanguages) {
          const definition = AI_KEYWORD_LANGUAGES.find(
            (candidate) => candidate.code === setting.code
          )
          setStatus("preparing")
          setDownloadProgress(0)
          setDownloadLanguage(definition?.nativeLabel ?? setting.code)
          const translator = await translatorFactory.create({
            sourceLanguage: "en",
            targetLanguage: setting.code,
            signal: controller.signal,
            monitor(monitor) {
              monitor.addEventListener("downloadprogress", (event) => {
                setStatus("downloading")
                setDownloadProgress(Math.round(event.loaded * 100))
              })
            },
          })
          translatorsRef.current.set(setting.code, translator)
        }
      }

      setDownloadLanguage("")
      setStatus("running")
      await runQueue()
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) {
        setStatus(stopRequestedRef.current ? "stopped" : "paused")
      } else {
        setErrorMessage(error instanceof Error ? error.message : String(error))
        setStatus("error")
      }
      destroyModels()
    } finally {
      abortRef.current = null
      runningRef.current = false
    }
  }, [
    data.groups,
    destroyModels,
    languageSettings,
    runQueue,
    targets,
  ])

  const resumeRun = useCallback(async () => {
    if (runningRef.current || !sessionRef.current) {
      return
    }

    runningRef.current = true
    pauseRequestedRef.current = false
    stopRequestedRef.current = false
    const controller = new AbortController()
    abortRef.current = controller
    setStatus("running")

    try {
      await runQueue()
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) {
        setStatus(stopRequestedRef.current ? "stopped" : "paused")
      } else {
        setErrorMessage(error instanceof Error ? error.message : String(error))
        setStatus("error")
      }
      destroyModels()
    } finally {
      abortRef.current = null
      runningRef.current = false
    }
  }, [destroyModels, runQueue])

  function pauseRun() {
    pauseRequestedRef.current = true
    setStatus("pausing")
  }

  function stopRun() {
    stopRequestedRef.current = true
    pauseRequestedRef.current = false
    abortRef.current?.abort()
    destroyModels()
    setStatus("stopped")
  }

  function setLanguageEnabled(code: string, enabled: boolean) {
    setLanguageSettings((current) =>
      current.map((setting) =>
        setting.code === code ? { ...setting, enabled } : setting
      )
    )
  }

  function setLanguageCount(code: string, count: number) {
    setLanguageSettings((current) =>
      current.map((setting) =>
        setting.code === code
          ? { ...setting, count: clampKeywordCount(count) }
          : setting
      )
    )
  }

  useEffect(
    () => () => {
      abortRef.current?.abort()
      destroyModels()
    },
    [destroyModels]
  )

  const isBusy =
    status === "checking" ||
    status === "downloading" ||
    status === "preparing" ||
    status === "running" ||
    status === "pausing"
  const configurationLocked = isBusy || status === "paused"
  const canStart =
    !configurationLocked && targets.length > 0 && selectedLanguages.length > 0
  const startLabel =
    scope === "missing" ? copy.startMissing : copy.startAll

  return (
    <section className="overflow-hidden rounded-xl border bg-background">
      <div className="grid gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start gap-4">
          <div className="grid min-w-0 flex-1 gap-1">
            <div className="flex items-center gap-2 font-medium">
              <KeyRound className="size-4" />
              {copy.title}
              <Badge className="bg-background">{copy.local}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {copy.description(targets.length.toLocaleString(locale))}
            </p>
          </div>

          {status === "paused" ? (
            <Button size="lg" onClick={() => void resumeRun()}>
              <Play />
              {copy.resume}
            </Button>
          ) : (
            <Button
              size="lg"
              disabled={!canStart}
              onClick={() => void beginRun()}
            >
              {isBusy ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <KeyRound />
              )}
              {status === "completed" ||
              status === "stopped" ||
              status === "error" ||
              status === "unavailable"
                ? copy.retry
                : startLabel}
            </Button>
          )}
        </div>

        <div className="grid gap-4 rounded-xl border bg-muted/20 p-4">
          <label className="grid gap-1.5 text-sm sm:max-w-md">
            <span className="font-medium">{copy.scope}</span>
            <select
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
              value={scope}
              disabled={configurationLocked}
              onChange={(event) =>
                setScope(event.target.value as KeywordGenerationScope)
              }
            >
              <option value="missing">{copy.missingScope}</option>
              <option value="all">{copy.allScope}</option>
            </select>
          </label>

          <div className="grid gap-2">
            <div className="text-sm font-medium">{copy.languages}</div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {AI_KEYWORD_LANGUAGES.map((definition) => {
                const setting = languageSettings.find(
                  (candidate) => candidate.code === definition.code
                )
                if (!setting) {
                  return null
                }

                return (
                  <div
                    key={definition.code}
                    className="flex items-center gap-3 rounded-lg border bg-background p-3"
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-foreground"
                      checked={setting.enabled}
                      disabled={configurationLocked}
                      onChange={(event) =>
                        setLanguageEnabled(
                          definition.code,
                          event.target.checked
                        )
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {definition.nativeLabel}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {definition.code}
                      </div>
                    </div>
                    <label className="grid gap-1 text-xs text-muted-foreground">
                      <span>{copy.keywordCount}</span>
                      <Input
                        type="number"
                        className="w-20"
                        min={AI_KEYWORD_MIN_COUNT}
                        max={AI_KEYWORD_MAX_COUNT}
                        value={setting.count}
                        disabled={!setting.enabled || configurationLocked}
                        onChange={(event) =>
                          setLanguageCount(
                            definition.code,
                            Number(event.target.value)
                          )
                        }
                      />
                    </label>
                  </div>
                )
              })}
            </div>
            {selectedLanguages.length === 0 && (
              <p className="text-sm text-destructive">{copy.noLanguages}</p>
            )}
          </div>
        </div>
      </div>

      {status !== "idle" && (
        <div className="grid gap-4 border-t p-4 sm:p-5" aria-live="polite">
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium">
                {copy.status[status]}
                {downloadLanguage ? ` · ${downloadLanguage}` : ""}
              </span>
              {status === "downloading" ? (
                <span className="text-muted-foreground">
                  {downloadProgress}%
                </span>
              ) : progress.total > 0 ? (
                <span className="text-muted-foreground">
                  {progress.processed.toLocaleString(locale)} /{" "}
                  {progress.total.toLocaleString(locale)}
                </span>
              ) : null}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-foreground transition-[width]"
                style={{
                  width:
                    status === "downloading"
                      ? `${downloadProgress}%`
                      : `${percentage}%`,
                }}
              />
            </div>
          </div>

          {progress.total > 0 && (
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-lg border p-3">
                <div className="text-lg font-semibold">
                  {progress.updated.toLocaleString(locale)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {copy.updated}
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-lg font-semibold">
                  {progress.failed.toLocaleString(locale)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {copy.failed}
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-lg font-semibold">
                  {Math.max(progress.total - progress.processed, 0).toLocaleString(
                    locale
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {copy.remaining}
                </div>
              </div>
            </div>
          )}

          {currentResult && (
            <div className="flex min-w-0 items-center gap-4 rounded-xl border bg-muted/25 p-3">
              <div className="grid size-16 shrink-0 place-items-center rounded-lg border bg-background">
                <IconPreview
                  icon={currentResult}
                  size={38}
                  color={DEFAULT_ICON_COLOR}
                />
              </div>
              <div className="grid min-w-0 gap-1">
                <div className="truncate font-mono text-sm font-medium">
                  {currentResult.name}
                </div>
                <div className="line-clamp-2 text-xs text-muted-foreground">
                  {currentResult.keywords.join(", ")}
                </div>
              </div>
            </div>
          )}

          {status === "unavailable" && (
            <p className="text-sm text-destructive">{copy.unavailable}</p>
          )}
          {status === "error" && (
            <p className="text-sm text-destructive">
              {copy.error(errorMessage)}
            </p>
          )}

          {(status === "running" || status === "pausing") && (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                disabled={status === "pausing"}
                onClick={pauseRun}
              >
                <Pause />
                {copy.pause}
              </Button>
              <Button variant="destructive" onClick={stopRun}>
                <Square />
                {copy.stop}
              </Button>
            </div>
          )}
          {(status === "checking" ||
            status === "downloading" ||
            status === "preparing") && (
            <div className="flex justify-end">
              <Button variant="destructive" onClick={stopRun}>
                <Square />
                {copy.stop}
              </Button>
            </div>
          )}
          {status === "paused" && (
            <div className="flex justify-end">
              <Button variant="destructive" onClick={stopRun}>
                <Square />
                {copy.stop}
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
