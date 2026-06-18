import { describe, expect, it } from "vitest"
import { createCardPackId } from "../pack-id"

describe("card pack id", () => {
  it("uses the legacy batch id prefix", () => {
    const id = createCardPackId({
      now: new Date("2026-06-16T10:20:30.000Z"),
      random: () => 0.123456,
      exists: () => false,
    })

    expect(id).toMatch(/^batch_\d+_[a-z0-9]+$/)
  })

  it("retries when generated ids already exist", () => {
    const ids: string[] = []
    const id = createCardPackId({
      now: new Date("2026-06-16T10:20:30.000Z"),
      random: () => (ids.length === 0 ? 0.111111 : 0.222222),
      exists: (candidate) => {
        ids.push(candidate)
        return ids.length === 1
      },
    })

    expect(ids).toHaveLength(2)
    expect(id).toBe(ids[1])
  })

  it("returns null when unique id generation is exhausted", () => {
    const id = createCardPackId({
      now: new Date("2026-06-16T10:20:30.000Z"),
      random: () => 0.111111,
      exists: () => true,
      maxAttempts: 3,
    })

    expect(id).toBeNull()
  })
})
