import type { SheetData } from '@/lib/sheet-data'
import { CHARACTER_DATA_PREFIX, saveCharacterById } from '@/lib/multi-character-storage'
import type { CharacterImageRecord, CharacterImageRole, CharacterSheetImageField } from './character-image-types'
import {
  characterImageKey,
  deleteCharacterImage,
  getCharacterImage,
  saveCharacterImage,
} from './character-image-repository'
import { dataUrlToBlob, isImageDataUrl } from './data-url'

const ROLE_TO_FIELD: Record<CharacterImageRole, CharacterSheetImageField> = {
  portrait: 'characterImage',
  companion: 'companionImage',
}

type CharacterImageActionToken = {
  key: string
  sequence: number
}

interface ApplyCharacterImageAssetActionInput {
  characterId: string
  role: CharacterImageRole
  imageDataUrl: string
  sheetData: SheetData
  getCurrentCharacterId: () => string | null
  getCurrentSheetData?: () => SheetData
  replaceSheetData: (sheetData: SheetData) => void
}

let actionSequence = 0
const latestActionByKey = new Map<string, number>()
const actionQueueByKey = new Map<string, Promise<void>>()

function beginCharacterImageAction(characterId: string, role: CharacterImageRole): CharacterImageActionToken {
  actionSequence += 1
  const key = characterImageKey(characterId, role)
  latestActionByKey.set(key, actionSequence)
  return { key, sequence: actionSequence }
}

function isLatestCharacterImageAction(token: CharacterImageActionToken): boolean {
  return latestActionByKey.get(token.key) === token.sequence
}

function finishCharacterImageAction(token: CharacterImageActionToken, queuedAction: Promise<void>) {
  if (actionQueueByKey.get(token.key) === queuedAction) {
    actionQueueByKey.delete(token.key)
  }

  if (isLatestCharacterImageAction(token)) {
    latestActionByKey.delete(token.key)
  }
}

function loadStoredSheetForImageRef(characterId: string): SheetData | null {
  const raw = localStorage.getItem(`${CHARACTER_DATA_PREFIX}${characterId}`)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function persistSheetWithImageRef(characterId: string, field: CharacterSheetImageField, runtimeSheet: SheetData): void {
  const storedBase = loadStoredSheetForImageRef(characterId) ?? runtimeSheet
  const imageAssets = { ...(storedBase.imageAssets ?? {}) }
  const ref = runtimeSheet.imageAssets?.[field]

  if (ref) {
    imageAssets[field] = ref
  } else {
    delete imageAssets[field]
  }

  saveCharacterById(characterId, {
    ...storedBase,
    [field]: '',
    imageAssets,
  })
}

async function restoreCharacterImageRecord(
  key: string,
  previousRecord: CharacterImageRecord | null,
): Promise<void> {
  if (!previousRecord) {
    await deleteCharacterImage(key)
    return
  }

  await saveCharacterImage({
    characterId: previousRecord.characterId,
    role: previousRecord.role,
    blob: previousRecord.blob,
    mimeType: previousRecord.mimeType,
  })
}

function mergeImageActionResult(
  currentSheet: SheetData,
  field: CharacterSheetImageField,
  imageResultSheet: SheetData,
): SheetData {
  const imageAssets = { ...(currentSheet.imageAssets ?? {}) }
  const nextRef = imageResultSheet.imageAssets?.[field]

  if (nextRef) {
    imageAssets[field] = nextRef
  } else {
    delete imageAssets[field]
  }

  return {
    ...currentSheet,
    [field]: imageResultSheet[field],
    imageAssets,
  }
}

export async function setCharacterImageAsset(
  characterId: string,
  role: CharacterImageRole,
  imageDataUrl: string,
  sheetData: SheetData,
): Promise<SheetData> {
  if (!isImageDataUrl(imageDataUrl)) {
    throw new Error('Expected image data URL for character image write')
  }

  const blob = await dataUrlToBlob(imageDataUrl)
  const key = characterImageKey(characterId, role)
  const previousRecord = await getCharacterImage(key)
  const record = await saveCharacterImage({
    characterId,
    role,
    blob,
    mimeType: blob.type,
  })
  const field = ROLE_TO_FIELD[role]

  const nextSheet = {
    ...sheetData,
    [field]: imageDataUrl,
    imageAssets: {
      ...(sheetData.imageAssets ?? {}),
      [field]: {
        key: record.key,
        mimeType: record.mimeType,
      },
    },
  }

  try {
    persistSheetWithImageRef(characterId, field, nextSheet)
  } catch (error) {
    try {
      await restoreCharacterImageRecord(key, previousRecord)
    } catch (rollbackError) {
      console.error(`[CharacterImage] Failed to rollback image action for ${characterId}:`, rollbackError)
    }
    throw error
  }

  return nextSheet
}

export async function deleteCharacterImageAsset(
  characterId: string,
  role: CharacterImageRole,
  sheetData: SheetData,
): Promise<SheetData> {
  const field = ROLE_TO_FIELD[role]
  const imageAssets = { ...(sheetData.imageAssets ?? {}) }
  delete imageAssets[field]

  const nextSheet = {
    ...sheetData,
    [field]: '',
    imageAssets,
  }

  persistSheetWithImageRef(characterId, field, nextSheet)
  try {
    await deleteCharacterImage(characterImageKey(characterId, role))
  } catch (error) {
    console.error('Failed to delete character image blob after removing stored sheet reference', {
      characterId,
      role,
      error,
    })
  }
  return nextSheet
}

export async function applyCharacterImageAssetAction({
  characterId,
  role,
  imageDataUrl,
  sheetData,
  getCurrentCharacterId,
  getCurrentSheetData,
  replaceSheetData,
}: ApplyCharacterImageAssetActionInput): Promise<boolean> {
  const token = beginCharacterImageAction(characterId, role)
  const previousAction = actionQueueByKey.get(token.key) ?? Promise.resolve()
  let applied = false

  const operation = previousAction
    .catch(() => {})
    .then(async () => {
      if (!isLatestCharacterImageAction(token)) return

      const nextSheet = imageDataUrl
        ? await setCharacterImageAsset(characterId, role, imageDataUrl, sheetData)
        : await deleteCharacterImageAsset(characterId, role, sheetData)

      if (!isLatestCharacterImageAction(token)) return
      if (getCurrentCharacterId() !== characterId) return

      const field = ROLE_TO_FIELD[role]
      replaceSheetData(mergeImageActionResult(getCurrentSheetData?.() ?? sheetData, field, nextSheet))
      applied = true
    })

  const queuedAction = operation.then(
    () => {},
    () => {},
  )
  actionQueueByKey.set(token.key, queuedAction)

  try {
    await operation
  } finally {
    finishCharacterImageAction(token, queuedAction)
  }

  return applied
}
