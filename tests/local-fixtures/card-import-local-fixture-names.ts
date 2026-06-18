import { createHash } from "node:crypto"
import path from "node:path"

export interface LocalCardPackFixtureNames {
  packId: string
  snapshotFileName: string
}

function normalizeFixturePath(fixtureName: string): string {
  return fixtureName.split(path.sep).join("/")
}

function shortHash(input: string, length: number): string {
  return createHash("sha256").update(input).digest("hex").slice(0, length)
}

function readableSnapshotBase(fixtureName: string): string {
  const normalized = normalizeFixturePath(fixtureName)
  const fileName = normalized.split("/").pop() ?? normalized
  const withoutExtension = fileName.replace(/\.(json|dhcb)$/i, "")
  return (
    withoutExtension
      .normalize("NFKD")
      .replace(/[^\p{Letter}\p{Number}._-]+/gu, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "fixture"
  )
}

export function createLocalCardPackFixtureNames(fixtureName: string): LocalCardPackFixtureNames {
  const normalized = normalizeFixturePath(fixtureName)
  return {
    packId: `test-pack-${shortHash(normalized, 12)}`,
    snapshotFileName: `${readableSnapshotBase(normalized)}-${shortHash(normalized, 8)}.storage.json`,
  }
}
