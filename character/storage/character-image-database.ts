import Dexie, { type Table } from 'dexie'
import type { CharacterImageRecord } from './character-image-types'

export class CharacterImageDB extends Dexie {
  characterImages!: Table<CharacterImageRecord, string>

  constructor() {
    super('DaggerHeartCharacterImages')
    this.version(1).stores({
      characterImages: 'key, characterId, role, updatedAt',
    })
  }
}

export const characterImageDb = new CharacterImageDB()

export function isCharacterImageIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}
