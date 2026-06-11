import { describe, expect, it, vi } from "vitest"

import { createEquipmentPackId } from "../pack-id"

describe("createEquipmentPackId", () => {
  it("uses pack timestamp random6 format", () => {
    const id = createEquipmentPackId({
      now: new Date("2026-06-04T10:20:30.000Z"),
      random: () => 0.123456,
      exists: () => false,
    })

    expect(id).toBe("pack_1780568430000_4fzyo8")
  })

  it("retries when generated id already exists", () => {
    const random = vi.fn().mockReturnValueOnce(0.123456).mockReturnValueOnce(0.654321)

    const id = createEquipmentPackId({
      now: new Date("2026-06-04T10:20:30.000Z"),
      random,
      exists: (candidate) => candidate.endsWith("_4fzyo8"),
    })

    expect(id).toBe("pack_1780568430000_nk000q")
    expect(random).toHaveBeenCalledTimes(2)
  })

  it("returns null after ten collisions", () => {
    const id = createEquipmentPackId({
      now: new Date("2026-06-04T10:20:30.000Z"),
      random: () => 0.123456,
      exists: () => true,
    })

    expect(id).toBeNull()
  })
})
