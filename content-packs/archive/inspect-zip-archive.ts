import JSZip from "jszip"
import type { ArchiveInspectResult, ArchivePackEntry } from "./types"

export const MAX_ARCHIVE_PACK_ENTRIES = 100
export const MAX_ARCHIVE_RAW_ENTRIES = 500
export const MAX_ARCHIVE_TOTAL_BYTES = 64 * 1024 * 1024

const CARD_LEGACY_ARRAY_FIELDS = ["profession", "ancestry", "community", "subclass", "domain", "variant"] as const

interface ZipStreamHelper {
  on(event: "data", cb: (chunk: Uint8Array) => void): ZipStreamHelper
  on(event: "error", cb: (error: unknown) => void): ZipStreamHelper
  on(event: "end", cb: () => void): ZipStreamHelper
  pause(): ZipStreamHelper
  resume(): ZipStreamHelper
}

interface ZipObjectWithInternalMeta extends JSZip.JSZipObject {
  unsafeOriginalName?: string
  _data?: {
    uncompressedSize?: number
  }
  internalStream?(type: "uint8array"): ZipStreamHelper
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function isEquipmentPackPayload(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && value.format === "daggerheart.equipment-pack.v1"
}

export function isCardPackPayload(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false
  if (value.format === "daggerheart.card-pack.v1") return true

  return CARD_LEGACY_ARRAY_FIELDS.some((field) => {
    const cards = value[field]
    return Array.isArray(cards) && cards.length > 0
  })
}

function isUnsafeArchivePath(path: string): boolean {
  if (path.length === 0) return true
  if (path.startsWith("/") || path.startsWith("\\")) return true
  if (path.includes("\\") || path.includes("\0")) return true
  if (/^[a-zA-Z]:/.test(path)) return true

  const segments = path.split("/")
  return segments.some((segment) => segment === "..")
}

function getRawEntryPath(entry: JSZip.JSZipObject): string {
  return (entry as ZipObjectWithInternalMeta).unsafeOriginalName ?? entry.name
}

function getDeclaredUncompressedSize(entry: JSZip.JSZipObject): number {
  const size = (entry as ZipObjectWithInternalMeta)._data?.uncompressedSize
  return typeof size === "number" && Number.isFinite(size) && size > 0 ? size : 0
}

class ArchiveByteBudgetExceededError extends Error {
  readonly bytesRead: number
  constructor(bytesRead: number) {
    super("Archive byte budget exceeded")
    this.name = "ArchiveByteBudgetExceededError"
    this.bytesRead = bytesRead
  }
}

async function readEntryBytesWithinBudget(entry: JSZip.JSZipObject, maxBytes: number): Promise<Uint8Array> {
  if (maxBytes < 0) {
    throw new ArchiveByteBudgetExceededError(0)
  }

  const withStream = entry as ZipObjectWithInternalMeta
  if (typeof withStream.internalStream !== "function") {
    const fallback = await entry.async("uint8array")
    if (fallback.byteLength > maxBytes) {
      throw new ArchiveByteBudgetExceededError(fallback.byteLength)
    }
    return fallback
  }

  return new Promise<Uint8Array>((resolve, reject) => {
    const chunks: Uint8Array[] = []
    let totalLength = 0
    let settled = false

    const stream = withStream.internalStream!("uint8array")
    stream
      .on("data", (chunk: Uint8Array) => {
        if (settled) return
        totalLength += chunk.byteLength
        if (totalLength > maxBytes) {
          settled = true
          stream.pause()
          reject(new ArchiveByteBudgetExceededError(totalLength))
          return
        }
        chunks.push(chunk)
      })
      .on("error", (error: unknown) => {
        if (settled) return
        settled = true
        reject(error)
      })
      .on("end", () => {
        if (settled) return
        settled = true
        const combined = new Uint8Array(totalLength)
        let offset = 0
        for (const chunk of chunks) {
          combined.set(chunk, offset)
          offset += chunk.byteLength
        }
        resolve(combined)
      })
      .resume()
  })
}

async function readEntryTextWithinBudget(entry: JSZip.JSZipObject, maxBytes: number): Promise<{ text: string; byteLength: number }> {
  const bytes = await readEntryBytesWithinBudget(entry, maxBytes)
  const text = new TextDecoder("utf-8").decode(bytes)
  return { text, byteLength: bytes.byteLength }
}

function isSystemMetadataPath(path: string): boolean {
  const segments = path.split("/").filter(Boolean)
  if (segments.length === 0) return true

  const baseName = segments[segments.length - 1]
  const lowerBase = baseName.toLowerCase()
  if (segments.some((segment) => segment === "__MACOSX")) return true
  if (baseName.startsWith("._")) return true
  if (lowerBase === ".ds_store" || lowerBase === "thumbs.db" || lowerBase === "desktop.ini") return true

  return false
}

function isPackCandidatePath(path: string): boolean {
  const lower = path.toLowerCase()
  return lower.endsWith(".json") || lower.endsWith(".dhcb") || lower.endsWith(".zip")
}

function hasOnlyLegacyCardZipPaths(filePaths: string[]): boolean {
  const hasRootCardsJson = filePaths.includes("cards.json")
  if (!hasRootCardsJson) return false

  const otherPackCandidates = filePaths.filter((path) => {
    if (path === "cards.json" || path === "manifest.json") return false
    return isPackCandidatePath(path)
  })

  return otherPackCandidates.length === 0
}

async function inspectNestedCardContainer(input: {
  archivePath: string
  bytes: ArrayBuffer
  sizeBytes: number
  isNestedZip: boolean
  remainingBytes: number
}): Promise<{ entry: ArchivePackEntry; consumedInnerBytes: number }> {
  try {
    const nestedZip = await JSZip.loadAsync(input.bytes)
    const rawEntries = Object.values(nestedZip.files)
    if (rawEntries.length > MAX_ARCHIVE_RAW_ENTRIES) {
      return {
        entry: {
          kind: "unknown",
          archivePath: input.archivePath,
          errorCode: "ARCHIVE_LIMIT_EXCEEDED",
          message: "嵌套卡牌包内文件数量超过限制",
        },
        consumedInnerBytes: 0,
      }
    }

    const nestedFiles = rawEntries.filter((entry) => !entry.dir && !isSystemMetadataPath(entry.name))
    let declaredInnerBytes = 0
    for (const nestedEntry of nestedFiles) {
      const rawPath = getRawEntryPath(nestedEntry)
      if (isUnsafeArchivePath(rawPath) || isUnsafeArchivePath(nestedEntry.name)) {
        return {
          entry: {
            kind: "unknown",
            archivePath: input.archivePath,
            errorCode: "UNSAFE_ARCHIVE_PATH",
            message: `子包包含不安全的文件路径：${rawPath}`,
          },
          consumedInnerBytes: 0,
        }
      }
      declaredInnerBytes += getDeclaredUncompressedSize(nestedEntry)
      if (declaredInnerBytes > input.remainingBytes) {
        return {
          entry: {
            kind: "unknown",
            archivePath: input.archivePath,
            errorCode: "ARCHIVE_LIMIT_EXCEEDED",
            message: "子包解压后体积超过压缩包总大小限制",
          },
          consumedInnerBytes: declaredInnerBytes,
        }
      }
    }

    const nestedPaths = nestedFiles.map((entry) => entry.name)
    if (input.isNestedZip && !hasOnlyLegacyCardZipPaths(nestedPaths)) {
      return {
        entry: {
          kind: "unknown",
          archivePath: input.archivePath,
          errorCode: "NESTED_ARCHIVE_UNSUPPORTED",
          message: "压缩包内的 .zip 仅支持单个旧版卡牌包，不支持多层嵌套整合压缩包",
        },
        consumedInnerBytes: declaredInnerBytes,
      }
    }

    return {
      entry: {
        kind: "cardDhcb",
        archivePath: input.archivePath,
        bytes: input.bytes,
        sizeBytes: input.sizeBytes,
      },
      consumedInnerBytes: declaredInnerBytes,
    }
  } catch {
    return {
      entry: {
        kind: "unknown",
        archivePath: input.archivePath,
        errorCode: "INVALID_DHCB",
        message: "文件不是有效的 DHCB / ZIP 卡牌包",
      },
      consumedInnerBytes: 0,
    }
  }
}

export interface InspectZipArchiveOptions {
  maxEntries?: number
  maxRawEntries?: number
  maxTotalBytes?: number
}

export async function inspectZipArchive(
  bytes: ArrayBuffer,
  options: InspectZipArchiveOptions = {},
): Promise<ArchiveInspectResult> {
  const maxEntries = options.maxEntries ?? MAX_ARCHIVE_PACK_ENTRIES
  const maxRawEntries = options.maxRawEntries ?? MAX_ARCHIVE_RAW_ENTRIES
  const maxTotalBytes = options.maxTotalBytes ?? MAX_ARCHIVE_TOTAL_BYTES

  if (bytes.byteLength > maxTotalBytes) {
    return {
      kind: "invalid",
      code: "ARCHIVE_LIMIT_EXCEEDED",
      message: "压缩包文件体积超过限制，请拆分后再导入",
      value: { sizeBytes: bytes.byteLength, maxTotalBytes },
    }
  }

  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(bytes)
  } catch {
    return {
      kind: "invalid",
      code: "INVALID_ARCHIVE",
      message: "无法解析 ZIP 压缩包，请确认文件完整且未损坏",
    }
  }

  const allRawEntries = Object.values(zip.files)
  if (allRawEntries.length > maxRawEntries) {
    return {
      kind: "invalid",
      code: "ARCHIVE_LIMIT_EXCEEDED",
      message: `压缩包内文件总数超过上限（最多 ${maxRawEntries} 个）`,
      value: { rawEntryCount: allRawEntries.length, maxRawEntries },
    }
  }

  const fileEntries = allRawEntries
    .filter((entry) => !entry.dir && !isSystemMetadataPath(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name))

  let totalDeclaredBytes = 0
  for (const entry of fileEntries) {
    const rawPath = getRawEntryPath(entry)
    if (isUnsafeArchivePath(rawPath) || isUnsafeArchivePath(entry.name)) {
      return {
        kind: "invalid",
        code: "UNSAFE_ARCHIVE_PATH",
        message: `压缩包包含不安全的文件路径：${rawPath}`,
        value: rawPath,
      }
    }
    totalDeclaredBytes += getDeclaredUncompressedSize(entry)
    if (totalDeclaredBytes > maxTotalBytes) {
      return {
        kind: "invalid",
        code: "ARCHIVE_LIMIT_EXCEEDED",
        message: "压缩包解压总大小超过限制，请拆分后再导入",
        value: { totalBytes: totalDeclaredBytes, maxTotalBytes },
      }
    }
  }

  const allPaths = fileEntries.map((entry) => entry.name)
  if (hasOnlyLegacyCardZipPaths(allPaths)) {
    let manifestIsContentPack = false
    const rootManifestEntry = zip.file("manifest.json")
    if (rootManifestEntry) {
      try {
        const { text: manifestText } = await readEntryTextWithinBudget(rootManifestEntry, maxTotalBytes)
        const parsedManifest = JSON.parse(manifestText)
        manifestIsContentPack = isCardPackPayload(parsedManifest) || isEquipmentPackPayload(parsedManifest)
      } catch (error) {
        if (error instanceof ArchiveByteBudgetExceededError) {
          return {
            kind: "invalid",
            code: "ARCHIVE_LIMIT_EXCEEDED",
            message: "压缩包解压总大小超过限制，请拆分后再导入",
            value: { totalBytes: error.bytesRead, maxTotalBytes },
          }
        }
      }
    }

    if (!manifestIsContentPack) {
      const rootCardsEntry = zip.file("cards.json")
      if (rootCardsEntry) {
        const declaredSize = getDeclaredUncompressedSize(rootCardsEntry)
        if (declaredSize > maxTotalBytes) {
          return {
            kind: "invalid",
            code: "ARCHIVE_LIMIT_EXCEEDED",
            message: "压缩包解压总大小超过限制，请拆分后再导入",
            value: { totalBytes: declaredSize, maxTotalBytes },
          }
        }
        try {
          const { text: rootText } = await readEntryTextWithinBudget(rootCardsEntry, maxTotalBytes)
          const parsedRoot = JSON.parse(rootText)
          if (!isEquipmentPackPayload(parsedRoot)) {
            return { kind: "legacyCardDhcb" }
          }
        } catch (error) {
          if (error instanceof ArchiveByteBudgetExceededError) {
            return {
              kind: "invalid",
              code: "ARCHIVE_LIMIT_EXCEEDED",
              message: "压缩包解压总大小超过限制，请拆分后再导入",
              value: { totalBytes: error.bytesRead, maxTotalBytes },
            }
          }
          return { kind: "legacyCardDhcb" }
        }
      } else {
        return { kind: "legacyCardDhcb" }
      }
    }
  }

  const packFileEntries = fileEntries.filter((entry) => isPackCandidatePath(entry.name))
  const ignoredFiles = fileEntries
    .filter((entry) => !isPackCandidatePath(entry.name))
    .map((entry) => entry.name)

  if (packFileEntries.length === 0) {
    return {
      kind: "invalid",
      code: "EMPTY_ARCHIVE",
      message: "压缩包中未找到可导入的内容包文件（支持 .json、.dhcb、单卡包 .zip）",
    }
  }

  if (packFileEntries.length > maxEntries) {
    return {
      kind: "invalid",
      code: "ARCHIVE_LIMIT_EXCEEDED",
      message: `压缩包内内容包数量超过上限（最多 ${maxEntries} 个，当前 ${packFileEntries.length} 个）`,
      value: { entryCount: packFileEntries.length, maxEntries },
    }
  }

  const entries: ArchivePackEntry[] = []
  let totalBytes = 0

  for (const fileEntry of packFileEntries) {
    const lowerName = fileEntry.name.toLowerCase()
    const declaredSize = getDeclaredUncompressedSize(fileEntry)
    if (totalBytes + declaredSize > maxTotalBytes) {
      return {
        kind: "invalid",
        code: "ARCHIVE_LIMIT_EXCEEDED",
        message: "压缩包解压总大小超过限制，请拆分后再导入",
        value: { totalBytes: totalBytes + declaredSize, maxTotalBytes },
      }
    }

    if (lowerName.endsWith(".dhcb") || lowerName.endsWith(".zip")) {
      let entryUint8: Uint8Array
      try {
        entryUint8 = await readEntryBytesWithinBudget(fileEntry, maxTotalBytes - totalBytes)
      } catch (error) {
        if (error instanceof ArchiveByteBudgetExceededError) {
          return {
            kind: "invalid",
            code: "ARCHIVE_LIMIT_EXCEEDED",
            message: "压缩包解压总大小超过限制，请拆分后再导入",
            value: { totalBytes: totalBytes + error.bytesRead, maxTotalBytes },
          }
        }
        return {
          kind: "invalid",
          code: "INVALID_ARCHIVE",
          message: `无法解压压缩包内的文件：${fileEntry.name}`,
          value: fileEntry.name,
        }
      }

      const entryBytes = entryUint8.slice().buffer
      totalBytes += entryBytes.byteLength

      const nested = await inspectNestedCardContainer({
        archivePath: fileEntry.name,
        bytes: entryBytes,
        sizeBytes: entryBytes.byteLength,
        isNestedZip: lowerName.endsWith(".zip"),
        remainingBytes: maxTotalBytes - totalBytes,
      })
      totalBytes += nested.consumedInnerBytes
      if (totalBytes > maxTotalBytes && nested.entry.kind !== "unknown") {
        return {
          kind: "invalid",
          code: "ARCHIVE_LIMIT_EXCEEDED",
          message: "压缩包解压总大小超过限制，请拆分后再导入",
          value: { totalBytes, maxTotalBytes },
        }
      }
      entries.push(nested.entry)
      continue
    }

    let text: string
    let sizeBytes: number
    try {
      const read = await readEntryTextWithinBudget(fileEntry, maxTotalBytes - totalBytes)
      text = read.text
      sizeBytes = read.byteLength
    } catch (error) {
      if (error instanceof ArchiveByteBudgetExceededError) {
        return {
          kind: "invalid",
          code: "ARCHIVE_LIMIT_EXCEEDED",
          message: "压缩包解压总大小超过限制，请拆分后再导入",
          value: { totalBytes: totalBytes + error.bytesRead, maxTotalBytes },
        }
      }
      return {
        kind: "invalid",
        code: "INVALID_ARCHIVE",
        message: `无法解压压缩包内的文件：${fileEntry.name}`,
        value: fileEntry.name,
      }
    }
    totalBytes += sizeBytes

    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      entries.push({
        kind: "unknown",
        archivePath: fileEntry.name,
        errorCode: "INVALID_JSON",
        message: "文件不是有效的 JSON。请检查 JSON 语法",
      })
      continue
    }

    if (isEquipmentPackPayload(parsed)) {
      entries.push({
        kind: "equipmentJson",
        archivePath: fileEntry.name,
        text,
        sizeBytes,
      })
    } else if (isCardPackPayload(parsed)) {
      entries.push({
        kind: "cardJson",
        archivePath: fileEntry.name,
        text,
        parsed,
        sizeBytes,
      })
    } else {
      entries.push({
        kind: "unknown",
        archivePath: fileEntry.name,
        errorCode: "UNKNOWN_CONTENT_PACK",
        message: "无法识别内容包类型",
      })
    }
  }

  return {
    kind: "archive",
    entries,
    ignoredFiles,
  }
}
