import { describe, expect, it, vi } from "vitest"
import { SYSTEM_BUILTIN_CARDS_SOURCE_ID, getCardDisabledSourceIds, type AppPreferencesStorage } from "@/lib/app-preferences"
import { CARD_BUILTIN_SOURCE_ID } from "../source-types"
import {
  getBuiltinCardRuntimeSourceDisabled,
  setBuiltinCardRuntimeSourceDisabled,
} from "../source-disabled-state"

interface MemoryStorage extends AppPreferencesStorage {
  getItem: ReturnType<typeof vi.fn>
  setItem: ReturnType<typeof vi.fn>
  removeItem: ReturnType<typeof vi.fn>
}

function createMemoryStorage(options: { failWrites?: boolean } = {}): MemoryStorage {
  const values = new Map<string, string>()
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      if (options.failWrites) throw new Error("write failed")
      values.set(key, value)
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key)
    }),
  }
}

describe("card runtime source disabled state", () => {
  it("writes built-in card source disabled state to app preferences", () => {
    const storage = createMemoryStorage()

    const result = setBuiltinCardRuntimeSourceDisabled(true, storage)

    expect(result).toEqual({
      ok: true,
      sourceId: CARD_BUILTIN_SOURCE_ID,
      disabled: true,
    })
    expect(getCardDisabledSourceIds(storage)).toEqual([SYSTEM_BUILTIN_CARDS_SOURCE_ID])
    expect(getBuiltinCardRuntimeSourceDisabled(storage)).toBe(true)
  })

  it("reports failed app preference writes for the built-in card source", () => {
    const storage = createMemoryStorage({ failWrites: true })

    const result = setBuiltinCardRuntimeSourceDisabled(true, storage)

    expect(result).toEqual({
      ok: false,
      sourceId: CARD_BUILTIN_SOURCE_ID,
      disabled: true,
      message: "Failed to write card source preferences",
    })
    expect(getCardDisabledSourceIds(storage)).toEqual([])
    expect(getBuiltinCardRuntimeSourceDisabled(storage)).toBe(false)
  })
})
