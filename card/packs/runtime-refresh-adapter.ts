import type { CardPackStorageSnapshot } from "./storage-types"

export interface CardRuntimeRefreshResult {
  ok: boolean
  diagnostic?: {
    code: "RUNTIME_REFRESH_FAILED"
    message: string
    value?: unknown
  }
}

export interface CardRuntimeRefreshAdapter {
  refresh(snapshot: CardPackStorageSnapshot): Promise<CardRuntimeRefreshResult>
}

export interface CardRuntimeRefreshStorePort {
  reloadCustomRuntimeFromStorage(): Promise<void>
}

export function createNoopCardRuntimeRefreshAdapter(): CardRuntimeRefreshAdapter {
  return {
    async refresh() {
      return { ok: true }
    },
  }
}

export function createZustandCardRuntimeRefreshAdapter(
  store: CardRuntimeRefreshStorePort,
): CardRuntimeRefreshAdapter {
  return {
    async refresh() {
      try {
        await store.reloadCustomRuntimeFromStorage()
        return { ok: true }
      } catch (error) {
        return {
          ok: false,
          diagnostic: {
            code: "RUNTIME_REFRESH_FAILED",
            message: error instanceof Error ? error.message : "Card runtime refresh failed.",
            value: error,
          },
        }
      }
    },
  }
}
