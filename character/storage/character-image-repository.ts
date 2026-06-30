import { characterImageDb, isCharacterImageIndexedDBAvailable } from './character-image-database'
import type { CharacterImageRecord, CharacterImageRole } from './character-image-types'

export function characterImageKey(characterId: string, role: CharacterImageRole): string {
  return `character:${characterId}:${role}`
}

export async function saveCharacterImage(input: {
  characterId: string
  role: CharacterImageRole
  blob: Blob
  mimeType: string
}): Promise<CharacterImageRecord> {
  if (!isCharacterImageIndexedDBAvailable()) {
    throw new Error('IndexedDB is not available for character images')
  }

  const record: CharacterImageRecord = {
    key: characterImageKey(input.characterId, input.role),
    characterId: input.characterId,
    role: input.role,
    blob: input.blob,
    mimeType: input.mimeType || input.blob.type || 'application/octet-stream',
    size: input.blob.size,
    updatedAt: Date.now(),
  }

  await characterImageDb.characterImages.put(record)
  return record
}

export async function getCharacterImage(key: string): Promise<CharacterImageRecord | null> {
  if (!isCharacterImageIndexedDBAvailable()) return null
  return (await characterImageDb.characterImages.get(key)) ?? null
}

export async function listCharacterImages(characterId?: string): Promise<CharacterImageRecord[]> {
  if (!isCharacterImageIndexedDBAvailable()) return []
  if (!characterId) return await characterImageDb.characterImages.toArray()
  return await characterImageDb.characterImages.where('characterId').equals(characterId).toArray()
}

export async function deleteCharacterImage(key: string): Promise<void> {
  if (!isCharacterImageIndexedDBAvailable()) {
    throw new Error('IndexedDB is not available for character images')
  }
  await characterImageDb.characterImages.delete(key)
}

export async function deleteCharacterImagesByCharacterId(characterId: string): Promise<void> {
  if (!isCharacterImageIndexedDBAvailable()) {
    throw new Error('IndexedDB is not available for character images')
  }
  await characterImageDb.characterImages.where('characterId').equals(characterId).delete()
}

export async function clearAllCharacterImages(): Promise<void> {
  if (!isCharacterImageIndexedDBAvailable()) {
    throw new Error('IndexedDB is not available for character images')
  }
  await characterImageDb.characterImages.clear()
}
