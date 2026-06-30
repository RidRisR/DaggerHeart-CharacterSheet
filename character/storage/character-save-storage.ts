import type { SheetData } from '@/lib/sheet-data'
import {
  CHARACTER_DATA_PREFIX,
  deleteCharacterById,
  loadCharacterList,
  saveCharacterById,
} from '@/lib/multi-character-storage'
import { migrateSheetData } from '@/lib/sheet-data-migration'
import {
  hydrateSheetForRuntimeWithDiagnostics,
  projectSheetForStorage,
  rollbackWrittenCharacterImages,
  type MissingCharacterImageAsset,
  type SheetStorageProjectionResult,
} from './sheet-image-projection'
import {
  characterImageKey,
  deleteCharacterImage,
  deleteCharacterImagesByCharacterId,
  getCharacterImage,
  listCharacterImages,
  saveCharacterImage,
} from './character-image-repository'
import type { CharacterImageRecord, CharacterImageRole, CharacterSheetImageField } from './character-image-types'
import { isImageDataUrl } from './data-url'

const IMAGE_FIELDS: Array<{ field: CharacterSheetImageField; role: CharacterImageRole }> = [
  { field: 'characterImage', role: 'portrait' },
  { field: 'companionImage', role: 'companion' },
]

export interface LoadCharacterSheetOptions {
  onMissingImageAssets?: (missingImages: MissingCharacterImageAsset[]) => void
}

function assertNoEmbeddedCharacterImages(characterId: string, sheetData: SheetData): void {
  const embeddedField = IMAGE_FIELDS.find(({ field }) => isImageDataUrl(sheetData[field]))?.field
  if (!embeddedField) return

  throw new Error(
    `Embedded character images must be migrated at startup before loading character ${characterId}: ${embeddedField}`,
  )
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

async function restoreImageSnapshots(
  writtenImageKeys: string[],
  snapshots: Map<string, CharacterImageRecord | null>,
): Promise<void> {
  await Promise.all(writtenImageKeys.map(async key => {
    const previous = snapshots.get(key)

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

export async function saveCharacterSheet(characterId: string, sheetData: SheetData): Promise<SheetData> {
  const characterStorageKey = `${CHARACTER_DATA_PREFIX}${characterId}`
  const previousRawCharacter = localStorage.getItem(characterStorageKey)
  const snapshots = await snapshotWritableImageRecords(characterId, sheetData)
  let projection: SheetStorageProjectionResult

  try {
    projection = await projectSheetForStorage(characterId, sheetData)
  } catch (error) {
    try {
      await restoreImageSnapshots([...snapshots.keys()], snapshots)
    } catch (rollbackError) {
      console.error(`[CharacterImage] Failed to rollback images for ${characterId}:`, rollbackError)
    }

    throw error
  }

  try {
    saveCharacterById(characterId, projection.storedSheet)
  } catch (error) {
    try {
      if (previousRawCharacter === null) {
        localStorage.removeItem(characterStorageKey)
      } else {
        localStorage.setItem(characterStorageKey, previousRawCharacter)
      }
    } catch (rollbackError) {
      console.error(`[Character] Failed to rollback character data for ${characterId}:`, rollbackError)
    }

    try {
      await restoreImageSnapshots(projection.writtenImageKeys, snapshots)
    } catch (rollbackError) {
      console.error(`[CharacterImage] Failed to rollback images for ${characterId}:`, rollbackError)
    }

    throw error
  }

  return projection.runtimeSheet
}

export async function loadCharacterSheet(
  characterId: string,
  options: LoadCharacterSheetOptions = {},
): Promise<SheetData | null> {
  const raw = localStorage.getItem(`${CHARACTER_DATA_PREFIX}${characterId}`)
  if (!raw) return null

  const parsed = JSON.parse(raw)
  const migrated = migrateSheetData(parsed)
  assertNoEmbeddedCharacterImages(characterId, migrated)
  const hydration = await hydrateSheetForRuntimeWithDiagnostics(migrated)

  if (hydration.missingImages.length > 0) {
    console.warn(`[CharacterImage] Missing image assets for ${characterId}; continuing without those images`, {
      characterId,
      missingImages: hydration.missingImages,
    })
    options.onMissingImageAssets?.(hydration.missingImages)

    try {
      saveCharacterById(characterId, hydration.storedSheet)
    } catch (error) {
      console.error(`[CharacterImage] Failed to persist cleaned image refs for ${characterId}:`, error)
    }
  }

  return hydration.runtimeSheet
}

export async function deleteCharacterSave(characterId: string): Promise<boolean> {
  const deleted = deleteCharacterById(characterId)
  if (!deleted) return false

  try {
    await deleteCharacterImagesByCharacterId(characterId)
  } catch (error) {
    console.error(`[CharacterImage] Failed to delete images for ${characterId}:`, error)
  }

  return deleted
}

export async function cleanupOrphanedCharacterImages(): Promise<number> {
  const list = loadCharacterList()
  const validCharacterIds = new Set(list.characters.map(character => character.id))
  const records = await listCharacterImages()
  const orphanRecords = records.filter(record => !validCharacterIds.has(record.characterId))
  const orphanCharacterIds = new Set(orphanRecords.map(record => record.characterId))

  for (const characterId of orphanCharacterIds) {
    await deleteCharacterImagesByCharacterId(characterId)
  }

  return orphanRecords.length
}

export async function rollbackCharacterImageKeys(keys: string[]): Promise<void> {
  await rollbackWrittenCharacterImages(keys)
}
