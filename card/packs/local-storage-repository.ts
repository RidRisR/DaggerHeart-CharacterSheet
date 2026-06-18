import type { CardPackImageBackend } from "./image-backend"
import {
  CARD_PACK_STORAGE_KEYS,
  getCardPackStorageKey,
  type CardPackStorageAdapter,
} from "./local-storage-adapter"
import {
  projectCardImportToLegacyBatchStorage,
  type LegacyCardBatchIndexEntry,
  type LegacyCardBatchStoredData,
  type LegacyCardBatchStorageProjection,
} from "./legacy-storage-format-adapter"
import type { CardPackRepository } from "./repository"
import type {
  CardImageOwnershipIndex,
  CardImportFinalCommitPlan,
  CardPackIntegrityIssue,
  CardPackIntegrityReport,
  CardPackSnapshotEntry,
  CardPackStorageIssueCode,
  CardPackStorageSnapshot,
  CardPackStorageTransactionError,
  CardPackStorageTransactionResult,
} from "./storage-types"

interface LocalStorageCardPackRepositoryInput {
  storage: CardPackStorageAdapter
  images: CardPackImageBackend
  now?: () => Date
}

interface LegacyCardPackStorageIndex {
  batches: Record<string, LegacyCardBatchIndexEntry>
  totalCards: number
  totalBatches: number
  lastUpdate: string
}

interface RecoveryState {
  issues: CardPackIntegrityIssue[]
  removedIndexEntries: string[]
  removedOrphanPackKeys: string[]
  removedCorruptedPackKeys: string[]
  removedOrphanImagePackIds: string[]
  repairedByImageMigration: boolean
  canCleanupOrphans: boolean
}

interface RecoveredState {
  index: LegacyCardPackStorageIndex
  snapshot: CardPackStorageSnapshot
}

function createEmptyRecoveryState(): RecoveryState {
  return {
    issues: [],
    removedIndexEntries: [],
    removedOrphanPackKeys: [],
    removedCorruptedPackKeys: [],
    removedOrphanImagePackIds: [],
    repairedByImageMigration: false,
    canCleanupOrphans: true,
  }
}

function createEmptyIndex(updatedAt: string): LegacyCardPackStorageIndex {
  return {
    batches: {},
    totalCards: 0,
    totalBatches: 0,
    lastUpdate: updatedAt,
  }
}

function createIssue(input: {
  code: CardPackStorageIssueCode
  message: string
  packId?: string
  templateId?: string
  storageKey?: string
  value?: unknown
}): CardPackIntegrityIssue {
  return input
}

function createReport(state: RecoveryState): CardPackIntegrityReport {
  return {
    ok: state.issues.length === 0,
    repaired:
      state.repairedByImageMigration ||
      state.removedIndexEntries.length > 0 ||
      state.removedOrphanPackKeys.length > 0 ||
      state.removedCorruptedPackKeys.length > 0 ||
      state.removedOrphanImagePackIds.length > 0,
    issues: state.issues,
    removedIndexEntries: state.removedIndexEntries,
    removedOrphanPackKeys: state.removedOrphanPackKeys,
    removedCorruptedPackKeys: state.removedCorruptedPackKeys,
    removedOrphanImagePackIds: state.removedOrphanImagePackIds,
  }
}

function transactionError(
  code: CardPackStorageIssueCode,
  message: string,
  value?: unknown,
): CardPackStorageTransactionError {
  return { code, message, value }
}

function tryParseJson(raw: string): { ok: true; value: unknown } | { ok: false; error: unknown } {
  try {
    return { ok: true, value: JSON.parse(raw) }
  } catch (error) {
    return { ok: false, error }
  }
}

function safeStringify(value: unknown): { ok: true; value: string } | { ok: false; error: unknown } {
  try {
    return { ok: true, value: JSON.stringify(value) }
  } catch (error) {
    return { ok: false, error }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string"
}

function isLegacyIndexEntry(value: unknown): value is LegacyCardBatchIndexEntry {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.fileName === "string" &&
    typeof value.importTime === "string" &&
    isOptionalString(value.version) &&
    isOptionalString(value.author) &&
    typeof value.cardCount === "number" &&
    Array.isArray(value.cardTypes) &&
    value.cardTypes.every((cardType) => typeof cardType === "string") &&
    typeof value.size === "number" &&
    (value.isSystemBatch === undefined || typeof value.isSystemBatch === "boolean") &&
    (value.disabled === undefined || typeof value.disabled === "boolean")
  )
}

function isLegacyStoredData(value: unknown): value is LegacyCardBatchStoredData {
  return (
    isRecord(value) &&
    isRecord(value.metadata) &&
    typeof value.metadata.id === "string" &&
    typeof value.metadata.name === "string" &&
    typeof value.metadata.fileName === "string" &&
    typeof value.metadata.importTime === "string" &&
    Array.isArray(value.cards) &&
    value.cards.every((card) => isRecord(card) && typeof card.id === "string")
  )
}

function parseIndex(
  raw: string,
): { ok: true; index: LegacyCardPackStorageIndex } | { ok: false; code: CardPackStorageIssueCode; value?: unknown } {
  const parsed = tryParseJson(raw)
  if (!parsed.ok) {
    return { ok: false, code: "INDEX_PARSE_FAILED", value: parsed.error }
  }

  if (
    !isRecord(parsed.value) ||
    !isRecord(parsed.value.batches) ||
    typeof parsed.value.totalCards !== "number" ||
    typeof parsed.value.totalBatches !== "number" ||
    typeof parsed.value.lastUpdate !== "string"
  ) {
    return { ok: false, code: "INDEX_FORMAT_INVALID", value: parsed.value }
  }

  const batches: Record<string, LegacyCardBatchIndexEntry> = {}
  for (const [packId, entry] of Object.entries(parsed.value.batches)) {
    if (!isLegacyIndexEntry(entry)) {
      return { ok: false, code: "INDEX_FORMAT_INVALID", value: parsed.value }
    }
    batches[packId] = entry
  }

  return {
    ok: true,
    index: {
      batches,
      totalCards: parsed.value.totalCards,
      totalBatches: parsed.value.totalBatches,
      lastUpdate: parsed.value.lastUpdate,
    },
  }
}

function parsePackData(
  raw: string,
): { ok: true; storedData: LegacyCardBatchStoredData } | { ok: false; code: CardPackStorageIssueCode; value?: unknown } {
  const parsed = tryParseJson(raw)
  if (!parsed.ok) {
    return { ok: false, code: "PACK_DATA_PARSE_FAILED", value: parsed.error }
  }

  if (!isLegacyStoredData(parsed.value)) {
    return { ok: false, code: "PACK_DATA_FORMAT_INVALID", value: parsed.value }
  }

  return { ok: true, storedData: parsed.value }
}

function serializeIndex(
  index: LegacyCardPackStorageIndex,
): { ok: true; value: string } | { ok: false; code: CardPackStorageIssueCode; error: unknown } {
  const serialized = safeStringify(index)
  if (!serialized.ok) {
    return { ok: false, code: "STORAGE_SERIALIZE_FAILED", error: serialized.error }
  }

  return serialized
}

function serializePackData(
  data: LegacyCardBatchStoredData,
): { ok: true; value: string } | { ok: false; code: CardPackStorageIssueCode; error: unknown } {
  const serialized = safeStringify(data)
  if (!serialized.ok) {
    return { ok: false, code: "STORAGE_SERIALIZE_FAILED", error: serialized.error }
  }

  return serialized
}

function packIdFromStorageKey(key: string): string {
  return key.slice(CARD_PACK_STORAGE_KEYS.BATCH_PREFIX.length)
}

function createIndexFromEntries(
  entries: Iterable<LegacyCardBatchIndexEntry>,
  updatedAt: string,
): LegacyCardPackStorageIndex {
  const batches: Record<string, LegacyCardBatchIndexEntry> = {}
  let totalCards = 0

  for (const entry of entries) {
    batches[entry.id] = entry
    totalCards += entry.cardCount
  }

  return {
    batches,
    totalCards,
    totalBatches: Object.keys(batches).length,
    lastUpdate: updatedAt,
  }
}

function snapshotEntryFromStoredData(
  packId: string,
  indexEntry: LegacyCardBatchIndexEntry,
  storedData: LegacyCardBatchStoredData,
  imageTemplateIds: string[],
): CardPackSnapshotEntry {
  const templateIds = storedData.cards.map((card) => card.id)
  const mergedImageTemplateIds = Array.from(
    new Set([...(storedData.metadata.imageCardIds ?? []), ...imageTemplateIds]),
  )

  return {
    packId,
    importedAt: indexEntry.importTime,
    disabled: indexEntry.disabled ?? false,
    source: {
      originKind: "file",
      fileName: storedData.metadata.fileName,
      label: storedData.metadata.name,
    },
    templateIds,
    imageTemplateIds: mergedImageTemplateIds,
  }
}

function recordTemplateIdConflicts(packs: Map<string, CardPackSnapshotEntry>, state: RecoveryState) {
  const seen = new Map<string, string>()

  for (const [packId, entry] of packs) {
    for (const templateId of entry.templateIds) {
      const conflictingPackId = seen.get(templateId)
      if (!conflictingPackId) {
        seen.set(templateId, packId)
        continue
      }

      state.issues.push(
        createIssue({
          code: "TEMPLATE_ID_CONFLICT",
          packId,
          templateId,
          message: `Card template id ${templateId} already exists in another stored pack.`,
          value: { templateId, conflictingPackId },
        }),
      )
    }
  }
}

function buildImageOwnership(packs: Map<string, CardPackSnapshotEntry>): CardImageOwnershipIndex {
  const ownersByTemplateId = new Map<string, string[]>()

  for (const [packId, entry] of packs) {
    for (const templateId of entry.templateIds) {
      const owners = ownersByTemplateId.get(templateId) ?? []
      owners.push(packId)
      ownersByTemplateId.set(templateId, owners)
    }
  }

  return { ownersByTemplateId }
}

function findCommitTemplateIdConflict(
  current: CardPackStorageSnapshot,
  plan: CardImportFinalCommitPlan,
): CardPackIntegrityIssue | null {
  const planTemplateIds = new Set<string>()
  for (const templateId of plan.templateIds) {
    if (planTemplateIds.has(templateId)) {
      return createIssue({
        code: "TEMPLATE_ID_CONFLICT",
        packId: plan.packId,
        templateId,
        message: `Card template id ${templateId} appears more than once in the commit plan.`,
        value: { templateId, conflictingPackId: plan.packId },
      })
    }
    planTemplateIds.add(templateId)
  }

  for (const entry of current.packs.values()) {
    for (const templateId of entry.templateIds) {
      if (!planTemplateIds.has(templateId)) continue

      return createIssue({
        code: "TEMPLATE_ID_CONFLICT",
        packId: plan.packId,
        templateId,
        message: `Card template id ${templateId} already exists in another stored pack.`,
        value: { templateId, conflictingPackId: entry.packId },
      })
    }
  }

  return null
}

export function createLocalStorageCardPackRepository(input: LocalStorageCardPackRepositoryInput): CardPackRepository {
  const now = input.now ?? (() => new Date())
  const { storage, images } = input

  function listPackKeys(): string[] {
    return storage.keys().filter((key) => key.startsWith(CARD_PACK_STORAGE_KEYS.BATCH_PREFIX))
  }

  function writeIndex(
    index: LegacyCardPackStorageIndex,
  ): { ok: true } | { ok: false; code: CardPackStorageIssueCode; error: unknown } {
    const serialized = serializeIndex(index)
    if (!serialized.ok) return serialized

    try {
      storage.setItem(CARD_PACK_STORAGE_KEYS.INDEX, serialized.value)
      return { ok: true }
    } catch (error) {
      return { ok: false, code: "INDEX_WRITE_FAILED", error }
    }
  }

  function writeContent(
    packId: string,
    serialized: string,
  ): { ok: true } | { ok: false; code: CardPackStorageIssueCode; error: unknown } {
    try {
      storage.setItem(getCardPackStorageKey(packId), serialized)
      return { ok: true }
    } catch (error) {
      return { ok: false, code: "CONTENT_WRITE_FAILED", error }
    }
  }

  function removeKey(key: string): { ok: true } | { ok: false; error: unknown } {
    try {
      storage.removeItem(key)
      return { ok: true }
    } catch (error) {
      return { ok: false, error }
    }
  }

  async function deletePackImagesForRecovery(packId: string, state: RecoveryState) {
    try {
      const existing = await images.listPackImages(packId)
      const deleted = await images.deletePackImages(packId)
      if (existing.length > 0 || deleted.deletedKeys.length > 0) {
        state.removedOrphanImagePackIds.push(packId)
      }
      if (!deleted.ok) {
        state.issues.push(...deleted.issues)
      }
    } catch (error) {
      state.issues.push(
        createIssue({
          code: "IMAGE_DELETE_FAILED",
          packId,
          message: `Failed to remove images for pack ${packId}.`,
          value: error,
        }),
      )
    }
  }

  async function readIndex(state: RecoveryState): Promise<LegacyCardPackStorageIndex> {
    let raw: string | null
    try {
      raw = storage.getItem(CARD_PACK_STORAGE_KEYS.INDEX)
    } catch (error) {
      state.issues.push(
        createIssue({
          code: "INDEX_READ_FAILED",
          storageKey: CARD_PACK_STORAGE_KEYS.INDEX,
          message: "Failed to read card pack index.",
          value: error,
        }),
      )
      state.canCleanupOrphans = false
      return createEmptyIndex(now().toISOString())
    }

    if (raw === null) {
      return createEmptyIndex(now().toISOString())
    }

    const parsed = parseIndex(raw)
    if (parsed.ok) {
      return parsed.index
    }

    state.issues.push(
      createIssue({
        code: parsed.code,
        storageKey: CARD_PACK_STORAGE_KEYS.INDEX,
        message: "Card pack index is corrupted and was reset.",
        value: parsed.value,
      }),
    )

    for (const key of listPackKeys()) {
      const packId = packIdFromStorageKey(key)
      state.removedCorruptedPackKeys.push(key)
      const removed = removeKey(key)
      if (!removed.ok) {
        state.issues.push(
          createIssue({
            code: "STORAGE_WRITE_FAILED",
            packId,
            storageKey: key,
            message: "Failed to remove pack data after corrupted index reset.",
            value: removed.error,
          }),
        )
      }
      await deletePackImagesForRecovery(packId, state)
    }

    const empty = createEmptyIndex(now().toISOString())
    const write = writeIndex(empty)
    if (!write.ok) {
      state.issues.push(
        createIssue({
          code: write.code,
          storageKey: CARD_PACK_STORAGE_KEYS.INDEX,
          message: "Failed to write reset card pack index.",
          value: write.error,
        }),
      )
    }
    return empty
  }

  async function recoverSnapshot(): Promise<RecoveredState> {
    const state = createEmptyRecoveryState()
    const index = await readIndex(state)
    const packs = new Map<string, CardPackSnapshotEntry>()
    const validIndexEntries = new Map<string, LegacyCardBatchIndexEntry>()
    const seenPackKeys = new Set<string>()
    let indexChanged = false

    for (const [packId, entry] of Object.entries(index.batches)) {
      const packKey = getCardPackStorageKey(packId)
      seenPackKeys.add(packKey)

      let raw: string | null
      try {
        raw = storage.getItem(packKey)
      } catch (error) {
        state.issues.push(
          createIssue({
            code: "PACK_DATA_READ_FAILED",
            packId,
            storageKey: packKey,
            message: "Failed to read card pack data.",
            value: error,
          }),
        )
        continue
      }

      if (raw === null) {
        state.issues.push(
          createIssue({
            code: "MISSING_PACK_DATA",
            packId,
            storageKey: packKey,
            message: "Card pack index entry had no pack data and was removed.",
          }),
        )
        delete index.batches[packId]
        state.removedIndexEntries.push(packId)
        await deletePackImagesForRecovery(packId, state)
        indexChanged = true
        continue
      }

      const parsed = parsePackData(raw)
      if (!parsed.ok) {
        state.issues.push(
          createIssue({
            code: parsed.code,
            packId,
            storageKey: packKey,
            message: "Card pack data was corrupted and was removed.",
            value: parsed.value,
          }),
        )
        delete index.batches[packId]
        state.removedIndexEntries.push(packId)
        state.removedCorruptedPackKeys.push(packKey)
        const removed = removeKey(packKey)
        if (!removed.ok) {
          state.issues.push(
            createIssue({
              code: "STORAGE_WRITE_FAILED",
              packId,
              storageKey: packKey,
              message: "Failed to remove corrupted card pack data.",
              value: removed.error,
            }),
          )
        }
        await deletePackImagesForRecovery(packId, state)
        indexChanged = true
        continue
      }

      let packImageTemplateIds: string[] = []
      try {
        packImageTemplateIds = (await images.listPackImages(packId))
          .map((image) => image.templateId)
          .filter((templateId): templateId is string => Boolean(templateId))
      } catch (error) {
        state.issues.push(
          createIssue({
            code: "IMAGE_DB_UNAVAILABLE",
            packId,
            message: `Failed to inspect images for pack ${packId}.`,
            value: error,
          }),
        )
      }

      validIndexEntries.set(packId, entry)
      packs.set(packId, snapshotEntryFromStoredData(packId, entry, parsed.storedData, packImageTemplateIds))
    }

    recordTemplateIdConflicts(packs, state)

    if (state.canCleanupOrphans) {
      for (const key of listPackKeys()) {
        if (seenPackKeys.has(key)) continue

        const packId = packIdFromStorageKey(key)
        state.issues.push(
          createIssue({
            code: "ORPHAN_PACK_DATA",
            packId,
            storageKey: key,
            message: "Orphan card pack data was removed.",
          }),
        )
        state.removedOrphanPackKeys.push(key)
        const removed = removeKey(key)
        if (!removed.ok) {
          state.issues.push(
            createIssue({
              code: "STORAGE_WRITE_FAILED",
              packId,
              storageKey: key,
              message: "Failed to remove orphan card pack data.",
              value: removed.error,
            }),
          )
        }
        await deletePackImagesForRecovery(packId, state)
      }
    }

    const migration = await images.migrateLegacyGlobalImages(buildImageOwnership(packs))
    state.issues.push(...migration.issues)
    if (migration.migratedTemplateIds.length > 0) {
      state.repairedByImageMigration = true
    }

    const recoveredIndex = createIndexFromEntries(validIndexEntries.values(), index.lastUpdate)
    if (indexChanged || state.removedOrphanPackKeys.length > 0 || state.removedCorruptedPackKeys.length > 0) {
      recoveredIndex.lastUpdate = now().toISOString()
      const write = writeIndex(recoveredIndex)
      if (!write.ok) {
        state.issues.push(
          createIssue({
            code: write.code,
            storageKey: CARD_PACK_STORAGE_KEYS.INDEX,
            message: "Failed to write recovered card pack index.",
            value: write.error,
          }),
        )
      }
    }

    const integrity = createReport(state)
    return {
      index: recoveredIndex,
      snapshot: {
        packs,
        packCount: packs.size,
        integrity,
      },
    }
  }

  async function rollbackWrittenArtifacts(input: {
    packId: string
    removeImages: boolean
    removeContent: boolean
  }): Promise<CardPackIntegrityIssue[]> {
    const issues: CardPackIntegrityIssue[] = []

    if (input.removeImages) {
      try {
        const deleted = await images.deletePackImages(input.packId)
        if (!deleted.ok) {
          issues.push(...deleted.issues)
        }
      } catch (error) {
        issues.push(
          createIssue({
            code: "IMAGE_DELETE_FAILED",
            packId: input.packId,
            message: `Failed to roll back images for pack ${input.packId}.`,
            value: error,
          }),
        )
      }
    }

    if (input.removeContent) {
      const packKey = getCardPackStorageKey(input.packId)
      const removed = removeKey(packKey)
      if (!removed.ok) {
        issues.push(
          createIssue({
            code: "ROLLBACK_FAILED",
            packId: input.packId,
            storageKey: packKey,
            message: "Failed to roll back card pack content.",
            value: removed.error,
          }),
        )
      }
    }

    return issues
  }

  function rollbackFailed(issues: CardPackIntegrityIssue[]): boolean {
    return issues.some((issue) => issue.code === "ROLLBACK_FAILED" || issue.code === "IMAGE_DELETE_FAILED")
  }

  async function loadSnapshot(): Promise<CardPackStorageSnapshot> {
    return (await recoverSnapshot()).snapshot
  }

  async function ensureIntegrity(): Promise<CardPackIntegrityReport> {
    return (await recoverSnapshot()).snapshot.integrity
  }

  async function commitImport(plan: CardImportFinalCommitPlan): Promise<CardPackStorageTransactionResult> {
    const current = await recoverSnapshot()
    const snapshot = current.snapshot
    const indexReadFailure = snapshot.integrity.issues.find((issue) => issue.code === "INDEX_READ_FAILED")
    if (indexReadFailure) {
      return {
        ok: false,
        error: transactionError("INDEX_READ_FAILED", "Unable to confirm card pack index state.", indexReadFailure.value),
        snapshot,
        issues: [indexReadFailure],
      }
    }

    if (snapshot.packs.has(plan.packId)) {
      const issue = createIssue({
        code: "PACK_ID_CONFLICT",
        packId: plan.packId,
        storageKey: getCardPackStorageKey(plan.packId),
        message: "Card pack id already exists.",
      })
      return {
        ok: false,
        error: transactionError("PACK_ID_CONFLICT", issue.message),
        snapshot,
        issues: [issue],
      }
    }

    const templateIdConflict = findCommitTemplateIdConflict(snapshot, plan)
    if (templateIdConflict) {
      return {
        ok: false,
        error: transactionError("TEMPLATE_ID_CONFLICT", templateIdConflict.message, templateIdConflict.value),
        snapshot,
        issues: [templateIdConflict],
      }
    }

    const projection = projectCardImportToLegacyBatchStorage(plan)
    const serializedPackData = serializePackData(projection.storedData)
    if (!serializedPackData.ok) {
      const issue = createIssue({
        code: serializedPackData.code,
        packId: plan.packId,
        storageKey: getCardPackStorageKey(plan.packId),
        message: "Failed to serialize card pack data.",
        value: serializedPackData.error,
      })
      return {
        ok: false,
        error: transactionError(serializedPackData.code, issue.message, serializedPackData.error),
        snapshot,
        issues: [issue],
      }
    }

    const nextIndex = createIndexFromEntries(
      [...Object.values(current.index.batches), projection.indexEntry],
      now().toISOString(),
    )
    const serializedIndex = serializeIndex(nextIndex)
    if (!serializedIndex.ok) {
      const issue = createIssue({
        code: serializedIndex.code,
        packId: plan.packId,
        storageKey: CARD_PACK_STORAGE_KEYS.INDEX,
        message: "Failed to serialize card pack index.",
        value: serializedIndex.error,
      })
      return {
        ok: false,
        error: transactionError(serializedIndex.code, issue.message, serializedIndex.error),
        snapshot,
        issues: [issue],
      }
    }

    const contentWrite = writeContent(plan.packId, serializedPackData.value)
    if (!contentWrite.ok) {
      const issue = createIssue({
        code: contentWrite.code,
        packId: plan.packId,
        storageKey: getCardPackStorageKey(plan.packId),
        message: "Failed to write card pack data.",
        value: contentWrite.error,
      })
      return {
        ok: false,
        error: transactionError(contentWrite.code, issue.message, contentWrite.error),
        snapshot,
        issues: [issue],
      }
    }

    const imageWrite = await images.writePackImages(projection.packId, plan.assets.cardImages)
    if (!imageWrite.ok) {
      const rollbackIssues = await rollbackWrittenArtifacts({
        packId: plan.packId,
        removeImages: true,
        removeContent: true,
      })
      const issues = [...imageWrite.issues, ...rollbackIssues]
      const code = rollbackFailed(rollbackIssues) ? "ROLLBACK_FAILED" : "IMAGE_WRITE_FAILED"
      const message =
        code === "ROLLBACK_FAILED"
          ? "Failed to roll back card pack artifacts after image write failure."
          : "Failed to write card pack images."
      return {
        ok: false,
        error: transactionError(code, message, issues),
        snapshot,
        issues,
      }
    }

    const indexWrite = writeIndex(nextIndex)
    if (!indexWrite.ok) {
      const rollbackIssues = await rollbackWrittenArtifacts({
        packId: plan.packId,
        removeImages: true,
        removeContent: true,
      })
      const indexIssue = createIssue({
        code: indexWrite.code,
        packId: plan.packId,
        storageKey: CARD_PACK_STORAGE_KEYS.INDEX,
        message: "Failed to write card pack index.",
        value: indexWrite.error,
      })
      const issues = [indexIssue, ...rollbackIssues]
      const code = rollbackFailed(rollbackIssues) ? "ROLLBACK_FAILED" : indexWrite.code
      return {
        ok: false,
        error: transactionError(code, code === "ROLLBACK_FAILED" ? "Failed to roll back card pack artifacts." : indexIssue.message, issues),
        snapshot,
        issues,
      }
    }

    const afterCommit = await loadSnapshot()
    return { ok: true, snapshot: afterCommit, issues: afterCommit.integrity.issues }
  }

  async function removePack(packId: string): Promise<CardPackStorageTransactionResult> {
    const current = await recoverSnapshot()
    const snapshot = current.snapshot
    const existing = snapshot.packs.get(packId)
    if (!existing) {
      const issue = createIssue({
        code: "PACK_NOT_FOUND",
        packId,
        message: "Card pack was not found.",
      })
      return {
        ok: false,
        error: transactionError("PACK_NOT_FOUND", issue.message),
        snapshot,
        issues: [issue],
      }
    }

    const remainingEntries = Object.values(current.index.batches).filter((entry) => entry.id !== packId)
    const nextIndex = createIndexFromEntries(remainingEntries, now().toISOString())
    const indexWrite = writeIndex(nextIndex)
    if (!indexWrite.ok) {
      const issue = createIssue({
        code: indexWrite.code,
        packId,
        storageKey: CARD_PACK_STORAGE_KEYS.INDEX,
        message: "Failed to remove card pack from index.",
        value: indexWrite.error,
      })
      return {
        ok: false,
        error: transactionError(indexWrite.code, issue.message, indexWrite.error),
        snapshot,
        issues: [issue],
      }
    }

    const imageDelete = await images.deletePackImages(packId)
    if (!imageDelete.ok) {
      return {
        ok: false,
        error: transactionError("IMAGE_DELETE_FAILED", "Card pack was removed from index but images remain.", imageDelete.issues),
        snapshot,
        issues: imageDelete.issues,
      }
    }

    const packKey = getCardPackStorageKey(packId)
    const contentDelete = removeKey(packKey)
    if (!contentDelete.ok) {
      const issue = createIssue({
        code: "STORAGE_WRITE_FAILED",
        packId,
        storageKey: packKey,
        message: "Card pack was removed from index but content cleanup failed.",
        value: contentDelete.error,
      })
      return {
        ok: false,
        error: transactionError("STORAGE_WRITE_FAILED", issue.message, contentDelete.error),
        snapshot,
        issues: [issue],
      }
    }

    const afterRemove = await loadSnapshot()
    return { ok: true, snapshot: afterRemove, issues: afterRemove.integrity.issues }
  }

  async function setPackDisabled(packId: string, disabled: boolean): Promise<CardPackStorageTransactionResult> {
    const current = await recoverSnapshot()
    const snapshot = current.snapshot
    if (!snapshot.packs.has(packId)) {
      const issue = createIssue({
        code: "PACK_NOT_FOUND",
        packId,
        message: "Card pack was not found.",
      })
      return {
        ok: false,
        error: transactionError("PACK_NOT_FOUND", issue.message),
        snapshot,
        issues: [issue],
      }
    }

    const nextEntries = Object.values(current.index.batches).map((entry) =>
      entry.id === packId ? { ...entry, disabled } : entry,
    )
    const nextIndex = createIndexFromEntries(nextEntries, now().toISOString())
    const write = writeIndex(nextIndex)
    if (!write.ok) {
      const issue = createIssue({
        code: write.code,
        packId,
        storageKey: CARD_PACK_STORAGE_KEYS.INDEX,
        message: "Failed to update card pack disabled state.",
        value: write.error,
      })
      return {
        ok: false,
        error: transactionError(write.code, issue.message, write.error),
        snapshot,
        issues: [issue],
      }
    }

    const afterUpdate = await loadSnapshot()
    return { ok: true, snapshot: afterUpdate, issues: afterUpdate.integrity.issues }
  }

  return {
    loadSnapshot,
    ensureIntegrity,
    commitImport,
    removePack,
    setPackDisabled,
  }
}
