import { CardType } from "@/card/card-types"
import {
  getAvailableVariantTypes,
  getCardClassOptionsForType,
  getVariantLevelOptions,
  getVariantSubclassOptions,
} from "@/card/card-ui-config"
import {
  getAncestryCardNames,
  getCommunityCardNames,
  getDomainCardNames,
  getProfessionCardNames,
  getSubClassCardNames,
  getVariantSubclasses,
  getVariantTypeNames,
  getVariantTypes,
} from "@/card/card-predefined-field"
import {
  getAllBatches,
  getCardsByBatchId,
  getCustomCardBatches,
  getCustomCards,
  getCustomCardsByType,
  getStandardCardById,
  getStandardCardsByType,
} from "@/card/index-unified"
import type { CardPackImageBackend } from "@/card/packs/image-backend"
import { STORAGE_KEYS } from "@/card/stores/store-types"
import { useUnifiedCardStore } from "@/card/stores/unified-card-store"
import type { CardImportStorageSnapshot } from "../helpers/card-import-storage-snapshot"

type JsonRecord = Record<string, unknown>

export interface StorageBusinessSnapshot {
  packs: Array<{
    id: string
    name: string
    disabled: boolean
    indexCardCount: number | null
    actualCardCount: number
    cardIds: string[]
    imageMetadata: {
      imageCardIds: string[]
      imageCount: number | null
    }
    cardTypes: Record<string, number>
    cards: StorageBusinessCard[]
    variantTypeKeys: string[]
    imageCardIds: string[]
    images: Array<{
      cardId: string
      mimeType: string
      byteLength: number
      sha256: string
    }>
  }>
}

export type StorageBusinessCard = Record<string, unknown>

export interface RawStorageDiffReport {
  differences: Array<{
    path: string
    expected: unknown
    actual: unknown
  }>
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readRecord(value: unknown): JsonRecord {
  return isRecord(value) ? value : {}
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function sortedKeys(value: unknown): string[] {
  return Object.keys(readRecord(value)).sort()
}

function readIndexBatches(snapshot: CardImportStorageSnapshot): Record<string, JsonRecord> {
  const index = readRecord(snapshot.index)
  const batches = readRecord(index.batches)
  return Object.fromEntries(Object.entries(batches).map(([id, value]) => [id, readRecord(value)]))
}

function countTypes(cards: StorageBusinessCard[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const card of cards) {
    const type = String(card.type ?? "")
    counts[type] = (counts[type] ?? 0) + 1
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)))
}

function normalizeCardValue(value: unknown, owningBatchName: string, path: string[] = []): unknown {
  if (Array.isArray(value)) {
    return value.map((item, index) => normalizeCardValue(item, owningBatchName, [...path, String(index)]))
  }
  if (!isRecord(value)) return value

  const result: JsonRecord = {}
  for (const [key, child] of Object.entries(value).sort(([left], [right]) => left.localeCompare(right))) {
    if (path.length === 0 && key === "batchName" && child === owningBatchName) continue
    if (path.join(".") === "cardSelectDisplay" && child === "") continue
    result[key] = normalizeCardValue(child, owningBatchName, [...path, key])
  }
  return result
}

function projectCard(value: unknown, owningBatchName: string): StorageBusinessCard {
  return normalizeCardValue(readRecord(value), owningBatchName) as StorageBusinessCard
}

function readMetadataImageInfo(metadata: unknown): { imageCardIds: string[]; imageCount: number | null } {
  const record = readRecord(metadata)
  const imageCardIds = readArray(record.imageCardIds).map(String)
  const imageCount = typeof record.imageCount === "number" ? record.imageCount : null
  return {
    imageCardIds,
    imageCount: imageCount === 0 && imageCardIds.length === 0 ? null : imageCount,
  }
}

export function projectStorageBusinessSnapshot(snapshot: CardImportStorageSnapshot): StorageBusinessSnapshot {
  const indexBatches = readIndexBatches(snapshot)

  return {
    packs: sortedKeys(indexBatches).map((packId) => {
      const indexBatch = indexBatches[packId] ?? {}
      const batch = snapshot.batches[packId]
      const batchMetadata = readRecord(batch?.metadata)
      const name =
        typeof indexBatch.name === "string"
          ? indexBatch.name
          : typeof batchMetadata.name === "string"
            ? batchMetadata.name
            : packId
      const imageMetadata = readMetadataImageInfo(batch?.metadata)
      const cards = readArray(batch?.cards).map((card) => projectCard(card, name))
      const variantTypeKeys = sortedKeys(batch?.variantTypes)
      const images = snapshot.images[packId]?.items ?? []

      return {
        id: packId,
        name,
        disabled: indexBatch.disabled === true,
        indexCardCount: typeof indexBatch.cardCount === "number" ? indexBatch.cardCount : null,
        actualCardCount: cards.length,
        cardIds: cards.map((card) => String(card.id ?? "")),
        imageMetadata,
        cardTypes: countTypes(cards),
        cards,
        variantTypeKeys,
        imageCardIds: snapshot.images[packId]?.cardIds ?? [],
        images,
      }
    }),
  }
}

function stable(value: unknown): string {
  return JSON.stringify(value)
}

function compareValue(path: string, expected: unknown, actual: unknown, failures: string[]) {
  if (stable(expected) !== stable(actual)) failures.push(`${path} mismatch`)
}

function compareImageMetadataConsistency(
  packId: string,
  pack: StorageBusinessSnapshot["packs"][number],
  failures: string[],
) {
  const imageContentCardIds = sortedUnique(pack.images.map((image) => image.cardId))
  const imageContentCount = pack.images.length
  const imageBackendCardIds = sortedUnique(pack.imageCardIds)
  const metadataImageCardIds = sortedUnique(pack.imageMetadata.imageCardIds)

  if (imageBackendCardIds.length > 0 || imageContentCardIds.length > 0) {
    compareValue(`${packId}: imageCardIds match image items`, imageContentCardIds, imageBackendCardIds, failures)
  }

  if (metadataImageCardIds.length > 0 || imageContentCardIds.length > 0) {
    compareValue(`${packId}: metadata imageCardIds match image backend`, imageContentCardIds, metadataImageCardIds, failures)
  }

  if (pack.imageMetadata.imageCount !== null || imageContentCount > 0) {
    if (pack.imageMetadata.imageCount !== imageContentCount) {
      failures.push(`${packId}: metadata imageCount mismatch`)
    }
  }
}

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right))
}

function imageContentByCardId(pack: StorageBusinessSnapshot["packs"][number]) {
  return pack.images
    .map((image) => ({
      cardId: image.cardId,
      byteLength: image.byteLength,
      sha256: image.sha256,
    }))
    .sort((left, right) => left.cardId.localeCompare(right.cardId))
}

function compareActualImageMimeTypes(packId: string, pack: StorageBusinessSnapshot["packs"][number], failures: string[]) {
  for (const image of pack.images) {
    if (!/^image\/.+/.test(image.mimeType)) {
      failures.push(`${packId}/${image.cardId}: actual image MIME invalid`)
    }
  }
}

function compareCardBatchName(
  packId: string,
  pack: StorageBusinessSnapshot["packs"][number],
  card: StorageBusinessCard,
  failures: string[],
) {
  if (Object.prototype.hasOwnProperty.call(card, "batchName") && card.batchName !== pack.name) {
    failures.push(`${packId}/card/${String(card.id ?? "")}: batchName does not match owning batch`)
  }
}

export function compareStorageBusinessSnapshots(
  expected: CardImportStorageSnapshot,
  actual: CardImportStorageSnapshot,
): string[] {
  const expectedProjection = projectStorageBusinessSnapshot(expected)
  const actualProjection = projectStorageBusinessSnapshot(actual)
  const failures: string[] = []

  compareValue(
    "packs",
    expectedProjection.packs.map((pack) => pack.id),
    actualProjection.packs.map((pack) => pack.id),
    failures,
  )

  for (const expectedPack of expectedProjection.packs) {
    const actualPack = actualProjection.packs.find((pack) => pack.id === expectedPack.id)
    if (!actualPack) continue

    compareValue(`${expectedPack.id}: disabled`, expectedPack.disabled, actualPack.disabled, failures)
    compareValue(`${expectedPack.id}: index cardCount`, expectedPack.indexCardCount, actualPack.indexCardCount, failures)
    compareValue(`${expectedPack.id}: actual card count`, expectedPack.actualCardCount, actualPack.actualCardCount, failures)
    compareValue(`${expectedPack.id}: card id order`, expectedPack.cardIds, actualPack.cardIds, failures)
    compareImageMetadataConsistency(expectedPack.id, expectedPack, failures)
    compareImageMetadataConsistency(expectedPack.id, actualPack, failures)
    compareValue(`${expectedPack.id}: card type distribution`, expectedPack.cardTypes, actualPack.cardTypes, failures)
    compareValue(`${expectedPack.id}: variantTypes key set`, expectedPack.variantTypeKeys, actualPack.variantTypeKeys, failures)
    compareValue(`${expectedPack.id}: images`, imageContentByCardId(expectedPack), imageContentByCardId(actualPack), failures)
    compareActualImageMimeTypes(expectedPack.id, actualPack, failures)

    for (const expectedCard of expectedPack.cards) {
      const expectedCardId = String(expectedCard.id ?? "")
      const actualCard = actualPack.cards.find((card) => String(card.id ?? "") === expectedCardId)
      compareCardBatchName(expectedPack.id, expectedPack, expectedCard, failures)
      if (!actualCard) {
        failures.push(`${expectedPack.id}/card/${expectedCardId}: missing card`)
        continue
      }
      compareCardBatchName(expectedPack.id, actualPack, actualCard, failures)
      compareValue(`${expectedPack.id}/card/${expectedCardId}: card`, expectedCard, actualCard, failures)
      compareValue(
        `${expectedPack.id}/card/${expectedCardId}: variantSpecial`,
        expectedCard.variantSpecial,
        actualCard.variantSpecial,
        failures,
      )
    }
  }

  return failures
}

function collectRawKeyDiff(
  path: string,
  expected: unknown,
  actual: unknown,
  differences: RawStorageDiffReport["differences"],
) {
  const expectedRecord = readRecord(expected)
  const actualRecord = readRecord(actual)
  const allKeys = [...new Set([...Object.keys(expectedRecord), ...Object.keys(actualRecord)])].sort()
  for (const key of allKeys) {
    if (stable(expectedRecord[key]) !== stable(actualRecord[key])) {
      differences.push({ path: `${path}.${key}`, expected: expectedRecord[key], actual: actualRecord[key] })
    }
  }
}

export function buildRawStorageDiffReport(
  expected: CardImportStorageSnapshot,
  actual: CardImportStorageSnapshot,
): RawStorageDiffReport {
  const differences: RawStorageDiffReport["differences"] = []
  collectRawKeyDiff("index", expected.index, actual.index, differences)

  const packIds = [...new Set([...Object.keys(expected.batches), ...Object.keys(actual.batches)])].sort()
  for (const packId of packIds) {
    const expectedBatch = expected.batches[packId]
    const actualBatch = actual.batches[packId]
    collectRawKeyDiff(`batches.${packId}.metadata`, expectedBatch?.metadata, actualBatch?.metadata, differences)
    collectRawKeyDiff(
      `batches.${packId}.customFieldDefinitions`,
      expectedBatch?.customFieldDefinitions,
      actualBatch?.customFieldDefinitions,
      differences,
    )
    collectRawKeyDiff(`batches.${packId}.variantTypes`, expectedBatch?.variantTypes, actualBatch?.variantTypes, differences)

    const expectedCards = readArray(expectedBatch?.cards)
    const actualCards = readArray(actualBatch?.cards)
    if (expectedCards.length !== actualCards.length) {
      differences.push({ path: `batches.${packId}.cards.length`, expected: expectedCards.length, actual: actualCards.length })
    }
    const cardCount = Math.min(expectedCards.length, actualCards.length)
    for (let index = 0; index < cardCount; index += 1) {
      collectRawKeyDiff(`batches.${packId}.cards.${index}`, expectedCards[index], actualCards[index], differences)
    }
  }

  return { differences }
}

export async function verifyActualImageBackendReadable(
  snapshot: CardImportStorageSnapshot,
  images: CardPackImageBackend,
): Promise<string[]> {
  const failures: string[] = []
  for (const [packId, imageSnapshot] of Object.entries(snapshot.images)) {
    for (const expectedImage of imageSnapshot.items) {
      const actualImage = await images.getImage(expectedImage.cardId, packId)
      if (!actualImage) {
        failures.push(`${packId}/${expectedImage.cardId}: image is not readable from image backend`)
        continue
      }
      if (actualImage.mimeType !== expectedImage.mimeType) {
        failures.push(`${packId}/${expectedImage.cardId}: image MIME mismatch`)
      }
      if (actualImage.blob.size !== expectedImage.byteLength) {
        failures.push(`${packId}/${expectedImage.cardId}: image byteLength mismatch`)
      }
    }
  }
  return failures
}

export interface RuntimeBusinessSnapshot {
  cardIds: string[]
  cardsByType: Record<string, string[]>
  aggregatedCustomFields: Record<string, string[]>
  aggregatedVariantTypeKeys: string[]
  publicApi: {
    standardByType: Record<string, string[]>
    standardById: Record<string, string | null>
    customCardIds: string[]
    customByType: Record<string, string[]>
    cardsByBatch: Record<string, string[]>
    customBatches: RuntimeBatchSummary[]
    allBatches: RuntimeBatchSummary[]
    cardBatchNames: Record<string, string | null>
  }
  standardClassOptions: Record<string, Array<{ value: string; label: string }>>
  predefinedNames: {
    professions: string[]
    ancestries: string[]
    communities: string[]
    subclasses: string[]
    domains: string[]
  }
  variantOptions: {
    fullTypes: Record<string, unknown>
    typeNames: string[]
    availableTypes: Array<{ value: string; label: string }>
    byType: Record<
      string,
      {
        rawSubclasses: string[]
        subclassOptions: Array<{ value: string; label: string }>
        levelOptions: Array<{ value: string; label: string }>
      }
    >
  }
  subclassCardIndex: Record<string, Record<string, string[]>>
  levelCardIndex: Record<string, Record<string, string[]>>
  batchKeywordIndex: Record<string, Record<string, string[]>>
  batchLevelIndex: Record<string, Record<string, string[]>>
  variantCards: Array<{
    id: string
    level?: unknown
    hasLocalImage?: unknown
    realType?: unknown
    subCategory?: unknown
  }>
}

interface RuntimeBatchSummary {
  id: string
  name: string
  fileName: string
  author?: string
  version?: string
  cardCount: number
  cardTypes: string[]
  disabled: boolean
}

function sortRecordDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortRecordDeep)
  if (!isRecord(value)) return value

  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, sortRecordDeep(child)]),
  )
}

function normalizeOptions(options: Array<{ value: unknown; label: unknown }>): Array<{ value: string; label: string }> {
  return options.map((option) => ({ value: String(option.value), label: String(option.label) }))
}

function normalizeNestedIndexAsSets(index: unknown): Record<string, Record<string, string[]>> {
  const result: Record<string, Record<string, string[]>> = {}
  for (const [outerKey, outerValue] of Object.entries(readRecord(index)).sort(([left], [right]) => left.localeCompare(right))) {
    result[outerKey] = {}
    for (const [innerKey, innerValue] of Object.entries(readRecord(outerValue)).sort(([left], [right]) =>
      left.localeCompare(right),
    )) {
      result[outerKey][innerKey] = sortedUnique(readArray(innerValue).map(String))
    }
  }
  return result
}

function preserveStringArraysByKey(value: unknown): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const [key, arrayValue] of Object.entries(readRecord(value)).sort(([left], [right]) => left.localeCompare(right))) {
    if (key === "variants") continue
    result[key] = readArray(arrayValue).map(String)
  }
  return result
}

function installStorageSnapshotIntoLocalStorage(snapshot: CardImportStorageSnapshot) {
  localStorage.removeItem(STORAGE_KEYS.INDEX)
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index)
    if (key?.startsWith(STORAGE_KEYS.BATCH_PREFIX)) localStorage.removeItem(key)
  }

  localStorage.setItem(STORAGE_KEYS.INDEX, JSON.stringify(snapshot.index))
  for (const [packId, batch] of Object.entries(snapshot.batches)) {
    localStorage.setItem(`${STORAGE_KEYS.BATCH_PREFIX}${packId}`, JSON.stringify(batch))
  }
}

function resetStoreForRuntimeProjection() {
  useUnifiedCardStore.setState({
    batches: new Map(),
    cards: new Map(),
    cardsByType: new Map(),
    index: {
      batches: {},
      totalCards: 0,
      totalBatches: 0,
      lastUpdate: "2026-06-18T00:00:00.000Z",
    },
    aggregatedCustomFields: null,
    aggregatedVariantTypes: null,
    subclassCardIndex: null,
    levelCardIndex: null,
    batchKeywordIndex: null,
    batchLevelIndex: null,
    stats: null,
    cacheValid: false,
    initialized: true,
  })
}

function collectCardsByType() {
  const store = useUnifiedCardStore.getState()
  const result: Record<string, string[]> = {}
  for (const type of Object.values(CardType)) {
    const cardIds = store.loadCardsByType(type).map((card) => card.id)
    if (cardIds.length > 0) result[type] = cardIds
  }
  return result
}

function normalizeBatchSummaries(batches: any[]): RuntimeBatchSummary[] {
  return batches.map((batch) => ({
    id: String(batch.id ?? ""),
    name: String(batch.name ?? ""),
    fileName: String(batch.fileName ?? ""),
    ...(batch.author !== undefined ? { author: String(batch.author) } : {}),
    ...(batch.version !== undefined ? { version: String(batch.version) } : {}),
    cardCount: Number(batch.cardCount ?? 0),
    cardTypes: readArray(batch.cardTypes).map(String),
    disabled: batch.disabled === true,
  }))
}

function packIdsFromSnapshot(snapshot: CardImportStorageSnapshot): string[] {
  return Object.keys(readRecord(readRecord(snapshot.index).batches)).sort((left, right) => left.localeCompare(right))
}

function cardIdsFromSnapshot(snapshot: CardImportStorageSnapshot, packIds: string[]): string[] {
  return packIds.flatMap((packId) => readArray(snapshot.batches[packId]?.cards).map((card) => String(readRecord(card).id ?? "")))
}

function collectPublicApiSnapshot(
  allSnapshotCardIds: string[],
  packIds: string[],
): RuntimeBusinessSnapshot["publicApi"] {
  const standardByType: Record<string, string[]> = {}
  const customByType: Record<string, string[]> = {}
  const standardById: Record<string, string | null> = {}
  const cardBatchNames: Record<string, string | null> = {}

  for (const type of Object.values(CardType)) {
    const standardIds = getStandardCardsByType(type).map((card) => card.id)
    const customIds = getCustomCardsByType(type).map((card) => card.id)
    if (standardIds.length > 0) standardByType[type] = standardIds
    if (customIds.length > 0) customByType[type] = customIds
  }

  for (const id of allSnapshotCardIds) {
    const card = getStandardCardById(id)
    standardById[id] = card?.id ?? null
    cardBatchNames[id] = (card as any)?.batchName ?? null
  }

  return {
    standardByType,
    standardById,
    customCardIds: getCustomCards().map((card) => card.id),
    customByType,
    cardsByBatch: Object.fromEntries(packIds.map((packId) => [packId, getCardsByBatchId(packId).map((card) => card.id)])),
    customBatches: normalizeBatchSummaries(getCustomCardBatches()),
    allBatches: normalizeBatchSummaries(getAllBatches()),
    cardBatchNames,
  }
}

function collectStandardClassOptions() {
  const result: Record<string, Array<{ value: string; label: string }>> = {}
  for (const type of Object.values(CardType)) {
    const options = normalizeOptions(getCardClassOptionsForType(type))
    if (options.length > 0) result[type] = options
  }
  return result
}

function collectPredefinedNames(): RuntimeBusinessSnapshot["predefinedNames"] {
  return {
    professions: getProfessionCardNames(),
    ancestries: getAncestryCardNames(),
    communities: getCommunityCardNames(),
    subclasses: getSubClassCardNames(),
    domains: getDomainCardNames(),
  }
}

function normalizeVariantTypesForRuntimeSnapshot(): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(getVariantTypes())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([typeName, definition]) => {
        const { description: _description, ...businessDefinition } = readRecord(definition)
        return [typeName, sortRecordDeep(businessDefinition)]
      }),
  )
}

function collectVariantOptions(): RuntimeBusinessSnapshot["variantOptions"] {
  const fullTypes = normalizeVariantTypesForRuntimeSnapshot()
  const byType: RuntimeBusinessSnapshot["variantOptions"]["byType"] = {}

  for (const typeName of Object.keys(fullTypes).sort((left, right) => left.localeCompare(right))) {
    byType[typeName] = {
      rawSubclasses: getVariantSubclasses(typeName),
      subclassOptions: normalizeOptions(getVariantSubclassOptions(typeName)),
      levelOptions: normalizeOptions(getVariantLevelOptions(typeName)),
    }
  }

  return {
    fullTypes,
    typeNames: getVariantTypeNames(),
    availableTypes: normalizeOptions(getAvailableVariantTypes()),
    byType,
  }
}

export async function projectRuntimeBusinessSnapshotFromStorage(
  snapshot: CardImportStorageSnapshot,
): Promise<RuntimeBusinessSnapshot> {
  installStorageSnapshotIntoLocalStorage(snapshot)
  resetStoreForRuntimeProjection()

  const store = useUnifiedCardStore.getState()
  await store.reloadCustomRuntimeFromStorage()

  const state = useUnifiedCardStore.getState()
  const visibleCards = state.loadAllCards()
  const packIds = packIdsFromSnapshot(snapshot)
  const allSnapshotCardIds = cardIdsFromSnapshot(snapshot, packIds)

  return {
    cardIds: visibleCards.map((card) => card.id),
    cardsByType: collectCardsByType(),
    aggregatedCustomFields: preserveStringArraysByKey(state.aggregatedCustomFields ?? {}),
    aggregatedVariantTypeKeys: Object.keys(state.aggregatedVariantTypes ?? {}).sort((left, right) => left.localeCompare(right)),
    publicApi: collectPublicApiSnapshot(allSnapshotCardIds, packIds),
    standardClassOptions: collectStandardClassOptions(),
    predefinedNames: collectPredefinedNames(),
    variantOptions: collectVariantOptions(),
    subclassCardIndex: normalizeNestedIndexAsSets(state.subclassCardIndex ?? {}),
    levelCardIndex: normalizeNestedIndexAsSets(state.levelCardIndex ?? {}),
    batchKeywordIndex: normalizeNestedIndexAsSets(state.batchKeywordIndex ?? {}),
    batchLevelIndex: normalizeNestedIndexAsSets(state.batchLevelIndex ?? {}),
    variantCards: visibleCards
      .filter((card) => readRecord(card).type === CardType.Variant)
      .map((card) => {
        const record = readRecord(card)
        const variantSpecial = readRecord(record.variantSpecial)
        return {
          id: String(record.id ?? ""),
          ...(record.level !== undefined ? { level: record.level } : {}),
          ...(record.hasLocalImage !== undefined ? { hasLocalImage: record.hasLocalImage } : {}),
          ...(variantSpecial.realType !== undefined ? { realType: variantSpecial.realType } : {}),
          ...(variantSpecial.subCategory !== undefined ? { subCategory: variantSpecial.subCategory } : {}),
        }
      })
      .sort((left, right) => left.id.localeCompare(right.id)),
  }
}

export function compareRuntimeBusinessSnapshots(
  expected: RuntimeBusinessSnapshot,
  actual: RuntimeBusinessSnapshot,
): string[] {
  const failures: string[] = []
  compareValue("runtime cardIds", expected.cardIds, actual.cardIds, failures)
  compareValue("cardsByType", expected.cardsByType, actual.cardsByType, failures)
  compareValue("aggregatedVariantTypeKeys", expected.aggregatedVariantTypeKeys, actual.aggregatedVariantTypeKeys, failures)
  compareValue("publicApi", expected.publicApi, actual.publicApi, failures)
  compareValue("standardClassOptions", expected.standardClassOptions, actual.standardClassOptions, failures)
  compareValue("variantOptions", runtimeComparableVariantOptions(expected), runtimeComparableVariantOptions(actual), failures)
  compareValue("subclassCardIndex", expected.subclassCardIndex, actual.subclassCardIndex, failures)
  compareValue("levelCardIndex", expected.levelCardIndex, actual.levelCardIndex, failures)
  compareValue("batchKeywordIndex", expected.batchKeywordIndex, actual.batchKeywordIndex, failures)
  compareValue("batchLevelIndex", expected.batchLevelIndex, actual.batchLevelIndex, failures)
  compareValue("variantCards", expected.variantCards, actual.variantCards, failures)
  verifyActualCustomFieldDerivedConsistency(actual, failures)
  verifyActualVariantDerivedConsistency(actual, failures)
  return failures
}

function runtimeComparableVariantOptions(snapshot: RuntimeBusinessSnapshot) {
  return {
    typeNames: snapshot.variantOptions.typeNames,
    availableTypes: snapshot.variantOptions.availableTypes,
    byType: Object.fromEntries(
      Object.entries(snapshot.variantOptions.byType)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([typeName, options]) => [
          typeName,
          {
            rawSubclasses: options.rawSubclasses,
            subclassOptions: options.subclassOptions,
          },
        ]),
    ),
  }
}

const CUSTOM_FIELD_INDEX_TYPES: Record<string, CardType> = {
  professions: CardType.Profession,
  domains: CardType.Domain,
  subclasses: CardType.Subclass,
  ancestries: CardType.Ancestry,
  communities: CardType.Community,
}

function verifyActualCustomFieldDerivedConsistency(actual: RuntimeBusinessSnapshot, failures: string[]) {
  for (const [category, cardType] of Object.entries(CUSTOM_FIELD_INDEX_TYPES)) {
    const definedNames = new Set(actual.aggregatedCustomFields[category] ?? [])
    if (category === "subclasses") {
      for (const professionName of actual.aggregatedCustomFields.professions ?? []) definedNames.add(professionName)
    }
    const publicHelperNames = new Set(actual.predefinedNames[category as keyof RuntimeBusinessSnapshot["predefinedNames"]] ?? [])
    const runtimeClasses = actual.subclassCardIndex[cardType] ?? {}
    for (const [className, cardIds] of Object.entries(runtimeClasses)) {
      if (className === "__no_subclass__" || cardIds.length === 0) continue
      if (!definedNames.has(className)) {
        failures.push(`actual aggregatedCustomFields.${category} does not cover runtime-visible class ${className}`)
      }
      if (!publicHelperNames.has(className)) {
        failures.push(`actual predefinedNames.${category} does not cover runtime-visible class ${className}`)
      }
    }
  }
}

function optionValueSet(options: Array<{ value: string; label: string }>): Set<string> {
  return new Set(options.map((option) => option.value))
}

function hasMeaningfulValue(value: unknown): boolean {
  return value !== undefined && value !== null && String(value).trim() !== ""
}

function hasValidRuntimeLevel(value: unknown): boolean {
  if (!hasMeaningfulValue(value)) return false
  const numericValue = Number(value)
  return Number.isFinite(numericValue) && numericValue > 0
}

function verifyActualVariantDerivedConsistency(actual: RuntimeBusinessSnapshot, failures: string[]) {
  const aggregatedTypeKeys = new Set(actual.aggregatedVariantTypeKeys)
  const typeNames = new Set(actual.variantOptions.typeNames)
  const availableTypes = optionValueSet(actual.variantOptions.availableTypes)
  const actualLevelsByType = new Map<string, Set<string>>()

  for (const card of actual.variantCards) {
    if (!hasMeaningfulValue(card.realType)) continue
    const typeName = String(card.realType)

    if (!aggregatedTypeKeys.has(typeName)) {
      failures.push(`actual aggregatedVariantTypeKeys does not cover runtime-visible variant type ${typeName}`)
    }
    if (!typeNames.has(typeName)) {
      failures.push(`actual variantOptions.typeNames does not cover runtime-visible variant type ${typeName}`)
    }
    if (!availableTypes.has(typeName)) {
      failures.push(`actual variantOptions.availableTypes does not cover runtime-visible variant type ${typeName}`)
    }

    if (hasMeaningfulValue(card.subCategory)) {
      const subclassName = String(card.subCategory)
      const subclassIndexCardIds = actual.subclassCardIndex[typeName]?.[subclassName] ?? []
      if (!subclassIndexCardIds.includes(card.id)) {
        failures.push(`actual subclassCardIndex.${typeName}.${subclassName} does not cover runtime-visible card ${card.id}`)
      }

      const rawSubclasses = new Set(actual.variantOptions.byType[typeName]?.rawSubclasses ?? [])
      if (!rawSubclasses.has(subclassName)) {
        failures.push(`actual variantOptions.byType.${typeName}.rawSubclasses does not cover runtime-visible subclass ${subclassName}`)
      }

      const subclassOptions = optionValueSet(actual.variantOptions.byType[typeName]?.subclassOptions ?? [])
      if (!subclassOptions.has(subclassName)) {
        failures.push(`actual variantOptions.byType.${typeName}.subclassOptions does not cover runtime-visible subclass ${subclassName}`)
      }
    }

    if (hasValidRuntimeLevel(card.level)) {
      const level = String(card.level)
      if (!actualLevelsByType.has(typeName)) actualLevelsByType.set(typeName, new Set())
      actualLevelsByType.get(typeName)?.add(level)

      const levelIndexCardIds = actual.levelCardIndex[typeName]?.[level] ?? []
      if (!levelIndexCardIds.includes(card.id)) {
        failures.push(`actual levelCardIndex.${typeName}.${level} does not cover runtime-visible card ${card.id}`)
      }
    }
  }

  for (const [typeName, levels] of actualLevelsByType) {
    const levelOptions = actual.variantOptions.byType[typeName]?.levelOptions ?? []
    const levelOptionValues = optionValueSet(levelOptions)
    for (const level of levels) {
      if (levelOptions.length === 0) {
        failures.push(`actual variantOptions.byType.${typeName}.levelOptions is empty but runtime-visible level ${level} exists`)
      } else if (!levelOptionValues.has(level)) {
        failures.push(`actual variantOptions.byType.${typeName}.levelOptions does not cover runtime-visible level ${level}`)
      }
    }
  }
}
