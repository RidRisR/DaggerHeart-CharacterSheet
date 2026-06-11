export interface EquipmentPackStorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  keys(): string[]
}

export const LOCAL_STORAGE_KEYS = {
  INDEX: "dh_equipment_index",
  PACK_PREFIX: "dh_equipment_pack:",
} as const

export function getPackStorageKey(packId: string): string {
  return `${LOCAL_STORAGE_KEYS.PACK_PREFIX}${packId}`
}

export interface InMemoryEquipmentPackStorageAdapter extends EquipmentPackStorageAdapter {
  writeLog: { key: string; value: string }[]
  removeLog: string[]
}

export function createInMemoryEquipmentPackStorageAdapter(
  initial: Record<string, string> = {},
): InMemoryEquipmentPackStorageAdapter {
  const values = new Map(Object.entries(initial))
  const writeLog: { key: string; value: string }[] = []
  const removeLog: string[] = []

  return {
    writeLog,
    removeLog,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      writeLog.push({ key, value })
      values.set(key, value)
    },
    removeItem: (key) => {
      removeLog.push(key)
      values.delete(key)
    },
    keys: () => Array.from(values.keys()),
  }
}

export function createBrowserLocalStorageAdapter(storage: Storage): EquipmentPackStorageAdapter {
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
