import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { saveCharacterSheet } from '@/character/storage/character-save-storage'
import { clearAllCharacterImages } from '@/character/storage/character-image-repository'
import { defaultSheetData } from '@/lib/default-sheet-data'
import {
  CHARACTER_DATA_PREFIX,
  CHARACTER_LIST_KEY,
  addCharacterToMetadataList,
  loadCharacterList,
} from '@/lib/multi-character-storage'

const png = 'data:image/png;base64,aGVsbG8='

function characterStorageValues(): string[] {
  const values: string[] = []

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (key?.startsWith(CHARACTER_DATA_PREFIX) && key !== CHARACTER_LIST_KEY) {
      values.push(localStorage.getItem(key) || '')
    }
  }

  return values
}

describe('character save storage invariant', () => {
  beforeEach(async () => {
    localStorage.clear()
    await clearAllCharacterImages()
  })

  it('does not store data image payloads in character localStorage records', async () => {
    addCharacterToMetadataList('Invariant Save')
    const characterId = loadCharacterList().characters[0].id

    await saveCharacterSheet(characterId, {
      ...structuredClone(defaultSheetData),
      characterImage: png,
      companionImage: png,
    })

    expect(characterStorageValues()).not.toHaveLength(0)
    for (const value of characterStorageValues()) {
      expect(value).not.toContain('data:image/')
    }
  })
})
