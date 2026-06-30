export type CharacterImageRole = 'portrait' | 'companion'

export type CharacterSheetImageField = 'characterImage' | 'companionImage'

export interface CharacterImageAssetRef {
  key: string
  mimeType: string
}

export type CharacterImageAssetMap = Partial<Record<CharacterSheetImageField, CharacterImageAssetRef>>

export interface CharacterImageRecord {
  key: string
  characterId: string
  role: CharacterImageRole
  blob: Blob
  mimeType: string
  size: number
  updatedAt: number
}
