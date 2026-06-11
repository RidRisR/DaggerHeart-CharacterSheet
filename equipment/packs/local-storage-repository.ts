import {
  getPackStorageKey,
  LOCAL_STORAGE_KEYS,
  type EquipmentPackStorageAdapter,
} from "./local-storage-adapter"
import type { EquipmentPackRepository } from "./repository"
import type {
  EquipmentPackFinalCommitPlan,
  EquipmentPackIndexEntry,
  EquipmentPackIntegrityIssue,
  EquipmentPackIntegrityReport,
  EquipmentPackSnapshotEntry,
  EquipmentPackStorageIndex,
  EquipmentPackStorageIssueCode,
  EquipmentPackStorageSnapshot,
  EquipmentPackStorageTransactionError,
  EquipmentPackStorageTransactionResult,
  EquipmentPackStoredData,
} from "./storage-types"

export interface LocalStorageEquipmentPackRepositoryOptions {
  now?: () => Date
}

interface RecoveryState {
  issues: EquipmentPackIntegrityIssue[]
  removedIndexEntries: string[]
  removedOrphanPackKeys: string[]
  removedCorruptedPackKeys: string[]
  canCleanupOrphans: boolean
}

const INDEX_FORMAT: EquipmentPackStorageIndex["format"] = "daggerheart.equipment-pack-index.v1"
const PACK_DATA_FORMAT: EquipmentPackStoredData["format"] = "daggerheart.equipment-pack-data.v1"
const EQUIPMENT_TIERS = new Set(["T1", "T2", "T3", "T4"])
const EQUIPMENT_TRAITS = new Set(["agility", "strength", "finesse", "instinct", "presence", "knowledge"])
const EQUIPMENT_DAMAGE_TYPES = new Set(["physical", "magic"])
const EQUIPMENT_RANGES = new Set(["melee", "veryClose", "close", "far", "veryFar"])
const EQUIPMENT_BURDENS = new Set(["oneHanded", "twoHanded", "offHand"])
const EQUIPMENT_MODIFIER_TARGETS = new Set([
  "evasion",
  "armorMax",
  "minorThreshold",
  "majorThreshold",
  "hpMax",
  "stressMax",
  "proficiency",
  "agility.value",
  "strength.value",
  "finesse.value",
  "instinct.value",
  "presence.value",
  "knowledge.value",
])

function createEmptyRecoveryState(): RecoveryState {
  return {
    issues: [],
    removedIndexEntries: [],
    removedOrphanPackKeys: [],
    removedCorruptedPackKeys: [],
    canCleanupOrphans: true,
  }
}

function createEmptyIndex(updatedAt: string): EquipmentPackStorageIndex {
  return {
    format: INDEX_FORMAT,
    packs: {},
    updatedAt,
  }
}

function createIssue(input: {
  code: EquipmentPackStorageIssueCode
  message: string
  packId?: string
  storageKey?: string
  value?: unknown
}): EquipmentPackIntegrityIssue {
  return input
}

function createReport(state: RecoveryState): EquipmentPackIntegrityReport {
  return {
    ok: state.issues.length === 0,
    repaired:
      state.removedIndexEntries.length > 0 ||
      state.removedOrphanPackKeys.length > 0 ||
      state.removedCorruptedPackKeys.length > 0,
    issues: state.issues,
    removedIndexEntries: state.removedIndexEntries,
    removedOrphanPackKeys: state.removedOrphanPackKeys,
    removedCorruptedPackKeys: state.removedCorruptedPackKeys,
  }
}

function createSnapshotFromPacks(
  packs: Map<string, EquipmentPackSnapshotEntry>,
  issues: EquipmentPackIntegrityIssue[] = [],
): EquipmentPackStorageSnapshot {
  return {
    packs,
    packCount: packs.size,
    integrity: {
      ok: issues.length === 0,
      repaired: false,
      issues,
      removedIndexEntries: [],
      removedOrphanPackKeys: [],
      removedCorruptedPackKeys: [],
    },
  }
}

function isQuotaError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "QuotaExceededError"
}

function transactionError(
  code: EquipmentPackStorageIssueCode,
  message: string,
  value?: unknown,
): EquipmentPackStorageTransactionError {
  return { code, message, value }
}

function tryParseJson(raw: string): { ok: true; value: unknown } | { ok: false; error: unknown } {
  try {
    return { ok: true, value: JSON.parse(raw) }
  } catch (error) {
    return { ok: false, error }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isIndexEntry(value: unknown): value is EquipmentPackIndexEntry {
  return (
    isRecord(value) &&
    typeof value.importedAt === "string" &&
    typeof value.disabled === "boolean" &&
    (value.source === undefined || isRecord(value.source))
  )
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string"
}

function isContribution(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isRecord(value.definition) &&
    EQUIPMENT_MODIFIER_TARGETS.has(String(value.definition.target)) &&
    value.definition.kind === "modifier" &&
    isRecord(value.editable) &&
    typeof value.editable.label === "string" &&
    typeof value.editable.value === "number"
  )
}

function hasValidTemplateBase(value: Record<string, unknown>): boolean {
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    EQUIPMENT_TIERS.has(String(value.tier)) &&
    isOptionalString(value.featureName) &&
    isOptionalString(value.description) &&
    Array.isArray(value.modifierContributions) &&
    value.modifierContributions.every(isContribution)
  )
}

function isStoredWeapon(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasValidTemplateBase(value) &&
    (value.weaponType === "primary" || value.weaponType === "secondary") &&
    EQUIPMENT_TRAITS.has(String(value.trait)) &&
    EQUIPMENT_DAMAGE_TYPES.has(String(value.damageType)) &&
    EQUIPMENT_RANGES.has(String(value.range)) &&
    EQUIPMENT_BURDENS.has(String(value.burden)) &&
    typeof value.damage === "string"
  )
}

function isStoredArmor(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasValidTemplateBase(value) &&
    typeof value.baseArmorMax === "number" &&
    Number.isInteger(value.baseArmorMax) &&
    isRecord(value.baseThresholds) &&
    typeof value.baseThresholds.minor === "number" &&
    Number.isInteger(value.baseThresholds.minor) &&
    typeof value.baseThresholds.major === "number" &&
    Number.isInteger(value.baseThresholds.major)
  )
}

function isStoredPack(value: unknown): value is EquipmentPackStoredData["pack"] {
  if (!isRecord(value) || !isRecord(value.metadata)) {
    return false
  }

  if (
    value.metadata.format !== "daggerheart.equipment-pack.v1" ||
    typeof value.metadata.name !== "string" ||
    typeof value.metadata.version !== "string" ||
    typeof value.metadata.author !== "string" ||
    typeof value.metadata.description !== "string" ||
    !Array.isArray(value.weapons) ||
    !Array.isArray(value.armor)
  ) {
    return false
  }

  return value.weapons.every(isStoredWeapon) && value.armor.every(isStoredArmor)
}

function parseIndex(
  raw: string,
): { ok: true; index: EquipmentPackStorageIndex } | { ok: false; code: EquipmentPackStorageIssueCode; value?: unknown } {
  const parsed = tryParseJson(raw)
  if (!parsed.ok) {
    return { ok: false, code: "INDEX_PARSE_FAILED", value: parsed.error }
  }

  if (
    !isRecord(parsed.value) ||
    parsed.value.format !== INDEX_FORMAT ||
    !isRecord(parsed.value.packs) ||
    typeof parsed.value.updatedAt !== "string"
  ) {
    return { ok: false, code: "INDEX_FORMAT_INVALID", value: parsed.value }
  }

  const packs: Record<string, EquipmentPackIndexEntry> = {}
  for (const [packId, entry] of Object.entries(parsed.value.packs)) {
    if (!isIndexEntry(entry)) {
      return { ok: false, code: "INDEX_FORMAT_INVALID", value: parsed.value }
    }
    packs[packId] = entry
  }

  return { ok: true, index: { format: INDEX_FORMAT, packs, updatedAt: parsed.value.updatedAt } }
}

function parsePackData(
  raw: string,
): { ok: true; storedData: EquipmentPackStoredData } | { ok: false; code: EquipmentPackStorageIssueCode; value?: unknown } {
  const parsed = tryParseJson(raw)
  if (!parsed.ok) {
    return { ok: false, code: "PACK_DATA_PARSE_FAILED", value: parsed.error }
  }

  if (!isRecord(parsed.value) || parsed.value.format !== PACK_DATA_FORMAT || !isStoredPack(parsed.value.pack)) {
    return { ok: false, code: "PACK_DATA_FORMAT_INVALID", value: parsed.value }
  }

  return { ok: true, storedData: { format: PACK_DATA_FORMAT, pack: parsed.value.pack } }
}

function safeStringify(value: unknown): { ok: true; value: string } | { ok: false; error: unknown } {
  try {
    return { ok: true, value: JSON.stringify(value) }
  } catch (error) {
    return { ok: false, error }
  }
}

function serializeIndex(
  index: EquipmentPackStorageIndex,
): { ok: true; value: string } | { ok: false; code: EquipmentPackStorageIssueCode; error: unknown } {
  const serialized = safeStringify(index)
  if (!serialized.ok) {
    return { ok: false, code: "STORAGE_SERIALIZE_FAILED", error: serialized.error }
  }

  return serialized
}

function serializePackData(
  data: EquipmentPackStoredData,
): { ok: true; value: string } | { ok: false; code: EquipmentPackStorageIssueCode; error: unknown } {
  const serialized = safeStringify(data)
  if (!serialized.ok) {
    return { ok: false, code: "STORAGE_SERIALIZE_FAILED", error: serialized.error }
  }

  return serialized
}

function packIdFromStorageKey(key: string): string {
  return key.slice(LOCAL_STORAGE_KEYS.PACK_PREFIX.length)
}

function recordTemplateIdConflicts(packs: Map<string, EquipmentPackSnapshotEntry>, state: RecoveryState) {
  const seenTemplateIds = new Map<string, string>()

  for (const [packId, entry] of packs) {
    for (const template of [...entry.pack.weapons, ...entry.pack.armor]) {
      const conflictingPackId = seenTemplateIds.get(template.id)

      if (conflictingPackId) {
        state.issues.push(
          createIssue({
            code: "TEMPLATE_ID_CONFLICT",
            packId,
            message: `Equipment template id ${template.id} already exists in another stored pack.`,
            value: { templateId: template.id, conflictingPackId },
          }),
        )
        continue
      }

      seenTemplateIds.set(template.id, packId)
    }
  }
}

function findCommitTemplateIdConflict(
  current: EquipmentPackStorageSnapshot,
  plan: EquipmentPackFinalCommitPlan,
): EquipmentPackIntegrityIssue | null {
  const seenPlanTemplateIds = new Set<string>()
  for (const templateId of plan.templateIds) {
    if (seenPlanTemplateIds.has(templateId)) {
      return createIssue({
        code: "TEMPLATE_ID_CONFLICT",
        packId: plan.packId,
        message: `Equipment template id ${templateId} appears more than once in the commit plan.`,
        value: { templateId, conflictingPackId: plan.packId },
      })
    }
    seenPlanTemplateIds.add(templateId)
  }

  for (const entry of current.packs.values()) {
    for (const template of [...entry.pack.weapons, ...entry.pack.armor]) {
      if (!seenPlanTemplateIds.has(template.id)) continue

      return createIssue({
        code: "TEMPLATE_ID_CONFLICT",
        packId: plan.packId,
        message: `Equipment template id ${template.id} already exists in another stored pack.`,
        value: { templateId: template.id, conflictingPackId: entry.packId },
      })
    }
  }

  return null
}

export function createLocalStorageEquipmentPackRepository(
  adapter: EquipmentPackStorageAdapter,
  options: LocalStorageEquipmentPackRepositoryOptions = {},
): EquipmentPackRepository {
  const now = options.now ?? (() => new Date())

  function listPackKeys(): string[] {
    return adapter.keys().filter((key) => key.startsWith(LOCAL_STORAGE_KEYS.PACK_PREFIX))
  }

  function writeIndex(
    index: EquipmentPackStorageIndex,
  ): { ok: true } | { ok: false; code: EquipmentPackStorageIssueCode; error: unknown } {
    const serialized = serializeIndex(index)
    if (!serialized.ok) return serialized

    return setSerializedItem(LOCAL_STORAGE_KEYS.INDEX, serialized.value)
  }

  function setSerializedItem(
    key: string,
    value: string,
  ): { ok: true } | { ok: false; code: EquipmentPackStorageIssueCode; error: unknown } {
    try {
      adapter.setItem(key, value)
      return { ok: true }
    } catch (error) {
      return { ok: false, code: isQuotaError(error) ? "STORAGE_QUOTA_EXCEEDED" : "STORAGE_WRITE_FAILED", error }
    }
  }

  function removeKey(key: string): { ok: true } | { ok: false; error: unknown } {
    try {
      adapter.removeItem(key)
      return { ok: true }
    } catch (error) {
      return { ok: false, error }
    }
  }

  function readIndex(state: RecoveryState): EquipmentPackStorageIndex {
    let raw: string | null
    try {
      raw = adapter.getItem(LOCAL_STORAGE_KEYS.INDEX)
    } catch (error) {
      state.issues.push(
        createIssue({
          code: "INDEX_READ_FAILED",
          storageKey: LOCAL_STORAGE_KEYS.INDEX,
          message: "Failed to read equipment pack index.",
          value: error,
        }),
      )
      state.canCleanupOrphans = false
      return createEmptyIndex(now().toISOString())
    }

    if (raw === null) {
      const empty = createEmptyIndex(now().toISOString())
      const write = writeIndex(empty)
      if (!write.ok) {
        state.issues.push(
          createIssue({
            code: write.code,
            storageKey: LOCAL_STORAGE_KEYS.INDEX,
            message: "Failed to create empty equipment pack index.",
            value: write.error,
          }),
        )
      }
      return empty
    }

    const parsed = parseIndex(raw)
    if (parsed.ok) {
      return parsed.index
    }

    state.issues.push(
      createIssue({
        code: parsed.code,
        storageKey: LOCAL_STORAGE_KEYS.INDEX,
        message: "Equipment pack index is corrupted and was reset.",
        value: parsed.value,
      }),
    )

    for (const key of listPackKeys()) {
      const removed = removeKey(key)
      state.removedCorruptedPackKeys.push(key)
      if (!removed.ok) {
        state.issues.push(
          createIssue({
            code: "STORAGE_WRITE_FAILED",
            storageKey: key,
            message: "Failed to remove pack data after corrupted index reset.",
            value: removed.error,
          }),
        )
      }
    }

    const empty = createEmptyIndex(now().toISOString())
    const write = writeIndex(empty)
    if (!write.ok) {
      state.issues.push(
        createIssue({
          code: write.code,
          storageKey: LOCAL_STORAGE_KEYS.INDEX,
          message: "Failed to write reset equipment pack index.",
          value: write.error,
        }),
      )
    }
    return empty
  }

  function recoverSnapshot(): EquipmentPackStorageSnapshot {
    const state = createEmptyRecoveryState()
    const index = readIndex(state)
    const packs = new Map<string, EquipmentPackSnapshotEntry>()
    const seenPackKeys = new Set<string>()
    let indexChanged = false

    for (const [packId, entry] of Object.entries(index.packs)) {
      const packKey = getPackStorageKey(packId)
      seenPackKeys.add(packKey)

      let raw: string | null
      try {
        raw = adapter.getItem(packKey)
      } catch (error) {
        state.issues.push(
          createIssue({
            code: "PACK_DATA_READ_FAILED",
            packId,
            storageKey: packKey,
            message: "Failed to read equipment pack data.",
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
            message: "Equipment pack index entry had no pack data and was removed.",
          }),
        )
        delete index.packs[packId]
        state.removedIndexEntries.push(packId)
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
            message: "Equipment pack data was corrupted and was removed.",
            value: parsed.value,
          }),
        )
        delete index.packs[packId]
        state.removedIndexEntries.push(packId)
        state.removedCorruptedPackKeys.push(packKey)
        const removed = removeKey(packKey)
        if (!removed.ok) {
          state.issues.push(
            createIssue({
              code: "STORAGE_WRITE_FAILED",
              packId,
              storageKey: packKey,
              message: "Failed to remove corrupted equipment pack data.",
              value: removed.error,
            }),
          )
        }
        indexChanged = true
        continue
      }

      packs.set(packId, {
        packId,
        importedAt: entry.importedAt,
        disabled: entry.disabled,
        source: entry.source,
        pack: parsed.storedData.pack,
      })
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
            message: "Orphan equipment pack data was removed.",
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
              message: "Failed to remove orphan equipment pack data.",
              value: removed.error,
            }),
          )
        }
      }
    }

    if (indexChanged || state.removedOrphanPackKeys.length > 0) {
      index.updatedAt = now().toISOString()
      const write = writeIndex(index)
      if (!write.ok) {
        state.issues.push(
          createIssue({
            code: write.code,
            storageKey: LOCAL_STORAGE_KEYS.INDEX,
            message: "Failed to write recovered equipment pack index.",
            value: write.error,
          }),
        )
      }
    }

    const integrity = createReport(state)
    return {
      packs,
      packCount: packs.size,
      integrity,
    }
  }

  async function loadSnapshot(): Promise<EquipmentPackStorageSnapshot> {
    return recoverSnapshot()
  }

  async function ensureIntegrity(): Promise<EquipmentPackIntegrityReport> {
    return (await loadSnapshot()).integrity
  }

  async function commitImport(plan: EquipmentPackFinalCommitPlan): Promise<EquipmentPackStorageTransactionResult> {
    const current = await loadSnapshot()
    const indexReadFailure = current.integrity.issues.find((issue) => issue.code === "INDEX_READ_FAILED")
    if (indexReadFailure) {
      return {
        ok: false,
        error: transactionError("INDEX_READ_FAILED", "Unable to confirm equipment pack index state.", indexReadFailure.value),
        snapshot: current,
        issues: [indexReadFailure],
      }
    }

    const samePackReadFailure = current.integrity.issues.find(
      (issue) => issue.code === "PACK_DATA_READ_FAILED" && issue.packId === plan.packId,
    )
    if (samePackReadFailure) {
      const issue = createIssue({
        code: "PACK_ID_CONFLICT",
        packId: plan.packId,
        storageKey: getPackStorageKey(plan.packId),
        message: "Equipment pack id already exists but its data could not be read.",
        value: samePackReadFailure.value,
      })
      return {
        ok: false,
        error: transactionError("PACK_ID_CONFLICT", issue.message, samePackReadFailure.value),
        snapshot: current,
        issues: [issue, samePackReadFailure],
      }
    }

    if (current.packs.has(plan.packId)) {
      const issue = createIssue({
        code: "PACK_ID_CONFLICT",
        packId: plan.packId,
        storageKey: getPackStorageKey(plan.packId),
        message: "Equipment pack id already exists.",
      })
      return {
        ok: false,
        error: transactionError("PACK_ID_CONFLICT", issue.message),
        snapshot: current,
        issues: [issue],
      }
    }

    const templateIdConflict = findCommitTemplateIdConflict(current, plan)
    if (templateIdConflict) {
      return {
        ok: false,
        error: transactionError("TEMPLATE_ID_CONFLICT", templateIdConflict.message, templateIdConflict.value),
        snapshot: current,
        issues: [templateIdConflict],
      }
    }

    const currentIndex = createEmptyIndex(now().toISOString())
    for (const [packId, entry] of current.packs) {
      currentIndex.packs[packId] = {
        importedAt: entry.importedAt,
        disabled: entry.disabled,
        source: entry.source,
      }
    }

    const storedPackData: EquipmentPackStoredData = { format: PACK_DATA_FORMAT, pack: plan.packData }
    const serializedPackData = serializePackData(storedPackData)
    if (!serializedPackData.ok) {
      const issue = createIssue({
        code: serializedPackData.code,
        packId: plan.packId,
        storageKey: getPackStorageKey(plan.packId),
        message: "Failed to serialize equipment pack data.",
        value: serializedPackData.error,
      })
      return {
        ok: false,
        error: transactionError(serializedPackData.code, issue.message, serializedPackData.error),
        snapshot: current,
        issues: [issue],
      }
    }

    currentIndex.packs[plan.packId] = {
      importedAt: plan.importedAt,
      disabled: plan.disabled,
      source: plan.source,
    }
    currentIndex.updatedAt = now().toISOString()

    const serializedIndex = serializeIndex(currentIndex)
    if (!serializedIndex.ok) {
      const issue = createIssue({
        code: serializedIndex.code,
        packId: plan.packId,
        storageKey: LOCAL_STORAGE_KEYS.INDEX,
        message: "Failed to serialize equipment pack index.",
        value: serializedIndex.error,
      })
      return {
        ok: false,
        error: transactionError(serializedIndex.code, issue.message, serializedIndex.error),
        snapshot: current,
        issues: [issue],
      }
    }

    const packWrite = setSerializedItem(getPackStorageKey(plan.packId), serializedPackData.value)
    if (!packWrite.ok) {
      const issue = createIssue({
        code: packWrite.code,
        packId: plan.packId,
        storageKey: getPackStorageKey(plan.packId),
        message: "Failed to write equipment pack data.",
        value: packWrite.error,
      })
      return {
        ok: false,
        error: transactionError(packWrite.code, issue.message, packWrite.error),
        snapshot: current,
        issues: [issue],
      }
    }

    const indexWrite = setSerializedItem(LOCAL_STORAGE_KEYS.INDEX, serializedIndex.value)
    if (!indexWrite.ok) {
      const rollback = removeKey(getPackStorageKey(plan.packId))
      const issue = createIssue({
        code: indexWrite.code,
        packId: plan.packId,
        storageKey: LOCAL_STORAGE_KEYS.INDEX,
        message: "Failed to write equipment pack index.",
        value: indexWrite.error,
      })
      const issues = [issue]
      if (!rollback.ok) {
        issues.push(
          createIssue({
            code: "ROLLBACK_FAILED",
            packId: plan.packId,
            storageKey: getPackStorageKey(plan.packId),
            message: "Failed to roll back equipment pack data after index write failure.",
            value: rollback.error,
          }),
        )
      }
      return {
        ok: false,
        error: transactionError(indexWrite.code, issue.message, indexWrite.error),
        snapshot: current,
        issues,
      }
    }

    const snapshot = await loadSnapshot()
    return { ok: true, snapshot, issues: snapshot.integrity.issues }
  }

  async function removePack(packId: string): Promise<EquipmentPackStorageTransactionResult> {
    const current = await loadSnapshot()
    if (!current.packs.has(packId)) {
      const issue = createIssue({
        code: "PACK_NOT_FOUND",
        packId,
        message: "Equipment pack was not found.",
      })
      return {
        ok: false,
        error: transactionError("PACK_NOT_FOUND", issue.message),
        snapshot: current,
        issues: [issue],
      }
    }

    const nextIndex = createEmptyIndex(now().toISOString())
    for (const [entryPackId, entry] of current.packs) {
      if (entryPackId === packId) continue
      nextIndex.packs[entryPackId] = {
        importedAt: entry.importedAt,
        disabled: entry.disabled,
        source: entry.source,
      }
    }

    const indexWrite = writeIndex(nextIndex)
    if (!indexWrite.ok) {
      const issue = createIssue({
        code: indexWrite.code,
        packId,
        storageKey: LOCAL_STORAGE_KEYS.INDEX,
        message: "Failed to remove equipment pack from index.",
        value: indexWrite.error,
      })
      return {
        ok: false,
        error: transactionError(indexWrite.code, issue.message, indexWrite.error),
        snapshot: current,
        issues: [issue],
      }
    }

    const packKey = getPackStorageKey(packId)
    const removed = removeKey(packKey)
    if (!removed.ok) {
      const cleanupPendingIssue = createIssue({
        code: "ORPHAN_PACK_DATA_CLEANUP_PENDING",
        packId,
        storageKey: packKey,
        message: "Equipment pack was removed from the index, but pack data cleanup is still pending.",
        value: removed.error,
      })
      const packs = new Map(current.packs)
      packs.delete(packId)
      const snapshot = createSnapshotFromPacks(packs, [cleanupPendingIssue])
      return {
        ok: true,
        snapshot,
        issues: [cleanupPendingIssue],
      }
    }

    const snapshot = await loadSnapshot()
    return { ok: true, snapshot, issues: snapshot.integrity.issues }
  }

  async function setPackDisabled(packId: string, disabled: boolean): Promise<EquipmentPackStorageTransactionResult> {
    const current = await loadSnapshot()
    const existing = current.packs.get(packId)
    if (!existing) {
      const issue = createIssue({
        code: "PACK_NOT_FOUND",
        packId,
        message: "Equipment pack was not found.",
      })
      return {
        ok: false,
        error: transactionError("PACK_NOT_FOUND", issue.message),
        snapshot: current,
        issues: [issue],
      }
    }

    const nextIndex = createEmptyIndex(now().toISOString())
    for (const [entryPackId, entry] of current.packs) {
      nextIndex.packs[entryPackId] = {
        importedAt: entry.importedAt,
        disabled: entryPackId === packId ? disabled : entry.disabled,
        source: entry.source,
      }
    }

    const indexWrite = writeIndex(nextIndex)
    if (!indexWrite.ok) {
      const issue = createIssue({
        code: indexWrite.code,
        packId,
        storageKey: LOCAL_STORAGE_KEYS.INDEX,
        message: "Failed to update equipment pack disabled state.",
        value: indexWrite.error,
      })
      return {
        ok: false,
        error: transactionError(indexWrite.code, issue.message, indexWrite.error),
        snapshot: current,
        issues: [issue],
      }
    }

    const snapshot = await loadSnapshot()
    return { ok: true, snapshot, issues: snapshot.integrity.issues }
  }

  return {
    loadSnapshot,
    ensureIntegrity,
    commitImport,
    removePack,
    setPackDisabled,
  }
}
