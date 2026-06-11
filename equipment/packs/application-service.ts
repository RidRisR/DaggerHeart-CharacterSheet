import { importEquipmentPackFromSource } from "@/equipment/import/import-pipeline"
import type {
  EquipmentPackConflictContext,
  EquipmentPackImportDiagnostic,
  EquipmentPackImportOptions,
  EquipmentPackImportPipelineStage,
  EquipmentPackImportResult,
  EquipmentPackImportSource,
} from "@/equipment/import/types"
import type {
  EquipmentRuntimeCacheBuildDiagnostic,
  EquipmentRuntimeCacheService,
  RuntimeEquipmentTemplate,
} from "@/equipment/runtime-cache/types"
import { createEquipmentPackId } from "./pack-id"
import type { EquipmentPackRepository } from "./repository"
import type {
  EquipmentPackFinalCommitPlan,
  EquipmentPackIntegrityIssue,
  EquipmentPackStorageIssueCode,
  EquipmentPackStorageSnapshot,
  EquipmentPackStorageTransactionError,
  EquipmentPackStorageTransactionResult,
} from "./storage-types"

export type EquipmentPackApplicationDiagnostic =
  | EquipmentPackImportDiagnostic
  | EquipmentPackLifecycleDiagnostic
  | {
      severity: "error"
      code: "PACK_ID_GENERATION_FAILED"
      path: ""
      message: string
      value?: unknown
    }

export type EquipmentPackApplicationImportResult = Omit<EquipmentPackImportResult, "diagnostics"> & {
  diagnostics: EquipmentPackApplicationDiagnostic[]
}

export interface EquipmentPackLifecycleResult {
  success: boolean
  stage: "storageTransaction" | "runtimeCacheBuild"
  storageCommitted?: boolean
  diagnostics: EquipmentPackLifecycleDiagnostic[]
}

export interface EquipmentPackInitializeResult extends EquipmentPackLifecycleResult {
  stage: "runtimeCacheBuild"
  storageCommitted: false
  snapshot: EquipmentPackStorageSnapshot
}

export interface EquipmentPackLifecycleDiagnostic {
  severity: "error" | "warning"
  code: EquipmentPackStorageIssueCode | "RUNTIME_CACHE_BUILD_FAILED" | "RUNTIME_CACHE_DUPLICATE_TEMPLATE_ID"
  path: ""
  message: string
  value?: unknown
}

export interface EquipmentPackApplicationService {
  initialize(): Promise<EquipmentPackInitializeResult>
  loadSnapshot(): Promise<EquipmentPackStorageSnapshot>
  buildConflictContext(snapshot: EquipmentPackStorageSnapshot): EquipmentPackConflictContext
  importFromSource(
    source: EquipmentPackImportSource,
    options: EquipmentPackImportOptions,
  ): Promise<EquipmentPackApplicationImportResult>
  removePack(packId: string): Promise<EquipmentPackLifecycleResult>
  setPackDisabled(packId: string, disabled: boolean): Promise<EquipmentPackLifecycleResult>
}

export interface CreateEquipmentPackApplicationServiceInput {
  repository: EquipmentPackRepository
  runtimeCacheService: EquipmentRuntimeCacheService
  builtinTemplates: RuntimeEquipmentTemplate[]
  maxCustomPackCount?: number
  now?: () => Date
  random?: () => number
}

const DEFAULT_MAX_CUSTOM_PACK_COUNT = 50

function countDiagnostics(diagnostics: EquipmentPackApplicationDiagnostic[]) {
  return {
    warningCount: diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length,
    errorCount: diagnostics.filter((diagnostic) => diagnostic.severity === "error").length,
  }
}

function createPackIdGenerationDiagnostic(): EquipmentPackApplicationDiagnostic {
  return {
    severity: "error",
    code: "PACK_ID_GENERATION_FAILED",
    path: "",
    message: "Unable to generate a unique equipment pack id.",
  }
}

function storageErrorToDiagnostic(error: EquipmentPackStorageTransactionError): EquipmentPackLifecycleDiagnostic {
  return {
    severity: "error",
    code: error.code,
    path: "",
    message: error.message,
    value: error.value,
  }
}

function storageIssueToDiagnostic(issue: EquipmentPackIntegrityIssue): EquipmentPackLifecycleDiagnostic {
  return {
    severity: isBlockingIntegrityIssue(issue) ? "error" : "warning",
    code: issue.code,
    path: "",
    message: issue.message,
    value: issue.value,
  }
}

function isBlockingIntegrityIssue(issue: EquipmentPackIntegrityIssue): boolean {
  return (
    issue.code === "INDEX_READ_FAILED" ||
    issue.code === "INDEX_PARSE_FAILED" ||
    issue.code === "INDEX_FORMAT_INVALID" ||
    issue.code === "PACK_DATA_READ_FAILED" ||
    issue.code === "TEMPLATE_ID_CONFLICT" ||
    issue.code === "STORAGE_WRITE_FAILED" ||
    issue.code === "ROLLBACK_FAILED"
  )
}

function storageFailureDiagnostics(result: Extract<EquipmentPackStorageTransactionResult, { ok: false }>) {
  const diagnostics = [storageErrorToDiagnostic(result.error)]

  for (const issue of result.issues) {
    if (issue.code === result.error.code && issue.message === result.error.message) continue
    diagnostics.push(storageIssueToDiagnostic(issue))
  }

  return diagnostics
}

function runtimeDiagnosticToLifecycleDiagnostic(
  diagnostic: EquipmentRuntimeCacheBuildDiagnostic,
): EquipmentPackLifecycleDiagnostic {
  return {
    severity: "error",
    code: diagnostic.code,
    path: "",
    message: diagnostic.message,
    value: diagnostic.value,
  }
}

function withImportLifecycleFailure(
  result: EquipmentPackImportResult,
  input: {
    stage: EquipmentPackImportPipelineStage
    storageCommitted: boolean
    diagnostics: EquipmentPackApplicationDiagnostic[]
    packId?: string
  },
): EquipmentPackApplicationImportResult {
  const diagnostics = [...result.diagnostics, ...input.diagnostics]
  const counts = countDiagnostics(diagnostics)

  return {
    ...result,
    success: false,
    stage: input.stage,
    storageCommitted: input.storageCommitted,
    diagnostics,
    summary: {
      ...result.summary,
      packId: input.packId ?? result.summary.packId,
      ...counts,
    },
  }
}

function withImportLifecycleSuccess(
  result: EquipmentPackImportResult,
  packId: string,
  lifecycleDiagnostics: EquipmentPackLifecycleDiagnostic[] = [],
): EquipmentPackApplicationImportResult {
  const diagnostics = [...result.diagnostics, ...lifecycleDiagnostics]
  const counts = countDiagnostics(diagnostics)

  return {
    ...result,
    success: true,
    stage: "runtimeCacheBuild",
    storageCommitted: true,
    diagnostics,
    summary: {
      ...result.summary,
      packId,
      ...counts,
    },
  }
}

function rebuildRuntimeCache(input: {
  runtimeCacheService: EquipmentRuntimeCacheService
  builtinTemplates: RuntimeEquipmentTemplate[]
  storageSnapshot: EquipmentPackStorageSnapshot
  diagnostics?: EquipmentPackLifecycleDiagnostic[]
}): EquipmentPackLifecycleResult {
  const result = input.runtimeCacheService.rebuild({
    builtinTemplates: input.builtinTemplates,
    storageSnapshot: input.storageSnapshot,
  })

  if (!result.ok) {
    return {
      success: false,
      stage: "runtimeCacheBuild",
      storageCommitted: true,
      diagnostics: [
        ...(input.diagnostics ?? []),
        runtimeDiagnosticToLifecycleDiagnostic(result.diagnostic),
      ],
    }
  }

  return {
    success: true,
    stage: "runtimeCacheBuild",
    storageCommitted: true,
    diagnostics: input.diagnostics ?? [],
  }
}

export function createEquipmentPackApplicationService(
  input: CreateEquipmentPackApplicationServiceInput,
): EquipmentPackApplicationService {
  const now = input.now ?? (() => new Date())
  const random = input.random ?? Math.random
  const maxCustomPackCount = input.maxCustomPackCount ?? DEFAULT_MAX_CUSTOM_PACK_COUNT

  function buildConflictContext(snapshot: EquipmentPackStorageSnapshot): EquipmentPackConflictContext {
    const importedTemplateIds = new Set<string>()
    const importedTemplateSources = new Map<string, { packId?: string }>()

    for (const entry of snapshot.packs.values()) {
      for (const template of [...entry.pack.weapons, ...entry.pack.armor]) {
        importedTemplateIds.add(template.id)
        importedTemplateSources.set(template.id, { packId: entry.packId })
      }
    }

    return {
      builtinTemplateIds: new Set(input.builtinTemplates.map((template) => template.id)),
      importedTemplateIds,
      importedTemplateSources,
      customPackCount: snapshot.packCount,
      maxCustomPackCount,
    }
  }

  async function initialize(): Promise<EquipmentPackInitializeResult> {
    const storageSnapshot = await input.repository.loadSnapshot()
    const result = input.runtimeCacheService.rebuild({
      builtinTemplates: input.builtinTemplates,
      storageSnapshot,
    })

    if (!result.ok) {
      return {
        success: false,
        stage: "runtimeCacheBuild",
        storageCommitted: false,
        snapshot: storageSnapshot,
        diagnostics: [runtimeDiagnosticToLifecycleDiagnostic(result.diagnostic)],
      }
    }

    return {
      success: true,
      stage: "runtimeCacheBuild",
      storageCommitted: false,
      snapshot: storageSnapshot,
      diagnostics: [],
    }
  }

  async function loadSnapshot(): Promise<EquipmentPackStorageSnapshot> {
    return input.repository.loadSnapshot()
  }

  async function importFromSource(
    source: EquipmentPackImportSource,
    options: EquipmentPackImportOptions,
  ): Promise<EquipmentPackApplicationImportResult> {
    const storageSnapshot = await input.repository.loadSnapshot()
    const pipelineResult = await importEquipmentPackFromSource(source, options, {
      conflictContext: buildConflictContext(storageSnapshot),
    })

    if (pipelineResult.mode === "dryRun") {
      return pipelineResult
    }

    if (!pipelineResult.success || pipelineResult.stage !== "stageImportData" || !pipelineResult.draft) {
      return pipelineResult
    }

    const commitNow = now()
    const packId = createEquipmentPackId({
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

    const commitPlan: EquipmentPackFinalCommitPlan = {
      packId,
      packData: pipelineResult.draft.packData,
      templateIds: pipelineResult.draft.templateIds,
      source: pipelineResult.draft.source,
      importedAt: commitNow.toISOString(),
      disabled: false,
    }
    const transaction = await input.repository.commitImport(commitPlan)

    if (!transaction.ok) {
      return withImportLifecycleFailure(pipelineResult, {
        stage: "storageTransaction",
        storageCommitted: false,
        diagnostics: storageFailureDiagnostics(transaction),
        packId,
      })
    }

    const transactionDiagnostics = transaction.issues.map(storageIssueToDiagnostic)
    const blockingTransactionDiagnostics = transactionDiagnostics.filter(
      (diagnostic) => diagnostic.severity === "error",
    )
    if (blockingTransactionDiagnostics.length > 0) {
      return withImportLifecycleFailure(pipelineResult, {
        stage: "runtimeCacheBuild",
        storageCommitted: true,
        diagnostics: blockingTransactionDiagnostics,
        packId,
      })
    }

    const rebuild = rebuildRuntimeCache({
      runtimeCacheService: input.runtimeCacheService,
      builtinTemplates: input.builtinTemplates,
      storageSnapshot: transaction.snapshot,
      diagnostics: transactionDiagnostics,
    })

    if (!rebuild.success) {
      return withImportLifecycleFailure(pipelineResult, {
        stage: "runtimeCacheBuild",
        storageCommitted: true,
        diagnostics: rebuild.diagnostics,
        packId,
      })
    }

    return withImportLifecycleSuccess(pipelineResult, packId, rebuild.diagnostics)
  }

  async function removePack(packId: string): Promise<EquipmentPackLifecycleResult> {
    const transaction = await input.repository.removePack(packId)

    if (!transaction.ok) {
      return {
        success: false,
        stage: "storageTransaction",
        storageCommitted: false,
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
        stage: "runtimeCacheBuild",
        storageCommitted: true,
        diagnostics: blockingTransactionDiagnostics,
      }
    }

    return rebuildRuntimeCache({
      runtimeCacheService: input.runtimeCacheService,
      builtinTemplates: input.builtinTemplates,
      storageSnapshot: transaction.snapshot,
      diagnostics: transactionDiagnostics,
    })
  }

  async function setPackDisabled(packId: string, disabled: boolean): Promise<EquipmentPackLifecycleResult> {
    const transaction = await input.repository.setPackDisabled(packId, disabled)

    if (!transaction.ok) {
      return {
        success: false,
        stage: "storageTransaction",
        storageCommitted: false,
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
        stage: "runtimeCacheBuild",
        storageCommitted: true,
        diagnostics: blockingTransactionDiagnostics,
      }
    }

    return rebuildRuntimeCache({
      runtimeCacheService: input.runtimeCacheService,
      builtinTemplates: input.builtinTemplates,
      storageSnapshot: transaction.snapshot,
      diagnostics: transactionDiagnostics,
    })
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
