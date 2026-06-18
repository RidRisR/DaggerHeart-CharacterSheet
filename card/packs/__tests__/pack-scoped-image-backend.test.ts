import { describe, expect, it } from "vitest"
import { createInMemoryCardPackImageBackend } from "../image-backend"

function blob(text: string, type = "image/png") {
  return new Blob([text], { type })
}

describe("pack scoped image backend", () => {
  it("writes images under pack/template keys", async () => {
    const backend = createInMemoryCardPackImageBackend()

    const result = await backend.writePackImages("pack-a", [
      { templateId: "warrior", path: "images/warrior.png", readBlob: async () => blob("warrior") },
    ])

    expect(result.ok).toBe(true)
    expect(await backend.listPackImages("pack-a")).toEqual([
      expect.objectContaining({ key: "pack-a/warrior", packId: "pack-a", templateId: "warrior" }),
    ])
  })

  it("falls back to legacy global image when pack scoped image is missing", async () => {
    const backend = createInMemoryCardPackImageBackend()
    await backend.putLegacyGlobalImage("warrior", blob("legacy"))

    const image = await backend.getImage("warrior", "pack-a")

    expect(await image?.blob.text()).toBe("legacy")
  })

  it("deletes only one pack namespace", async () => {
    const backend = createInMemoryCardPackImageBackend()
    await backend.writePackImages("pack-a", [
      { templateId: "warrior", path: "images/warrior.png", readBlob: async () => blob("a") },
    ])
    await backend.writePackImages("pack-b", [
      { templateId: "warrior", path: "images/warrior.png", readBlob: async () => blob("b") },
    ])

    await backend.deletePackImages("pack-a")

    expect(await backend.getImage("warrior", "pack-a")).toBeNull()
    expect(await backend.getImage("warrior", "pack-b")).not.toBeNull()
  })

  it("reports write failure without throwing", async () => {
    const backend = createInMemoryCardPackImageBackend({
      failWritesForTemplateIds: new Set(["warrior"]),
    })

    const result = await backend.writePackImages("pack-a", [
      { templateId: "warrior", path: "images/warrior.png", readBlob: async () => blob("warrior") },
    ])

    expect(result).toMatchObject({
      ok: false,
      issues: [expect.objectContaining({ code: "IMAGE_WRITE_FAILED" })],
    })
    expect(await backend.listPackImages("pack-a")).toEqual([])
  })

  it("keeps ambiguous legacy global images and reports a migration issue", async () => {
    const backend = createInMemoryCardPackImageBackend()
    await backend.putLegacyGlobalImage("warrior", blob("legacy"))

    const result = await backend.migrateLegacyGlobalImages({
      ownersByTemplateId: new Map([["warrior", ["pack-a", "pack-b"]]]),
    })

    expect(result.ok).toBe(false)
    expect(result.issues).toContainEqual(expect.objectContaining({ code: "IMAGE_MIGRATION_AMBIGUOUS" }))
    expect(await backend.getImage("warrior")).not.toBeNull()
  })
})
