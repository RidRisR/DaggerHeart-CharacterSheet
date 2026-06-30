import type { SheetData } from '@/lib/sheet-data'
import {
  CHARACTER_DATA_PREFIX,
  loadCharacterList,
} from '@/lib/multi-character-storage'
import { migrateSheetData } from '@/lib/sheet-data-migration'
import { projectSheetForStorage } from './sheet-image-projection'
import {
  characterImageKey,
  deleteCharacterImage,
  getCharacterImage,
  saveCharacterImage,
} from './character-image-repository'
import type { CharacterImageRecord, CharacterImageRole, CharacterSheetImageField } from './character-image-types'
import { isImageDataUrl } from './data-url'

export const CHARACTER_IMAGE_ASSET_MIGRATION_KEY = 'dh_character-image-asset-migration-version'
export const CHARACTER_IMAGE_ASSET_MIGRATION_VERSION = '1'

const IMAGE_FIELDS: Array<{ field: CharacterSheetImageField; role: CharacterImageRole }> = [
  { field: 'characterImage', role: 'portrait' },
  { field: 'companionImage', role: 'companion' },
]

export interface CharacterImageStartupMigrationResult {
  scannedCount: number
  migratedCount: number
  skippedCount: number
}

function characterStorageKey(characterId: string): string {
  return `${CHARACTER_DATA_PREFIX}${characterId}`
}

function hasEmbeddedCharacterImage(sheetData: SheetData): boolean {
  return IMAGE_FIELDS.some(({ field }) => isImageDataUrl(sheetData[field]))
}

function hasAnyEmbeddedCharacterImagePayload(): boolean {
  const list = loadCharacterList()

  for (const character of list.characters) {
    const raw = localStorage.getItem(characterStorageKey(character.id))
    if (raw?.includes('data:image/')) return true
  }

  return false
}

function writeStoredCharacterSheet(characterId: string, sheetData: SheetData): void {
  localStorage.setItem(characterStorageKey(characterId), JSON.stringify(sheetData))
}

async function snapshotWritableImageRecords(
  characterId: string,
  sheetData: SheetData,
): Promise<Map<string, CharacterImageRecord | null>> {
  const snapshots = new Map<string, CharacterImageRecord | null>()

  for (const { field, role } of IMAGE_FIELDS) {
    if (!isImageDataUrl(sheetData[field])) continue
    const key = characterImageKey(characterId, role)
    snapshots.set(key, await getCharacterImage(key))
  }

  return snapshots
}

async function restoreImageSnapshots(snapshots: Map<string, CharacterImageRecord | null>): Promise<void> {
  await Promise.all([...snapshots.entries()].map(async ([key, previous]) => {
    if (!previous) {
      await deleteCharacterImage(key)
      return
    }

    await saveCharacterImage({
      characterId: previous.characterId,
      role: previous.role,
      blob: previous.blob,
      mimeType: previous.mimeType,
    })
  }))
}

export async function migrateCharacterSaveImagesToAssets(): Promise<CharacterImageStartupMigrationResult> {
  const marker = localStorage.getItem(CHARACTER_IMAGE_ASSET_MIGRATION_KEY)
  if (marker === CHARACTER_IMAGE_ASSET_MIGRATION_VERSION && !hasAnyEmbeddedCharacterImagePayload()) {
    return { scannedCount: 0, migratedCount: 0, skippedCount: 0 }
  }

  const list = loadCharacterList()
  let migratedCount = 0
  let skippedCount = 0

  for (const character of list.characters) {
    const storageKey = characterStorageKey(character.id)
    const previousRaw = localStorage.getItem(storageKey)

    if (!previousRaw) {
      skippedCount += 1
      continue
    }

    const parsed = JSON.parse(previousRaw)
    const migrated = migrateSheetData(parsed)

    if (!hasEmbeddedCharacterImage(migrated)) {
      skippedCount += 1
      continue
    }

    const snapshots = await snapshotWritableImageRecords(character.id, migrated)
    let projection: Awaited<ReturnType<typeof projectSheetForStorage>>

    try {
      projection = await projectSheetForStorage(character.id, migrated)
    } catch (error) {
      try {
        await restoreImageSnapshots(snapshots)
      } catch (rollbackError) {
        console.error(`[CharacterImageMigration] Failed to rollback images for ${character.id}:`, rollbackError)
      }

      throw error
    }

    try {
      writeStoredCharacterSheet(character.id, projection.storedSheet)
      migratedCount += 1
    } catch (error) {
      try {
        localStorage.setItem(storageKey, previousRaw)
      } catch (rollbackError) {
        console.error(`[CharacterImageMigration] Failed to restore character ${character.id}:`, rollbackError)
      }

      try {
        await restoreImageSnapshots(snapshots)
      } catch (rollbackError) {
        console.error(`[CharacterImageMigration] Failed to rollback images for ${character.id}:`, rollbackError)
      }

      throw error
    }
  }

  localStorage.setItem(CHARACTER_IMAGE_ASSET_MIGRATION_KEY, CHARACTER_IMAGE_ASSET_MIGRATION_VERSION)

  return {
    scannedCount: list.characters.length,
    migratedCount,
    skippedCount,
  }
}
