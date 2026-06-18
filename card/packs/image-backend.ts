import type { CardImportImageAsset } from "@/card/import/types"
import type {
  CardImageOwnershipIndex,
  CardPackImageDeleteResult,
  CardPackImageMigrationResult,
  CardPackImageWriteResult,
  CardPackIntegrityIssue,
  CardPackStoredImage,
  CardPackStoredImageSummary,
} from "./storage-types"

export interface CardPackImageBackend {
  writePackImages(packId: string, images: CardImportImageAsset[]): Promise<CardPackImageWriteResult>
  deletePackImages(packId: string): Promise<CardPackImageDeleteResult>
  listPackImages(packId: string): Promise<CardPackStoredImageSummary[]>
  getImage(templateId: string, packId?: string): Promise<CardPackStoredImage | null>
  migrateLegacyGlobalImages(ownership: CardImageOwnershipIndex): Promise<CardPackImageMigrationResult>
}

export interface CardImageTablePort {
  get(key: string): Promise<unknown>
  put(record: CardPackStoredImage): Promise<void>
  delete(key: string): Promise<void>
  toArray(): Promise<unknown[]>
}

export interface InMemoryCardPackImageBackend extends CardPackImageBackend {
  putLegacyGlobalImage(templateId: string, blob: Blob): Promise<void>
}

interface InMemoryCardPackImageBackendOptions {
  failWritesForTemplateIds?: Set<string>
  failDeletesForPackIds?: Set<string>
}

interface DexieCardPackImageBackendInput {
  table: CardImageTablePort
  now?: () => number
}

const DEFAULT_MIME_TYPE = "application/octet-stream"

function packScopedImageKey(packId: string, templateId: string) {
  return `${packId}/${templateId}`
}

function isPackScopedKeyFor(key: string, packId: string) {
  return key.startsWith(`${packId}/`)
}

function inferTemplateIdFromPackKey(key: string, packId: string) {
  return isPackScopedKeyFor(key, packId) ? key.slice(packId.length + 1) : undefined
}

function imageSummary(record: CardPackStoredImage): CardPackStoredImageSummary {
  return {
    key: record.key,
    packId: record.packId,
    templateId: record.templateId,
    size: record.size,
    mimeType: record.mimeType,
  }
}

function imageWriteIssue(packId: string, templateId: string, value?: unknown): CardPackIntegrityIssue {
  return {
    code: "IMAGE_WRITE_FAILED",
    packId,
    templateId,
    message: `Failed to write image ${templateId} for pack ${packId}`,
    value,
  }
}

function imageDeleteIssue(packId: string, storageKey: string, value?: unknown): CardPackIntegrityIssue {
  return {
    code: "IMAGE_DELETE_FAILED",
    packId,
    storageKey,
    message: `Failed to delete image ${storageKey} for pack ${packId}`,
    value,
  }
}

function migrationIssue(templateId: string, value?: unknown): CardPackIntegrityIssue {
  return {
    code: "IMAGE_MIGRATION_FAILED",
    templateId,
    message: `Failed to migrate legacy image ${templateId}`,
    value,
  }
}

function ambiguousMigrationIssue(templateId: string, owners: string[]): CardPackIntegrityIssue {
  return {
    code: "IMAGE_MIGRATION_AMBIGUOUS",
    templateId,
    storageKey: templateId,
    message: `Legacy image ${templateId} has multiple possible owning packs`,
    value: owners,
  }
}

function isImageRecord(value: unknown): value is CardPackStoredImage {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Partial<CardPackStoredImage>
  return (
    typeof candidate.key === "string" &&
    candidate.blob instanceof Blob &&
    typeof candidate.mimeType === "string" &&
    typeof candidate.size === "number" &&
    typeof candidate.createdAt === "number"
  )
}

async function imageRecordFromAsset(
  packId: string,
  asset: CardImportImageAsset,
  now: () => number,
): Promise<CardPackStoredImage> {
  if (!asset.readBlob) {
    throw new Error(`Image asset ${asset.templateId} is missing a blob reader`)
  }

  const blob = await asset.readBlob()

  return {
    key: packScopedImageKey(packId, asset.templateId),
    packId,
    templateId: asset.templateId,
    blob,
    mimeType: asset.mimeType ?? blob.type ?? DEFAULT_MIME_TYPE,
    size: asset.sizeBytes ?? blob.size,
    createdAt: now(),
  }
}

function legacyGlobalImages(records: Iterable<CardPackStoredImage>) {
  return [...records].filter((record) => !record.packId && !record.key.includes("/"))
}

export function createInMemoryCardPackImageBackend(
  options: InMemoryCardPackImageBackendOptions = {},
): InMemoryCardPackImageBackend {
  const records = new Map<string, CardPackStoredImage>()
  const now = () => Date.now()

  return {
    async writePackImages(packId, images) {
      const issues: CardPackIntegrityIssue[] = []
      const nextRecords: CardPackStoredImage[] = []

      for (const image of images) {
        if (options.failWritesForTemplateIds?.has(image.templateId)) {
          issues.push(imageWriteIssue(packId, image.templateId))
          continue
        }

        try {
          nextRecords.push(await imageRecordFromAsset(packId, image, now))
        } catch (error) {
          issues.push(imageWriteIssue(packId, image.templateId, error))
        }
      }

      if (issues.length > 0) {
        return { ok: false, writtenTemplateIds: [], issues }
      }

      for (const record of nextRecords) {
        records.set(record.key, record)
      }

      return {
        ok: true,
        writtenTemplateIds: nextRecords.map((record) => record.templateId).filter((id): id is string => Boolean(id)),
        issues: [],
      }
    },

    async deletePackImages(packId) {
      if (options.failDeletesForPackIds?.has(packId)) {
        return {
          ok: false,
          deletedKeys: [],
          issues: [
            {
              code: "IMAGE_DELETE_FAILED",
              packId,
              message: `Failed to delete images for pack ${packId}`,
            },
          ],
        }
      }

      const deletedKeys: string[] = []

      for (const key of records.keys()) {
        if (isPackScopedKeyFor(key, packId)) {
          records.delete(key)
          deletedKeys.push(key)
        }
      }

      return { ok: true, deletedKeys, issues: [] }
    },

    async listPackImages(packId) {
      return [...records.values()]
        .filter((record) => record.packId === packId || isPackScopedKeyFor(record.key, packId))
        .map((record) => ({
          ...imageSummary(record),
          packId: record.packId ?? packId,
          templateId: record.templateId ?? inferTemplateIdFromPackKey(record.key, packId),
        }))
    },

    async getImage(templateId, packId) {
      if (packId) {
        const scoped = records.get(packScopedImageKey(packId, templateId))
        if (scoped) {
          return scoped
        }
      }

      return records.get(templateId) ?? null
    },

    async migrateLegacyGlobalImages(ownership) {
      const issues: CardPackIntegrityIssue[] = []
      const migratedTemplateIds: string[] = []

      for (const image of legacyGlobalImages(records.values())) {
        const owners = ownership.ownersByTemplateId.get(image.key) ?? []

        if (owners.length > 1) {
          issues.push(ambiguousMigrationIssue(image.key, owners))
          continue
        }

        if (owners.length === 0) {
          continue
        }

        const [packId] = owners
        const templateId = image.templateId ?? image.key
        const scopedKey = packScopedImageKey(packId, templateId)
        const scopedImage = { ...image, key: scopedKey, packId, templateId }

        records.set(scopedKey, scopedImage)
        const verified = records.get(scopedKey)
        if (!verified) {
          issues.push(migrationIssue(templateId))
          continue
        }

        records.delete(image.key)
        migratedTemplateIds.push(templateId)
      }

      return { ok: issues.length === 0, migratedTemplateIds, issues }
    },

    async putLegacyGlobalImage(templateId, blob) {
      records.set(templateId, {
        key: templateId,
        templateId,
        blob,
        mimeType: blob.type || DEFAULT_MIME_TYPE,
        size: blob.size,
        createdAt: now(),
      })
    },
  }
}

export function createDexieCardPackImageBackend(input: DexieCardPackImageBackendInput): CardPackImageBackend {
  const now = input.now ?? (() => Date.now())

  return {
    async writePackImages(packId, images) {
      const issues: CardPackIntegrityIssue[] = []
      const records: CardPackStoredImage[] = []

      for (const image of images) {
        try {
          records.push(await imageRecordFromAsset(packId, image, now))
        } catch (error) {
          issues.push(imageWriteIssue(packId, image.templateId, error))
        }
      }

      if (issues.length > 0) {
        return { ok: false, writtenTemplateIds: [], issues }
      }

      const writtenTemplateIds: string[] = []
      for (const record of records) {
        try {
          await input.table.put(record)
          if (record.templateId) {
            writtenTemplateIds.push(record.templateId)
          }
        } catch (error) {
          issues.push(imageWriteIssue(packId, record.templateId ?? record.key, error))
        }
      }

      return { ok: issues.length === 0, writtenTemplateIds, issues }
    },

    async deletePackImages(packId) {
      const issues: CardPackIntegrityIssue[] = []
      const deletedKeys: string[] = []
      const records = (await input.table.toArray()).filter(isImageRecord)

      for (const record of records) {
        if (record.packId !== packId && !isPackScopedKeyFor(record.key, packId)) {
          continue
        }

        try {
          await input.table.delete(record.key)
          deletedKeys.push(record.key)
        } catch (error) {
          issues.push(imageDeleteIssue(packId, record.key, error))
        }
      }

      return { ok: issues.length === 0, deletedKeys, issues }
    },

    async listPackImages(packId) {
      const records = (await input.table.toArray()).filter(isImageRecord)

      return records
        .filter((record) => record.packId === packId || isPackScopedKeyFor(record.key, packId))
        .map((record) => ({
          ...imageSummary(record),
          packId: record.packId ?? packId,
          templateId: record.templateId ?? inferTemplateIdFromPackKey(record.key, packId),
        }))
    },

    async getImage(templateId, packId) {
      if (packId) {
        const scoped = await input.table.get(packScopedImageKey(packId, templateId))
        if (isImageRecord(scoped)) {
          return scoped
        }
      }

      const legacy = await input.table.get(templateId)
      return isImageRecord(legacy) ? legacy : null
    },

    async migrateLegacyGlobalImages(ownership) {
      const issues: CardPackIntegrityIssue[] = []
      const migratedTemplateIds: string[] = []
      const records = legacyGlobalImages((await input.table.toArray()).filter(isImageRecord))

      for (const image of records) {
        const owners = ownership.ownersByTemplateId.get(image.key) ?? []

        if (owners.length > 1) {
          issues.push(ambiguousMigrationIssue(image.key, owners))
          continue
        }

        if (owners.length === 0) {
          continue
        }

        const [packId] = owners
        const templateId = image.templateId ?? image.key
        const scopedImage = {
          ...image,
          key: packScopedImageKey(packId, templateId),
          packId,
          templateId,
        }

        try {
          await input.table.put(scopedImage)
          const verified = await input.table.get(scopedImage.key)
          if (!isImageRecord(verified)) {
            issues.push(migrationIssue(templateId))
            continue
          }
          await input.table.delete(image.key)
          migratedTemplateIds.push(templateId)
        } catch (error) {
          issues.push(migrationIssue(templateId, error))
        }
      }

      return { ok: issues.length === 0, migratedTemplateIds, issues }
    },
  }
}
