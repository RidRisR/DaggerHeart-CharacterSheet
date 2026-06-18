export const CARD_PACK_STORAGE_KEYS = {
  INDEX: "daggerheart_custom_cards_index",
  BATCH_PREFIX: "daggerheart_custom_cards_batch_",
} as const

export function getCardPackStorageKey(packId: string): string {
  return `${CARD_PACK_STORAGE_KEYS.BATCH_PREFIX}${packId}`
}

export interface CardPackStorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  keys(): string[]
  writeLog?: { kind: "index" | "content"; key: string }[]
}

export interface InMemoryCardPackStorageAdapter extends CardPackStorageAdapter {
  removeLog: string[]
}

export interface TestCardPackStorageOptions {
  operations?: string[]
  failContentWritesFor?: Set<string>
  failContentDeletesFor?: Set<string>
}

function packIdFromContentKey(key: string): string | null {
  if (!key.startsWith(CARD_PACK_STORAGE_KEYS.BATCH_PREFIX)) {
    return null
  }

  return key.slice(CARD_PACK_STORAGE_KEYS.BATCH_PREFIX.length)
}

export function createInMemoryCardPackStorageAdapter(
  initial: Record<string, string> = {},
  options: TestCardPackStorageOptions = {},
): InMemoryCardPackStorageAdapter {
  const values = new Map(Object.entries(initial))
  const writeLog: { kind: "index" | "content"; key: string }[] = []
  const removeLog: string[] = []

  return {
    writeLog,
    removeLog,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      const packId = packIdFromContentKey(key)
      if (packId && options.failContentWritesFor?.has(packId)) {
        throw new Error(`failed content write ${packId}`)
      }

      if (key === CARD_PACK_STORAGE_KEYS.INDEX) {
        writeLog.push({ kind: "index", key })
        options.operations?.push("index")
      } else if (packId) {
        writeLog.push({ kind: "content", key })
        options.operations?.push(`content:${packId}`)
      }

      values.set(key, value)
    },
    removeItem: (key) => {
      const packId = packIdFromContentKey(key)
      if (packId && options.failContentDeletesFor?.has(packId)) {
        throw new Error(`failed content delete ${packId}`)
      }

      removeLog.push(key)
      values.delete(key)
    },
    keys: () => Array.from(values.keys()),
  }
}

export function createBrowserCardPackStorageAdapter(storage: Storage = window.localStorage): CardPackStorageAdapter {
  return {
    getItem: (key) => storage.getItem(key),
    setItem: (key, value) => storage.setItem(key, value),
    removeItem: (key) => storage.removeItem(key),
    keys: () =>
      Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
        (key): key is string => key !== null,
      ),
  }
}
