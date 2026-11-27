export const CONTENT_PACK_GROUP_STORAGE_KEY = "dh_content_pack_groups_v1"

export interface ContentPackGroupStorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface InMemoryContentPackGroupStorageAdapter extends ContentPackGroupStorageAdapter {
  writeLog: Array<{ key: string; value: string }>
  removeLog: string[]
}

export interface TestGroupStorageOptions {
  failWrite?: boolean
  failQuota?: boolean
  failRead?: boolean
}

export function createInMemoryContentPackGroupStorageAdapter(
  initial: Record<string, string> = {},
  options: TestGroupStorageOptions = {},
): InMemoryContentPackGroupStorageAdapter {
  const values = new Map(Object.entries(initial))
  const writeLog: Array<{ key: string; value: string }> = []
  const removeLog: string[] = []

  return {
    writeLog,
    removeLog,
    getItem(key) {
      if (options.failRead) {
        throw new Error("group storage read failed")
      }
      return values.get(key) ?? null
    },
    setItem(key, value) {
      if (options.failQuota) {
        const quotaError = new Error("QuotaExceededError")
        quotaError.name = "QuotaExceededError"
        throw quotaError
      }
      if (options.failWrite) {
        throw new Error("group storage write failed")
      }
      writeLog.push({ key, value })
      values.set(key, value)
    },
    removeItem(key) {
      removeLog.push(key)
      values.delete(key)
    },
  }
}

export function createBrowserContentPackGroupStorageAdapter(
  storage: Storage = window.localStorage,
): ContentPackGroupStorageAdapter {
  return {
    getItem: (key) => storage.getItem(key),
    setItem: (key, value) => storage.setItem(key, value),
    removeItem: (key) => storage.removeItem(key),
  }
}
