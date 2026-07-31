import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { LoaderCircle, Pause, Play, Sparkles, Square } from "lucide-react"
import { useTranslation } from "react-i18next"

import { IconPreview } from "@/components/icon-preview"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AI_GROUPING_BATCH_SIZE,
  AI_GROUPING_MIN_BATCH_SIZE,
  DEFAULT_AI_GROUPS,
  classifyIconsByRules,
  createAiGroupingPrompt,
  createAiGroupingResponseSchema,
  createAiGroupingSystemPrompt,
  parseAiGroupingResponse,
  type AiGroupingSource,
  type AiIconClassification,
} from "@/features/ai-grouping/ai-grouping"
import { iconCatalog } from "@/lib/icon-catalog"
import {
  iconId,
  type IconGroup,
  type IconReference,
} from "@/lib/icon-sorter-data"
import {
  DEFAULT_ICON_COLOR,
  useIconSorter,
} from "@/lib/icon-sorter-store"

const MODEL_CAPABILITIES = {
  expectedInputs: [{ type: "text", languages: ["en"] }],
  expectedOutputs: [{ type: "text", languages: ["en"] }],
} as const

const LIVE_UPDATE_CHUNK_SIZE = 64

type AiGroupingStatus =
  | "idle"
  | "rules"
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
      initialPrompts: Array<{
        role: "system"
        content: string
      }>
      monitor: (monitor: {
        addEventListener: (
          type: "downloadprogress",
          listener: (event: { loaded: number }) => void
        ) => void
      }) => void
    }
  ) => Promise<LanguageModelSession>
}

type AiProgress = {
  total: number
  processed: number
  assignedByRules: number
  assignedByAi: number
  failed: number
}

type AiCopy = {
  title: string
  local: string
  description: (count: string) => string
  start: string
  retry: string
  pause: string
  resume: string
  stop: string
  rules: string
  ai: string
  failed: string
  remaining: string
  unavailable: string
  error: (message: string) => string
  status: Record<AiGroupingStatus, string>
  source: Record<AiGroupingSource, string>
}

type BatchResult = {
  classifications: AiIconClassification[]
  missingIcons: IconReference[]
}

const AI_COPY: Record<"en" | "hu", AiCopy> = {
  en: {
    title: "AI grouping",
    local: "Runs locally",
    description: (count) =>
      `Group ${count} remaining icons with instant name rules, then use Chrome's built-in AI only for ambiguous names. Keywords are left empty.`,
    start: "Start fast grouping",
    retry: "Group remaining icons",
    pause: "Pause",
    resume: "Resume",
    stop: "Stop",
    rules: "Rule grouped",
    ai: "AI grouped",
    failed: "Needs retry",
    remaining: "Remaining",
    unavailable:
      "Built-in AI is unavailable. Obvious icons were still grouped with local rules; use Chrome 148 or newer to classify the remaining ambiguous icons.",
    error: (message) => `AI grouping failed: ${message}`,
    status: {
      idle: "Ready",
      rules: "Applying fast local grouping rules…",
      checking: "Checking browser AI availability…",
      downloading: "Downloading the browser AI model…",
      preparing: "Preparing the local model…",
      running: "Classifying ambiguous icons…",
      pausing: "Finishing the current batch…",
      paused: "Paused",
      stopped: "Stopped",
      completed: "Grouping complete",
      unavailable: "Browser AI unavailable",
      error: "Grouping failed",
    },
    source: {
      rule: "Local rule",
      ai: "Browser AI",
    },
  },
  hu: {
    title: "AI csoportosítás",
    local: "Helyben fut",
    description: (count) =>
      `${count} hátralévő ikon gyors csoportosítása névszabályokkal, majd csak a bizonytalan neveknél a Chrome beépített AI-jával. Kulcsszavakat nem hoz létre.`,
    start: "Gyors csoportosítás indítása",
    retry: "Hátralévő ikonok csoportosítása",
    pause: "Szünet",
    resume: "Folytatás",
    stop: "Leállítás",
    rules: "Szabállyal rendezve",
    ai: "AI-val rendezve",
    failed: "Újrapróbálandó",
    remaining: "Hátralévő",
    unavailable:
      "A beépített AI nem érhető el. Az egyértelmű ikonokat a helyi szabályok így is csoportosították; a bizonytalan ikonokhoz Chrome 148 vagy újabb verzió szükséges.",
    error: (message) => `Az AI csoportosítás sikertelen: ${message}`,
    status: {
      idle: "Indításra kész",
      rules: "Gyors helyi csoportosítási szabályok alkalmazása…",
      checking: "A böngésző AI elérhetőségének ellenőrzése…",
      downloading: "A böngésző AI modelljének letöltése…",
      preparing: "A helyi modell előkészítése…",
      running: "Bizonytalan ikonok csoportosítása…",
      pausing: "Az aktuális köteg befejezése…",
      paused: "Szüneteltetve",
      stopped: "Leállítva",
      completed: "A csoportosítás elkészült",
      unavailable: "A böngésző AI nem érhető el",
      error: "A csoportosítás sikertelen",
    },
    source: {
      rule: "Helyi szabály",
      ai: "Böngésző AI",
    },
  },
}

function getLanguageModelFactory() {
  return (
    globalThis as typeof globalThis & {
      LanguageModel?: LanguageModelFactory
    }
  ).LanguageModel
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError"
}

function nextPaint() {
  return new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
}

async function classifyAiBatch(
  session: LanguageModelSession,
  icons: IconReference[],
  groups: IconGroup[],
  signal: AbortSignal
): Promise<BatchResult> {
  let clone: LanguageModelSession | null = null

  try {
    clone = await session.clone({ signal })
    const response = await clone.prompt(createAiGroupingPrompt(icons), {
      signal,
      responseConstraint: createAiGroupingResponseSchema(icons, groups),
    })
    clone.destroy()
    clone = null
    const parsed = parseAiGroupingResponse(response, icons, groups)

    if (
      parsed.missingIcons.length === 0 ||
      icons.length <= AI_GROUPING_MIN_BATCH_SIZE
    ) {
      return parsed
    }

    const retry = await classifyAiBatch(
      session,
      parsed.missingIcons,
      groups,
      signal
    )
    return {
      classifications: [...parsed.classifications, ...retry.classifications],
      missingIcons: retry.missingIcons,
    }
  } catch (error) {
    if (isAbortError(error) || signal.aborted) {
      throw error
    }

    if (icons.length <= AI_GROUPING_MIN_BATCH_SIZE) {
      return { classifications: [], missingIcons: icons }
    }

    const midpoint = Math.ceil(icons.length / 2)
    const left = await classifyAiBatch(
      session,
      icons.slice(0, midpoint),
      groups,
      signal
    )
    const right = await classifyAiBatch(
      session,
      icons.slice(midpoint),
      groups,
      signal
    )
    return {
      classifications: [...left.classifications, ...right.classifications],
      missingIcons: [...left.missingIcons, ...right.missingIcons],
    }
  } finally {
    clone?.destroy()
  }
}

export function AiGroupingPanel() {
  const { data, assignIcons, ensureGroups } = useIconSorter()
  const { i18n } = useTranslation()
  const language = i18n.language.startsWith("hu") ? "hu" : "en"
  const locale = language === "hu" ? "hu-HU" : "en-US"
  const copy = AI_COPY[language]
  const [status, setStatus] = useState<AiGroupingStatus>("idle")
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [progress, setProgress] = useState<AiProgress>({
    total: 0,
    processed: 0,
    assignedByRules: 0,
    assignedByAi: 0,
    failed: 0,
  })
  const [currentResult, setCurrentResult] =
    useState<AiIconClassification | null>(null)
  const [errorMessage, setErrorMessage] = useState("")

  const queueRef = useRef<IconReference[]>([])
  const cursorRef = useRef(0)
  const groupsRef = useRef<IconGroup[]>([])
  const sessionRef = useRef<LanguageModelSession | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const pauseRequestedRef = useRef(false)
  const stopRequestedRef = useRef(false)
  const runningRef = useRef(false)

  const remainingIcons = useMemo(() => {
    const reviewed = new Set(data.reviewedIcons.map(iconId))
    return iconCatalog.filter((icon) => !reviewed.has(iconId(icon)))
  }, [data.reviewedIcons])

  const currentGroupName = currentResult
    ? groupsRef.current.find((group) => group.id === currentResult.groupId)?.name
    : undefined
  const percentage = progress.total
    ? Math.min((progress.processed / progress.total) * 100, 100)
    : 0

  const destroySession = useCallback(() => {
    sessionRef.current?.destroy()
    sessionRef.current = null
  }, [])

  const applyClassifications = useCallback(
    async (
      classifications: AiIconClassification[],
      signal: AbortSignal
    ) => {
      for (
        let index = 0;
        index < classifications.length;
        index += LIVE_UPDATE_CHUNK_SIZE
      ) {
        if (signal.aborted) {
          throw new DOMException("Grouping aborted", "AbortError")
        }

        const chunk = classifications.slice(
          index,
          index + LIVE_UPDATE_CHUNK_SIZE
        )
        assignIcons(
          chunk.map((classification) => ({
            type: classification.type,
            name: classification.name,
            groupId: classification.groupId,
            keywords: [],
            color: DEFAULT_ICON_COLOR,
          }))
        )

        const ruleCount = chunk.filter(
          (classification) => classification.source === "rule"
        ).length
        const aiCount = chunk.length - ruleCount
        setCurrentResult(chunk.at(-1) ?? null)
        setProgress((current) => ({
          ...current,
          processed: current.processed + chunk.length,
          assignedByRules: current.assignedByRules + ruleCount,
          assignedByAi: current.assignedByAi + aiCount,
        }))
        await nextPaint()
      }
    },
    [assignIcons]
  )

  const runAiQueue = useCallback(async () => {
    const session = sessionRef.current
    const groups = groupsRef.current
    const signal = abortRef.current?.signal
    if (!session || !signal) {
      throw new Error("missing-ai-session")
    }

    while (cursorRef.current < queueRef.current.length) {
      if (pauseRequestedRef.current) {
        setStatus("paused")
        return
      }

      const batch = queueRef.current.slice(
        cursorRef.current,
        cursorRef.current + AI_GROUPING_BATCH_SIZE
      )
      const result = await classifyAiBatch(session, batch, groups, signal)

      if (result.classifications.length > 0) {
        await applyClassifications(result.classifications, signal)
      }

      if (result.missingIcons.length > 0) {
        setProgress((current) => ({
          ...current,
          processed: current.processed + result.missingIcons.length,
          failed: current.failed + result.missingIcons.length,
        }))
      }

      cursorRef.current += batch.length
    }

    setStatus("completed")
    destroySession()
  }, [applyClassifications, destroySession])

  const beginRun = useCallback(async () => {
    if (runningRef.current) {
      return
    }

    const queue = remainingIcons
    if (queue.length === 0) {
      setProgress({
        total: 0,
        processed: 0,
        assignedByRules: 0,
        assignedByAi: 0,
        failed: 0,
      })
      setStatus("completed")
      return
    }

    runningRef.current = true
    stopRequestedRef.current = false
    pauseRequestedRef.current = false
    setErrorMessage("")
    setCurrentResult(null)
    setDownloadProgress(0)
    setProgress({
      total: queue.length,
      processed: 0,
      assignedByRules: 0,
      assignedByAi: 0,
      failed: 0,
    })

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const groups =
        data.groups.length > 0
          ? data.groups
          : ensureGroups([...DEFAULT_AI_GROUPS])
      groupsRef.current = groups

      setStatus("rules")
      const ruleResult = classifyIconsByRules(queue, groups)
      await applyClassifications(ruleResult.classifications, controller.signal)

      queueRef.current = ruleResult.unresolvedIcons
      cursorRef.current = 0
      if (queueRef.current.length === 0) {
        setStatus("completed")
        return
      }

      const factory = getLanguageModelFactory()
      if (!factory) {
        setStatus("unavailable")
        return
      }

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
            content: createAiGroupingSystemPrompt(groups),
          },
        ],
        monitor(monitor) {
          monitor.addEventListener("downloadprogress", (event) => {
            setDownloadProgress(Math.round(event.loaded * 100))
          })
        },
      })

      setStatus("running")
      await runAiQueue()
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
  }, [
    applyClassifications,
    data.groups,
    destroySession,
    ensureGroups,
    remainingIcons,
    runAiQueue,
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
      await runAiQueue()
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
  }, [destroySession, runAiQueue])

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
    status === "rules" ||
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
            <Sparkles className="size-4" />
            {copy.title}
            <Badge className="bg-background">{copy.local}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {copy.description(remainingIcons.length.toLocaleString(locale))}
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
            disabled={!canStart || remainingIcons.length === 0}
            onClick={() => void beginRun()}
          >
            {isBusy ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Sparkles />
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
            <div className="grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-4">
              <div className="rounded-lg border p-3">
                <div className="text-lg font-semibold">
                  {progress.assignedByRules.toLocaleString(locale)}
                </div>
                <div className="text-xs text-muted-foreground">{copy.rules}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-lg font-semibold">
                  {progress.assignedByAi.toLocaleString(locale)}
                </div>
                <div className="text-xs text-muted-foreground">{copy.ai}</div>
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
                <div className="text-sm">{currentGroupName}</div>
              </div>
              <Badge className="ml-auto shrink-0">
                {copy.source[currentResult.source]}
              </Badge>
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
          {(status === "rules" ||
            status === "checking" ||
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
