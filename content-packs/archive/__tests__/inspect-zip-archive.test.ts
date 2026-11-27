import JSZip from "jszip"
import { describe, expect, it } from "vitest"
import { inspectZipArchive } from "../inspect-zip-archive"

async function buildZipBuffer(files: Record<string, string | Uint8Array | ArrayBuffer>): Promise<ArrayBuffer> {
  const zip = new JSZip()
  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content)
  }
  return zip.generateAsync({ type: "arraybuffer" })
}

const sampleCardPack = {
  name: "测试卡牌包",
  profession: [{ id: "card-1", name: "测试职业" }],
}

const sampleEquipmentPack = {
  format: "daggerheart.equipment-pack.v1",
  name: "测试装备包",
  version: "1.0.0",
  author: "Tester",
  equipment: {
    weapons: [],
    armor: [],
  },
}

describe("inspectZipArchive", () => {
  it("classifies a legacy root cards.json zip as legacyCardDhcb", async () => {
    const bytes = await buildZipBuffer({
      "cards.json": JSON.stringify(sampleCardPack),
      "manifest.json": JSON.stringify({ format: "DaggerHeart Card Batch" }),
      "images/card-1.webp": new Uint8Array([1, 2, 3]),
    })

    const result = await inspectZipArchive(bytes)
    expect(result).toEqual({ kind: "legacyCardDhcb" })
  })

  it("extracts card json, equipment json, dhcb, and single-card nested zip while ignoring OS metadata and non-pack files", async () => {
    const nestedDhcbBytes = await buildZipBuffer({
      "cards.json": JSON.stringify(sampleCardPack),
      "images/card-1.png": new Uint8Array([9, 8, 7]),
    })
    const nestedCardZipBytes = await buildZipBuffer({
      "cards.json": JSON.stringify(sampleCardPack),
    })

    const archiveBytes = await buildZipBuffer({
      "cards/pack-a.json": JSON.stringify(sampleCardPack),
      "cards/pack-b.dhcb": nestedDhcbBytes,
      "cards/pack-c.zip": nestedCardZipBytes,
      "equipment/weapons.json": JSON.stringify(sampleEquipmentPack),
      "README.txt": "campaign notes",
      "__MACOSX/cards/._pack-a.json": "junk",
      ".DS_Store": "junk",
    })

    const result = await inspectZipArchive(archiveBytes)
    expect(result.kind).toBe("archive")
    if (result.kind === "archive") {
      expect(result.entries.map((entry) => [entry.archivePath, entry.kind])).toEqual([
        ["cards/pack-a.json", "cardJson"],
        ["cards/pack-b.dhcb", "cardDhcb"],
        ["cards/pack-c.zip", "cardDhcb"],
        ["equipment/weapons.json", "equipmentJson"],
      ])
      expect(result.ignoredFiles).toEqual(["README.txt"])
    }
  })

  it("does not unpack internal folder structures like sub/cards.json + sub/images/*", async () => {
    const bytes = await buildZipBuffer({
      "sub/cards.json": JSON.stringify(sampleCardPack),
      "sub/images/card-1.webp": new Uint8Array([1, 2, 3]),
    })

    const result = await inspectZipArchive(bytes)
    expect(result.kind).toBe("archive")
    if (result.kind === "archive") {
      expect(result.entries).toHaveLength(1)
      expect(result.entries[0]).toMatchObject({
        kind: "cardJson",
        archivePath: "sub/cards.json",
      })
      expect(result.ignoredFiles).toEqual(["sub/images/card-1.webp"])
    }
  })

  it("marks nested multi-pack zips as NESTED_ARCHIVE_UNSUPPORTED", async () => {
    const nestedMultiZip = await buildZipBuffer({
      "a.json": JSON.stringify(sampleCardPack),
      "b.json": JSON.stringify(sampleEquipmentPack),
    })
    const outerBytes = await buildZipBuffer({
      "nested.zip": nestedMultiZip,
    })

    const result = await inspectZipArchive(outerBytes)
    expect(result.kind).toBe("archive")
    if (result.kind === "archive") {
      expect(result.entries[0]).toMatchObject({
        kind: "unknown",
        archivePath: "nested.zip",
        errorCode: "NESTED_ARCHIVE_UNSUPPORTED",
      })
    }
  })

  it("routes a root cards.json + manifest.json zip as archive when manifest.json is itself a valid content pack", async () => {
    const bytes = await buildZipBuffer({
      "cards.json": JSON.stringify(sampleCardPack),
      "manifest.json": JSON.stringify(sampleEquipmentPack),
    })

    const result = await inspectZipArchive(bytes)
    expect(result.kind).toBe("archive")
    if (result.kind === "archive") {
      expect(result.entries.map((entry) => [entry.archivePath, entry.kind])).toEqual([
        ["cards.json", "cardJson"],
        ["manifest.json", "equipmentJson"],
      ])
    }
  })

  it("routes a root cards.json zip containing an equipment pack as archive instead of legacyCardDhcb", async () => {
    const bytes = await buildZipBuffer({
      "cards.json": JSON.stringify(sampleEquipmentPack),
    })

    const result = await inspectZipArchive(bytes)
    expect(result.kind).toBe("archive")
    if (result.kind === "archive") {
      expect(result.entries).toHaveLength(1)
      expect(result.entries[0]).toMatchObject({
        kind: "equipmentJson",
        archivePath: "cards.json",
      })
    }
  })

  it("rejects nested zips containing unsafe traversal paths", async () => {
    const unsafeNested = await buildZipBuffer({
      "cards.json": JSON.stringify(sampleCardPack),
      "../escape.png": new Uint8Array([1, 2, 3]),
    })
    const outerBytes = await buildZipBuffer({
      "bad-nested.zip": unsafeNested,
    })

    const result = await inspectZipArchive(outerBytes)
    expect(result.kind).toBe("archive")
    if (result.kind === "archive") {
      expect(result.entries[0]).toMatchObject({
        kind: "unknown",
        archivePath: "bad-nested.zip",
        errorCode: "UNSAFE_ARCHIVE_PATH",
      })
    }
  })

  it("rejects corrupted archives, empty archives, unsafe paths, and oversized entry counts or byte budgets", async () => {
    const corrupted = new Uint8Array(new TextEncoder().encode("not a zip")).buffer
    expect(await inspectZipArchive(corrupted)).toMatchObject({
      kind: "invalid",
      code: "INVALID_ARCHIVE",
    })

    const empty = await buildZipBuffer({ "README.md": "hello" })
    expect(await inspectZipArchive(empty)).toMatchObject({
      kind: "invalid",
      code: "EMPTY_ARCHIVE",
    })

    const unsafe = await buildZipBuffer({ "../evil.json": JSON.stringify(sampleCardPack) })
    expect(await inspectZipArchive(unsafe)).toMatchObject({
      kind: "invalid",
      code: "UNSAFE_ARCHIVE_PATH",
    })

    const tooMany = await buildZipBuffer({
      "a.json": JSON.stringify(sampleCardPack),
      "b.json": JSON.stringify(sampleEquipmentPack),
    })
    expect(await inspectZipArchive(tooMany, { maxEntries: 1 })).toMatchObject({
      kind: "invalid",
      code: "ARCHIVE_LIMIT_EXCEEDED",
    })

    expect(await inspectZipArchive(tooMany, { maxTotalBytes: 64 })).toMatchObject({
      kind: "invalid",
      code: "ARCHIVE_LIMIT_EXCEEDED",
    })
  })
})
