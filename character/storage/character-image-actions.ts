import type { SheetData } from '@/lib/sheet-data'
import type { CharacterImageRole, CharacterSheetImageField } from './character-image-types'
import { characterImageKey, deleteCharacterImage, saveCharacterImage } from './character-image-repository'
import { dataUrlToBlob, isImageDataUrl } from './data-url'

const ROLE_TO_FIELD: Record<CharacterImageRole, CharacterSheetImageField> = {
  portrait: 'characterImage',
  companion: 'companionImage',
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
  const record = await saveCharacterImage({
    characterId,
    role,
    blob,
    mimeType: blob.type,
  })
  const field = ROLE_TO_FIELD[role]

  return {
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
}

export async function deleteCharacterImageAsset(
  characterId: string,
  role: CharacterImageRole,
  sheetData: SheetData,
): Promise<SheetData> {
  const field = ROLE_TO_FIELD[role]
  await deleteCharacterImage(characterImageKey(characterId, role))

  const imageAssets = { ...(sheetData.imageAssets ?? {}) }
  delete imageAssets[field]

  return {
    ...sheetData,
    [field]: '',
    imageAssets,
  }
}
