import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { KeyRound, LoaderCircle, Pause, Play, Square } from "lucide-react"
import { useTranslation } from "react-i18next"

import { IconPreview } from "@/components/icon-preview"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AI_KEYWORD_BATCH_SIZE,
  AI_KEYWORD_LIVE_UPDATE_CHUNK_SIZE,
  AI_KEYWORD_REQUEST_TIMEOUT_MS,
  createAiKeywordPrompt,
  createAiKeywordResponseSchema,
  createAiKeywordSystemPrompt,
  parseAiKeywordResponse,
  type AiKeywordResult,
  type AiKeywordTarget,
} from "@/features/ai-keywords/ai-keywords"
import {
  isAbortError,
  runBatchQueue,
  yieldToMainThread,
} from "@/features/ai-grouping/ai-grouping-runtime"
import type { IconGroup, IconReference } from "@/lib/icon-sorter-data"
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

type LanguageModelAvailability =
  | "unavailable"
  | "downloadable"
  | "downloading"
  | "available"

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
  ) => Promise<LanguageModelAvailability>
  create: (
    options: typeof MODEL_CAPABILITIES & {
      signal?: AbortSignal
      initialPrompts: Array<{ role: "system"; content: string }>
      monitor: (monitor: {
        addEventListener: (
          type: "downloadprogress",
          listener: (event: { loaded: number }) => void
        ) => void
      }) => void
    }
  ) => Promise<LanguageModelSession>
}

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
    title: "English AI keywords",
    local: "Runs locally",
    description: (count: string) =>
      `Generate English search keywords for ${count} saved icons that currently have none.`,
    start: "Generate missing keywords",
    retry: "Retry missing keywords",
    pause: "Pause",
    resume: "Resume",
    stop: "Stop",
    updated: "Updated",
    failed: "Needs retry",
    remaining: "Remaining",
    unavailable:
      "Built-in AI is unavailable. Use Chrome 148 or newer on a supported desktop device with the Prompt API enabled.",
    error: (message: string) => `Keyword generation failed: ${message}`,
    status: {
      idle: "Ready",
      checking: "Checking browser AI availability…",
      downloading: "Downloading the browser AI model…",
      preparing: "Preparing the local model…",
      running: "Generating English keywords…",
      pausing: "Finishing the current batch…",
      paused: "Paused",
      stopped: "Stopped",
      completed: "Keyword generation complete",
      unavailable: "Browser AI unavailable",
      error: "Keyword generation failed",
    } satisfies Record<KeywordStatus, string>,
  },
  hu: {
    title: "Angol AI kulcsszavak",
    local: "Helyben fut",
    description: (count: string) =>
      `Angol keresési kulcsszavak készítése ${count} olyan mentett ikonhoz, amelynek még nincs kulcsszava.`,
    start: "Hiányzó kulcsszavak készítése",
    retry: "Hiányzó kulcsszavak újrapróbálása",
    pause: "Szünet",
    resume: "Folytatás",
    stop: "Leállítás",
    updated: "Frissítve",
    failed: "Újrapróbálandó",
    remaining: "Hátralévő",
    unavailable:
      "A beépített AI nem érhető el. Használj Chrome 148 vagy újabb verziót támogatott asztali gépen, engedélyezett Prompt API-val.",
    error: (message: string) => `A kulcsszavak készítése sikertelen: ${message}`,
    status: {
      idle: "Indításra kész",
      checking: "A böngésző AI elérhetőségének ellenőrzése…",
      downloading: "A böngésző AI modelljének letöltése…",
      preparing: "A helyi modell előkészítése…",
      running: "Angol kulcsszavak készítése…",
      pausing: "Az aktuális köteg befejezése…",
      paused: "Szüneteltetve",
      stopped: "Leállítva",
      completed: "A kulcsszavak elkészültek",
      unavailable: "A böngésző AI nem érhető el",
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

async function generateKeywordBatch(
  session: LanguageModelSession,
  icons: readonly AiKeywordTarget[],
  groups: IconGroup[],
  signal: AbortSignal
): Promise<BatchResult> {
  let clone: LanguageModelSession | null = null

  try {
    clone = await session.clone({ signal })
    const inputIcons = [...icons]
    const response = await clone.prompt(
      createAiKeywordPrompt(inputIcons, groups),
      {
        signal,
        responseConstraint: createAiKeywordResponseSchema(inputIcons),
      }
    )

    return parseAiKeywordResponse(response, inputIcons)
  } finally {
    clone?.destroy()
  }
}

export function AiKeywordsPanel() {
  const { data, updateIconsKeywords } = useIconSorter()
  const { i18n } = useTranslation()
  const language = i18n.language.startsWith("hu") ? "hu" : "en"
  const locale = language === "hu" ? "hu-HU" : "en-US"
  const copy = COPY[language]

  const [status, setStatus] = useState<KeywordStatus>("idle")
  const [downloadProgress, setDownloadProgress] = useState(0)
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
  const sessionRef = useRef<LanguageModelSession | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const pauseRequestedRef = useRef(false)
  const stopRequestedRef = useRef(false)
  const runningRef = useRef(false)

  const iconsWithoutKeywords = useMemo(
    () =>
      data.icons
        .filter((icon) => icon.keywords.length === 0)
        .map(({ type, name, groupId }) => ({ type, name, groupId })),
    [data.icons]
  )

  const percentage = progress.total
    ? Math.min((progress.processed / progress.total) * 100, 100)
    : 0

  const destroySession = useCallback(() => {
    sessionRef.current?.destroy()
    sessionRef.current = null
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
    const groups = groupsRef.current
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
        generateKeywordBatch(session, batch, groups, batchSignal),
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
    destroySession()
  }, [applyResults, destroySession])

  const beginRun = useCallback(async () => {
    if (runningRef.current) {
      return
    }

    const queue = iconsWithoutKeywords
    if (queue.length === 0) {
      setProgress({ total: 0, processed: 0, updated: 0, failed: 0 })
      setStatus("completed")
      return
    }

    const factory = getLanguageModelFactory()
    if (!factory) {
      setStatus("unavailable")
      return
    }

    runningRef.current = true
    pauseRequestedRef.current = false
    stopRequestedRef.current = false
    setErrorMessage("")
    setCurrentResult(null)
    setDownloadProgress(0)
    setProgress({
      total: queue.length,
      processed: 0,
      updated: 0,
      failed: 0,
    })
    queueRef.current = queue
    cursorRef.current = 0
    groupsRef.current = data.groups

    const controller = new AbortController()
    abortRef.current = controller

    try {
      setStatus("checking")
      const availability = await factory.availability(MODEL_CAPABILITIES)
      if (availability === "unavailable") {
        setStatus("unavailable")
        return
      }

      setStatus(
        availability === "downloadable" || availability === "downloading"
          ? "downloading"
          : "preparing"
      )
      sessionRef.current = await factory.create({
        ...MODEL_CAPABILITIES,
        signal: controller.signal,
        initialPrompts: [
          {
            role: "system",
            content: createAiKeywordSystemPrompt(),
          },
        ],
        monitor(monitor) {
          monitor.addEventListener("downloadprogress", (event) => {
            setDownloadProgress(Math.round(event.loaded * 100))
          })
        },
      })

      setStatus("running")
      await runQueue()
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) {
        setStatus(stopRequestedRef.current ? "stopped" : "paused")
      } else {
        setErrorMessage(error instanceof Error ? error.message : String(error))
        setStatus("error")
      }
      destroySession()
    } finally {
      abortRef.current = null
      runningRef.current = false
    }
  }, [data.groups, destroySession, iconsWithoutKeywords, runQueue])

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
      destroySession()
    } finally {
      abortRef.current = null
      runningRef.current = false
    }
  }, [destroySession, runQueue])

  function pauseRun() {
    pauseRequestedRef.current = true
    setStatus("pausing")
  }

  function stopRun() {
    stopRequestedRef.current = true
    pauseRequestedRef.current = false
    abortRef.current?.abort()
    destroySession()
    setStatus("stopped")
  }

  useEffect(
    () => () => {
      abortRef.current?.abort()
      destroySession()
    },
    [destroySession]
  )

  const isBusy =
    status === "checking" ||
    status === "downloading" ||
    status === "preparing" ||
    status === "running" ||
    status === "pausing"
  const canStart = !isBusy && status !== "paused"

  return (
    <section className="overflow-hidden rounded-xl border bg-background">
      <div className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
        <div className="grid min-w-0 flex-1 gap-1">
          <div className="flex items-center gap-2 font-medium">
            <KeyRound className="size-4" />
            {copy.title}
            <Badge className="bg-background">{copy.local}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {copy.description(
              iconsWithoutKeywords.length.toLocaleString(locale)
            )}
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
            disabled={!canStart || iconsWithoutKeywords.length === 0}
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
              : copy.start}
          </Button>
        )}
      </div>

      {status !== "idle" && (
        <div className="grid gap-4 border-t p-4 sm:p-5" aria-live="polite">
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium">{copy.status[status]}</span>
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
                <div className="truncate text-xs text-muted-foreground">
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
