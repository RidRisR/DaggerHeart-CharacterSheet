import { importCardPackFromSource } from "@/card/import/import-pipeline"
import type {
  CardImportDiagnostic,
  CardImportMode,
  CardImportPipelineStage,
  CardImportSource,
  CardPackConflictContext,
  CardPackImportOptions,
  CardPackImportResult,
} from "@/card/import/types"
import { createCardPackId } from "./pack-id"
import type { CardPackRepository } from "./repository"
import type { CardRuntimeRefreshAdapter } from "./runtime-refresh-adapter"
import type {
  CardImportFinalCommitPlan,
  CardPackIntegrityIssue,
  CardPackStorageIssueCode,
  CardPackStorageSnapshot,
  CardPackStorageTransactionError,
  CardPackStorageTransactionResult,
} from "./storage-types"

export type CardPackApplicationDiagnostic =
  | CardImportDiagnostic
  | {
      severity: "error" | "warning"
      code: CardPackStorageIssueCode | "RUNTIME_REFRESH_FAILED"
      path: ""
      message: string
      value?: unknown
    }

export interface CardPackApplicationImportResult {
  success: boolean
  mode: CardImportMode
  stage: CardImportPipelineStage
  diagnostics: CardPackApplicationDiagnostic[]
  snapshot?: CardPackStorageSnapshot
  summary: {
    packId?: string
    name?: string
    version?: string
    author?: string
    cardCount: number
    imageCount: number
    warningCount: number
    errorCount: number
  }
  storageCommitted?: boolean
}

export interface CardPackLifecycleResult {
  success: boolean
  stage: "storageTransaction" | "runtimeRefresh"
  storageCommitted?: boolean
  diagnostics: CardPackApplicationDiagnostic[]
  snapshot?: CardPackStorageSnapshot
}

export interface CardPackInitializeResult extends CardPackLifecycleResult {
  stage: "runtimeRefresh"
  storageCommitted: false
  snapshot: CardPackStorageSnapshot
}

export interface CardPackApplicationService {
  initialize(): Promise<CardPackInitializeResult>
  loadSnapshot(): Promise<CardPackStorageSnapshot>
  buildConflictContext(snapshot: CardPackStorageSnapshot): CardPackConflictContext
  importFromSource(
    source: CardImportSource,
    options?: CardPackImportOptions,
  ): Promise<CardPackApplicationImportResult>
  removePack(packId: string): Promise<CardPackLifecycleResult>
  setPackDisabled(packId: string, disabled: boolean): Promise<CardPackLifecycleResult>
}

export interface CreateCardPackApplicationServiceInput {
  repository: CardPackRepository
  runtimeRefresh: CardRuntimeRefreshAdapter
  builtinTemplateIds: Set<string>
  maxCustomPackCount?: number
  createPackId?: (input: { now: Date; random: () => number; exists: (candidate: string) => boolean }) => string | null
  now?: () => Date
  random?: () => number
}

const DEFAULT_MAX_CUSTOM_PACK_COUNT = 50

function countDiagnostics(diagnostics: CardPackApplicationDiagnostic[]) {
  return {
    warningCount: diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length,
    errorCount: diagnostics.filter((diagnostic) => diagnostic.severity === "error").length,
  }
}

function createPackIdGenerationDiagnostic(): CardPackApplicationDiagnostic {
  return {
    severity: "error",
    code: "PACK_ID_GENERATION_FAILED",
    path: "",
    message: "Unable to generate a unique card pack id.",
  }
}

function storageErrorToDiagnostic(error: CardPackStorageTransactionError): CardPackApplicationDiagnostic {
  return {
    severity: "error",
    code: error.code,
    path: "",
    message: error.message,
    value: error.value,
  }
}

function isBlockingIntegrityIssue(issue: CardPackIntegrityIssue): boolean {
  return (
    issue.code === "INDEX_READ_FAILED" ||
    issue.code === "INDEX_PARSE_FAILED" ||
    issue.code === "INDEX_FORMAT_INVALID" ||
    issue.code === "INDEX_WRITE_FAILED" ||
    issue.code === "PACK_DATA_READ_FAILED" ||
    issue.code === "PACK_DATA_PARSE_FAILED" ||
    issue.code === "PACK_DATA_FORMAT_INVALID" ||
    issue.code === "PACK_ID_CONFLICT" ||
    issue.code === "TEMPLATE_ID_CONFLICT" ||
    issue.code === "STORAGE_WRITE_FAILED" ||
    issue.code === "CONTENT_WRITE_FAILED" ||
    issue.code === "STORAGE_SERIALIZE_FAILED" ||
    issue.code === "STORAGE_QUOTA_EXCEEDED" ||
    issue.code === "IMAGE_DB_UNAVAILABLE" ||
    issue.code === "IMAGE_WRITE_FAILED" ||
    issue.code === "IMAGE_DELETE_FAILED" ||
    issue.code === "ROLLBACK_FAILED"
  )
}

function storageIssueToDiagnostic(issue: CardPackIntegrityIssue): CardPackApplicationDiagnostic {
  return {
    severity: isBlockingIntegrityIssue(issue) ? "error" : "warning",
    code: issue.code,
    path: "",
    message: issue.message,
    value: issue.value,
  }
}

function storageFailureDiagnostics(result: Extract<CardPackStorageTransactionResult, { ok: false }>) {
  const diagnostics = [storageErrorToDiagnostic(result.error)]

  for (const issue of result.issues) {
    if (issue.code === result.error.code && issue.message === result.error.message) continue
    diagnostics.push(storageIssueToDiagnostic(issue))
  }

  return diagnostics
}

function runtimeFailureDiagnostic(result: Awaited<ReturnType<CardRuntimeRefreshAdapter["refresh"]>>): CardPackApplicationDiagnostic[] {
  if (result.ok) return []

  return [
    {
      severity: "error",
      code: result.diagnostic?.code ?? "RUNTIME_REFRESH_FAILED",
      path: "",
      message: result.diagnostic?.message ?? "Card runtime refresh failed.",
      value: result.diagnostic?.value,
    },
  ]
}

function withImportLifecycleFailure(
  result: CardPackImportResult,
  input: {
    stage: CardImportPipelineStage
    storageCommitted: boolean
    diagnostics: CardPackApplicationDiagnostic[]
    packId?: string
    snapshot?: CardPackStorageSnapshot
  },
): CardPackApplicationImportResult {
  const diagnostics = [...result.diagnostics, ...input.diagnostics]
  const counts = countDiagnostics(diagnostics)

  return {
    ...result,
    success: false,
    stage: input.stage,
    storageCommitted: input.storageCommitted,
    snapshot: input.snapshot,
    diagnostics,
    summary: {
      ...result.summary,
      packId: input.packId,
      ...counts,
    },
  }
}

function withImportLifecycleSuccess(
  result: CardPackImportResult,
  input: {
    packId: string
    snapshot: CardPackStorageSnapshot
    diagnostics?: CardPackApplicationDiagnostic[]
  },
): CardPackApplicationImportResult {
  const diagnostics = [...result.diagnostics, ...(input.diagnostics ?? [])]
  const counts = countDiagnostics(diagnostics)

  return {
    ...result,
    success: true,
    stage: "runtimeRefresh",
    storageCommitted: true,
    snapshot: input.snapshot,
    diagnostics,
    summary: {
      ...result.summary,
      packId: input.packId,
      ...counts,
    },
  }
}

async function refreshRuntime(
  runtimeRefresh: CardRuntimeRefreshAdapter,
  snapshot: CardPackStorageSnapshot,
  diagnostics: CardPackApplicationDiagnostic[] = [],
): Promise<CardPackLifecycleResult> {
  const refresh = await runtimeRefresh.refresh(snapshot)

  if (!refresh.ok) {
    return {
      success: false,
      stage: "runtimeRefresh",
      storageCommitted: true,
      snapshot,
      diagnostics: [...diagnostics, ...runtimeFailureDiagnostic(refresh)],
    }
  }

  return {
    success: true,
    stage: "runtimeRefresh",
    storageCommitted: true,
    snapshot,
    diagnostics,
  }
}

export function createCardPackApplicationService(input: CreateCardPackApplicationServiceInput): CardPackApplicationService {
  const now = input.now ?? (() => new Date())
  const random = input.random ?? Math.random
  const maxCustomPackCount = input.maxCustomPackCount ?? DEFAULT_MAX_CUSTOM_PACK_COUNT
  const createPackId = input.createPackId ?? createCardPackId

  function buildConflictContext(snapshot: CardPackStorageSnapshot): CardPackConflictContext {
    const importedTemplateIds = new Set<string>()
    const importedTemplateSources = new Map<string, { packId?: string }>()

    for (const entry of snapshot.packs.values()) {
      for (const templateId of entry.templateIds) {
        importedTemplateIds.add(templateId)
        importedTemplateSources.set(templateId, { packId: entry.packId })
      }
    }

    return {
      builtinTemplateIds: new Set(input.builtinTemplateIds),
      importedTemplateIds,
      importedTemplateSources,
      customPackCount: snapshot.packCount,
      maxCustomPackCount,
    }
  }

  async function initialize(): Promise<CardPackInitializeResult> {
    const integrity = await input.repository.ensureIntegrity()
    const snapshot = await input.repository.loadSnapshot()
    const diagnostics = integrity.issues.map(storageIssueToDiagnostic)
    const refresh = await input.runtimeRefresh.refresh(snapshot)

    if (!refresh.ok) {
      return {
        success: false,
        stage: "runtimeRefresh",
        storageCommitted: false,
        snapshot,
        diagnostics: [...diagnostics, ...runtimeFailureDiagnostic(refresh)],
      }
    }

    return {
      success: true,
      stage: "runtimeRefresh",
      storageCommitted: false,
      snapshot,
      diagnostics,
    }
  }

  async function loadSnapshot(): Promise<CardPackStorageSnapshot> {
    return input.repository.loadSnapshot()
  }

  async function importFromSource(
    source: CardImportSource,
    options: CardPackImportOptions = {},
  ): Promise<CardPackApplicationImportResult> {
    if ((options.mode ?? "dryRun") === "dryRun") {
      return importCardPackFromSource(source, options)
    }

    const storageSnapshot = await input.repository.loadSnapshot()
    const pipelineResult = await importCardPackFromSource(source, options, {
      conflictContext: buildConflictContext(storageSnapshot),
    })

    if (pipelineResult.mode === "dryRun") {
      return pipelineResult
    }

    if (!pipelineResult.success || pipelineResult.stage !== "stageImportData" || !pipelineResult.draft) {
      return pipelineResult
    }

    const commitNow = now()
    const packId = createPackId({
      now: commitNow,
      random,
      exists: (candidate) => storageSnapshot.packs.has(candidate),
    })

    if (!packId) {
      return withImportLifecycleFailure(pipelineResult, {
        stage: "buildCommitPlan",
        storageCommitted: false,
        diagnostics: [createPackIdGenerationDiagnostic()],
      })
    }

    const commitPlan: CardImportFinalCommitPlan = {
      packId,
      packData: pipelineResult.draft.packData,
      templateIds: pipelineResult.draft.templateIds,
      source: pipelineResult.draft.source,
      importedAt: commitNow.toISOString(),
      disabled: false,
      assets: {
        cardImages: pipelineResult.draft.assets.cardImages,
      },
    }
    const transaction = await input.repository.commitImport(commitPlan)

    if (!transaction.ok) {
      return withImportLifecycleFailure(pipelineResult, {
        stage: "storageTransaction",
        storageCommitted: false,
        diagnostics: storageFailureDiagnostics(transaction),
        packId,
        snapshot: transaction.snapshot,
      })
    }

    const transactionDiagnostics = transaction.issues.map(storageIssueToDiagnostic)
    const blockingTransactionDiagnostics = transactionDiagnostics.filter(
      (diagnostic) => diagnostic.severity === "error",
    )
    if (blockingTransactionDiagnostics.length > 0) {
      return withImportLifecycleFailure(pipelineResult, {
        stage: "storageTransaction",
        storageCommitted: true,
        diagnostics: blockingTransactionDiagnostics,
        packId,
        snapshot: transaction.snapshot,
      })
    }

    const refresh = await input.runtimeRefresh.refresh(transaction.snapshot)
    if (!refresh.ok) {
      const rollback = await input.repository.removePack(packId)
      const diagnostics = [...transactionDiagnostics, ...runtimeFailureDiagnostic(refresh)]

      if (!rollback.ok) {
        return withImportLifecycleFailure(pipelineResult, {
          stage: "runtimeRefresh",
          storageCommitted: true,
          diagnostics: [...diagnostics, ...storageFailureDiagnostics(rollback)],
          packId,
          snapshot: transaction.snapshot,
        })
      }

      return withImportLifecycleFailure(pipelineResult, {
        stage: "runtimeRefresh",
        storageCommitted: false,
        diagnostics,
        packId,
        snapshot: rollback.snapshot,
      })
    }

    return withImportLifecycleSuccess(pipelineResult, {
      packId,
      snapshot: transaction.snapshot,
      diagnostics: transactionDiagnostics,
    })
  }

  async function removePack(packId: string): Promise<CardPackLifecycleResult> {
    const transaction = await input.repository.removePack(packId)

    if (!transaction.ok) {
      return {
        success: false,
        stage: "storageTransaction",
        storageCommitted: false,
        snapshot: transaction.snapshot,
        diagnostics: storageFailureDiagnostics(transaction),
      }
    }

    const transactionDiagnostics = transaction.issues.map(storageIssueToDiagnostic)
    const blockingTransactionDiagnostics = transactionDiagnostics.filter(
      (diagnostic) => diagnostic.severity === "error",
    )
    if (blockingTransactionDiagnostics.length > 0) {
      return {
        success: false,
        stage: "storageTransaction",
        storageCommitted: true,
        snapshot: transaction.snapshot,
        diagnostics: blockingTransactionDiagnostics,
      }
    }

    return refreshRuntime(input.runtimeRefresh, transaction.snapshot, transactionDiagnostics)
  }

  async function setPackDisabled(packId: string, disabled: boolean): Promise<CardPackLifecycleResult> {
    const transaction = await input.repository.setPackDisabled(packId, disabled)

    if (!transaction.ok) {
      return {
        success: false,
        stage: "storageTransaction",
        storageCommitted: false,
        snapshot: transaction.snapshot,
        diagnostics: storageFailureDiagnostics(transaction),
      }
    }

    const transactionDiagnostics = transaction.issues.map(storageIssueToDiagnostic)
    const blockingTransactionDiagnostics = transactionDiagnostics.filter(
      (diagnostic) => diagnostic.severity === "error",
    )
    if (blockingTransactionDiagnostics.length > 0) {
      return {
        success: false,
        stage: "storageTransaction",
        storageCommitted: true,
        snapshot: transaction.snapshot,
        diagnostics: blockingTransactionDiagnostics,
      }
    }

    return refreshRuntime(input.runtimeRefresh, transaction.snapshot, transactionDiagnostics)
  }

  return {
    initialize,
    loadSnapshot,
    buildConflictContext,
    importFromSource,
    removePack,
    setPackDisabled,
  }
}
