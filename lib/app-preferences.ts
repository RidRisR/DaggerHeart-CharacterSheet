export const APP_PREFERENCES_STORAGE_KEY = "dhsheet:app-preferences:v1"
export const LEGACY_TEXT_MODE_STORAGE_KEY = "text-mode-storage"
export const LEGACY_DUAL_PAGE_STORAGE_KEY = "dual-page-storage"
export const LEGACY_ANNOUNCEMENT_READ_STORAGE_KEY = "dhsheet:last-read-announcement-id"
export const SYSTEM_BUILTIN_CARDS_SOURCE_ID = "SYSTEM_BUILTIN_CARDS"

const APP_PREFERENCES_FORMAT = "dhsheet.app-preferences.v1"
const KNOWN_EQUIPMENT_SOURCE_IDS = new Set(["builtin"])
const KNOWN_CARD_SOURCE_IDS = new Set([SYSTEM_BUILTIN_CARDS_SOURCE_ID])

export type CardDisplayMode = "image" | "text"

export interface DualPagePreferences {
  enabled: boolean
  leftPageId: string
  rightPageId: string
  leftTabValue: string
  rightTabValue: string
}

export interface AppPreferencesDocument {
  format: typeof APP_PREFERENCES_FORMAT
  ui: {
    cardDisplayMode: CardDisplayMode
    dualPage: DualPagePreferences
  }
  announcements: {
    lastReadAnnouncementId?: string
  }
  contentSources: {
    equipmentDisabledSourceIds: string[]
    cardDisabledSourceIds: string[]
  }
}

type PersistedAppPreferencesDocument = Omit<AppPreferencesDocument, "contentSources"> & {
  contentSources: {
    equipmentDisabledSourceIds: string[]
    cardDisabledSourceIds?: string[]
  }
}

export type AppPreferencesStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">

const DEFAULT_DUAL_PAGE: DualPagePreferences = {
  enabled: false,
  leftPageId: "page1",
  rightPageId: "page2",
  leftTabValue: "page1",
  rightTabValue: "page2",
}

const DEFAULT_APP_PREFERENCES: AppPreferencesDocument = {
  format: APP_PREFERENCES_FORMAT,
  ui: {
    cardDisplayMode: "image",
    dualPage: DEFAULT_DUAL_PAGE,
  },
  announcements: {},
  contentSources: {
    equipmentDisabledSourceIds: [],
    cardDisabledSourceIds: [],
  },
}

function getDefaultStorage(): AppPreferencesStorage | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

function cloneDefaults(): AppPreferencesDocument {
  return {
    format: APP_PREFERENCES_FORMAT,
    ui: {
      cardDisplayMode: DEFAULT_APP_PREFERENCES.ui.cardDisplayMode,
      dualPage: { ...DEFAULT_DUAL_PAGE },
    },
    announcements: {},
    contentSources: {
      equipmentDisabledSourceIds: [],
      cardDisabledSourceIds: [],
    },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseJson(raw: string | null): unknown {
  if (raw === null) return undefined

  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

function safeGetItem(storage: AppPreferencesStorage | undefined, key: string): string | null {
  if (!storage) return null

  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

function safeSetItem(storage: AppPreferencesStorage | undefined, key: string, value: string): boolean {
  if (!storage) return false

  try {
    storage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

function safeRemoveItem(storage: AppPreferencesStorage | undefined, key: string): void {
  if (!storage) return

  try {
    storage.removeItem(key)
  } catch {
    // Legacy cleanup is best-effort after the new preference document is written.
  }
}

function normalizeCardDisplayMode(value: unknown): CardDisplayMode {
  return value === "text" ? "text" : "image"
}

function normalizeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback
}

function normalizeDualPage(value: unknown): DualPagePreferences {
  const source = isRecord(value) ? value : {}
  return {
    enabled: source.enabled === true,
    leftPageId: normalizeString(source.leftPageId, DEFAULT_DUAL_PAGE.leftPageId),
    rightPageId: normalizeString(source.rightPageId, DEFAULT_DUAL_PAGE.rightPageId),
    leftTabValue: normalizeString(source.leftTabValue, DEFAULT_DUAL_PAGE.leftTabValue),
    rightTabValue: normalizeString(source.rightTabValue, DEFAULT_DUAL_PAGE.rightTabValue),
  }
}

function normalizeEquipmentDisabledSourceIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  const normalized = new Set<string>()
  for (const sourceId of value) {
    if (typeof sourceId === "string" && KNOWN_EQUIPMENT_SOURCE_IDS.has(sourceId)) {
      normalized.add(sourceId)
    }
  }
  return Array.from(normalized)
}

function normalizeCardDisabledSourceIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  const normalized = new Set<string>()
  for (const sourceId of value) {
    if (typeof sourceId === "string" && KNOWN_CARD_SOURCE_IDS.has(sourceId)) {
      normalized.add(sourceId)
    }
  }
  return Array.from(normalized)
}

function normalizePreferences(value: unknown): AppPreferencesDocument | null {
  if (!isRecord(value) || value.format !== APP_PREFERENCES_FORMAT) {
    return null
  }

  const ui = isRecord(value.ui) ? value.ui : {}
  const announcements = isRecord(value.announcements) ? value.announcements : {}
  const contentSources = isRecord(value.contentSources) ? value.contentSources : {}
  const normalized = cloneDefaults()

  normalized.ui.cardDisplayMode = normalizeCardDisplayMode(ui.cardDisplayMode)
  normalized.ui.dualPage = normalizeDualPage(ui.dualPage)

  if (typeof announcements.lastReadAnnouncementId === "string" && announcements.lastReadAnnouncementId.length > 0) {
    normalized.announcements.lastReadAnnouncementId = announcements.lastReadAnnouncementId
  }

  normalized.contentSources.equipmentDisabledSourceIds = normalizeEquipmentDisabledSourceIds(
    contentSources.equipmentDisabledSourceIds,
  )
  normalized.contentSources.cardDisabledSourceIds = normalizeCardDisabledSourceIds(contentSources.cardDisabledSourceIds)

  return normalized
}

function hasOwnProperty(value: Record<string, unknown>, property: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, property)
}

function rawHasCardDisabledSourceIds(value: unknown): boolean {
  if (!isRecord(value) || value.format !== APP_PREFERENCES_FORMAT || !isRecord(value.contentSources)) {
    return false
  }

  return hasOwnProperty(value.contentSources, "cardDisabledSourceIds")
}

function legacyTextMode(storage: AppPreferencesStorage | undefined): CardDisplayMode | undefined {
  const parsed = parseJson(safeGetItem(storage, LEGACY_TEXT_MODE_STORAGE_KEY))
  if (!isRecord(parsed) || !isRecord(parsed.state)) return undefined

  return parsed.state.isTextMode === true ? "text" : undefined
}

function legacyDualPage(storage: AppPreferencesStorage | undefined): DualPagePreferences | undefined {
  const parsed = parseJson(safeGetItem(storage, LEGACY_DUAL_PAGE_STORAGE_KEY))
  if (!isRecord(parsed) || !isRecord(parsed.state)) return undefined

  return {
    enabled: parsed.state.isDualPageMode === true,
    leftPageId: normalizeString(parsed.state.leftPageId, DEFAULT_DUAL_PAGE.leftPageId),
    rightPageId: normalizeString(parsed.state.rightPageId, DEFAULT_DUAL_PAGE.rightPageId),
    leftTabValue: normalizeString(parsed.state.leftTabValue, DEFAULT_DUAL_PAGE.leftTabValue),
    rightTabValue: normalizeString(parsed.state.rightTabValue, DEFAULT_DUAL_PAGE.rightTabValue),
  }
}

function hydrateFromLegacy(storage: AppPreferencesStorage | undefined): AppPreferencesDocument {
  const preferences = cloneDefaults()
  const legacyDisplayMode = legacyTextMode(storage)
  const legacyDual = legacyDualPage(storage)
  const legacyAnnouncement = safeGetItem(storage, LEGACY_ANNOUNCEMENT_READ_STORAGE_KEY)

  if (legacyDisplayMode) preferences.ui.cardDisplayMode = legacyDisplayMode
  if (legacyDual) preferences.ui.dualPage = legacyDual
  if (legacyAnnouncement) preferences.announcements.lastReadAnnouncementId = legacyAnnouncement

  return preferences
}

function serializePreferences(
  preferences: AppPreferencesDocument,
  options: { includeCardDisabledSourceIds: boolean },
): PersistedAppPreferencesDocument {
  const contentSources: PersistedAppPreferencesDocument["contentSources"] = {
    equipmentDisabledSourceIds: preferences.contentSources.equipmentDisabledSourceIds,
  }

  if (options.includeCardDisabledSourceIds) {
    contentSources.cardDisabledSourceIds = preferences.contentSources.cardDisabledSourceIds
  }

  return {
    ...preferences,
    contentSources,
  }
}

function writePreferences(
  storage: AppPreferencesStorage | undefined,
  preferences: AppPreferencesDocument,
  options: { includeCardDisabledSourceIds?: boolean } = {},
): boolean {
  return safeSetItem(
    storage,
    APP_PREFERENCES_STORAGE_KEY,
    JSON.stringify(
      serializePreferences(preferences, {
        includeCardDisabledSourceIds: options.includeCardDisabledSourceIds === true,
      }),
    ),
  )
}

function cleanupLegacyKeys(storage: AppPreferencesStorage | undefined): void {
  safeRemoveItem(storage, LEGACY_TEXT_MODE_STORAGE_KEY)
  safeRemoveItem(storage, LEGACY_DUAL_PAGE_STORAGE_KEY)
  safeRemoveItem(storage, LEGACY_ANNOUNCEMENT_READ_STORAGE_KEY)
}

export function getAppPreferences(storage: AppPreferencesStorage | undefined = getDefaultStorage()): AppPreferencesDocument {
  const raw = parseJson(safeGetItem(storage, APP_PREFERENCES_STORAGE_KEY))
  const existing = normalizePreferences(raw)
  if (existing) return existing

  const migrated = hydrateFromLegacy(storage)
  if (writePreferences(storage, migrated, { includeCardDisabledSourceIds: rawHasCardDisabledSourceIds(raw) })) {
    cleanupLegacyKeys(storage)
  }
  return migrated
}

function updatePreferences(
  updater: (preferences: AppPreferencesDocument) => AppPreferencesDocument,
  storage: AppPreferencesStorage | undefined = getDefaultStorage(),
  options: { includeCardDisabledSourceIds?: boolean } = {},
): boolean {
  const raw = parseJson(safeGetItem(storage, APP_PREFERENCES_STORAGE_KEY))
  const next = updater(getAppPreferences(storage))
  return writePreferences(storage, next, {
    includeCardDisabledSourceIds: options.includeCardDisabledSourceIds === true || rawHasCardDisabledSourceIds(raw),
  })
}

export function getCardDisplayMode(storage?: AppPreferencesStorage): CardDisplayMode {
  return getAppPreferences(storage).ui.cardDisplayMode
}

export function setCardDisplayMode(mode: CardDisplayMode, storage?: AppPreferencesStorage): void {
  updatePreferences(
    (preferences) => ({
      ...preferences,
      ui: { ...preferences.ui, cardDisplayMode: normalizeCardDisplayMode(mode) },
    }),
    storage,
  )
}

export function getDualPagePreferences(storage?: AppPreferencesStorage): DualPagePreferences {
  return getAppPreferences(storage).ui.dualPage
}

export function setDualPagePreferences(partial: Partial<DualPagePreferences>, storage?: AppPreferencesStorage): void {
  updatePreferences(
    (preferences) => ({
      ...preferences,
      ui: {
        ...preferences.ui,
        dualPage: normalizeDualPage({ ...preferences.ui.dualPage, ...partial }),
      },
    }),
    storage,
  )
}

export function isLatestAnnouncementRead(latestId: string | null | undefined, storage?: AppPreferencesStorage): boolean {
  if (!latestId) return true
  return getAppPreferences(storage).announcements.lastReadAnnouncementId === latestId
}

export function markAnnouncementRead(id: string | null | undefined, storage?: AppPreferencesStorage): void {
  if (!id) return
  updatePreferences(
    (preferences) => ({
      ...preferences,
      announcements: { ...preferences.announcements, lastReadAnnouncementId: id },
    }),
    storage,
  )
}

export function getEquipmentDisabledSourceIds(storage?: AppPreferencesStorage): string[] {
  return getAppPreferences(storage).contentSources.equipmentDisabledSourceIds
}

export function getCardDisabledSourceIds(storage?: AppPreferencesStorage): string[] {
  return getAppPreferences(storage).contentSources.cardDisabledSourceIds
}

export function setEquipmentSourceDisabled(
  sourceId: string,
  disabled: boolean,
  storage?: AppPreferencesStorage,
): boolean {
  if (!KNOWN_EQUIPMENT_SOURCE_IDS.has(sourceId)) return false

  return updatePreferences(
    (preferences) => {
      const sourceIds = new Set(preferences.contentSources.equipmentDisabledSourceIds)
      if (disabled) {
        sourceIds.add(sourceId)
      } else {
        sourceIds.delete(sourceId)
      }

      return {
        ...preferences,
        contentSources: {
          ...preferences.contentSources,
          equipmentDisabledSourceIds: Array.from(sourceIds),
        },
      }
    },
    storage,
  )
}

export function setCardSourceDisabled(
  sourceId: string,
  disabled: boolean,
  storage?: AppPreferencesStorage,
): boolean {
  if (!KNOWN_CARD_SOURCE_IDS.has(sourceId)) return false

  return updatePreferences(
    (preferences) => {
      const next = new Set(preferences.contentSources.cardDisabledSourceIds)
      if (disabled) {
        next.add(sourceId)
      } else {
        next.delete(sourceId)
      }

      return {
        ...preferences,
        contentSources: {
          ...preferences.contentSources,
          cardDisabledSourceIds: Array.from(next),
        },
      }
    },
    storage,
    { includeCardDisabledSourceIds: true },
  )
}
