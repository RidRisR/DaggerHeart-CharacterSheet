import { describe, expect, it } from "vitest"
import { createDexieCardPackImageBackend } from "../image-backend"

function blob(text: string, type = "image/png") {
  return new Blob([text], { type })
}

interface FakeImageRecord {
  key: string
  blob?: Blob
  mimeType?: string
  size?: number
  createdAt?: number
  packId?: string
  templateId?: string
}

function createFakeImageTable() {
  const records = new Map<string, unknown>()
  const calls: string[] = []

  return {
    calls,
    async get(key: string) {
      calls.push(`get:${key}`)
      return records.get(key)
    },
    async put(record: FakeImageRecord) {
      calls.push(`put:${record.key}`)
      records.set(record.key, record)
    },
    async delete(key: string) {
      calls.push(`delete:${key}`)
      records.delete(key)
    },
    async toArray() {
      calls.push("toArray")
      return [...records.values()]
    },
  }
}

describe("dexie card pack image backend", () => {
  it("writes pack scoped records with optional legacy fallback", async () => {
    const table = createFakeImageTable()
    const backend = createDexieCardPackImageBackend({ table, now: () => 1 })

    await backend.writePackImages("pack-a", [
      { templateId: "warrior", path: "images/warrior.png", readBlob: async () => blob("pack") },
    ])

    const image = await backend.getImage("warrior", "pack-a")

    expect(await image?.blob.text()).toBe("pack")
    expect(table.calls).toContain("put:pack-a/warrior")
  })

  it("falls back to legacy global image records", async () => {
    const table = createFakeImageTable()
    const backend = createDexieCardPackImageBackend({ table, now: () => 1 })
    await table.put({ key: "warrior", blob: blob("legacy"), mimeType: "image/png", size: 6, createdAt: 1 })

    const image = await backend.getImage("warrior", "pack-a")

    expect(await image?.blob.text()).toBe("legacy")
    expect(table.calls).toContain("get:pack-a/warrior")
    expect(table.calls).toContain("get:warrior")
  })
})
