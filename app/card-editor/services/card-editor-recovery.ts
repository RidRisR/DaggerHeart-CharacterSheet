import JSZip from "jszip"
import type { CardPackageState } from "../types"
import type { CardDraftRepairReport } from "./card-draft-repair"
import { repairCardEditorDraft } from "./card-draft-repair"
import type { CardEditorImageService } from "./card-editor-image-service"
import { collectCardDraftIds } from "./card-draft-serialization"

export type CardEditorRecoveryWarning =
  | { kind: "orphanImageSkipped"; imageId: string; path: string }
  | { kind: "imagePersistenceFailed"; imageId: string; path: string }

export interface CardEditorRecoveryReport {
  repairs: CardDraftRepairReport["repairs"]
  warnings: CardEditorRecoveryWarning[]
}

export interface CardEditorRecoveryResult {
  draft: CardPackageState
  report: CardEditorRecoveryReport
}

type LegacyEditorOnlyDraftFields = {
  isModified?: unknown
  lastSaved?: unknown
}

type CardWithLocalImageFlag = { hasLocalImage?: unknown; id?: unknown }

export async function recoverCardDraftFromJsonObject(
  value: unknown,
  imageService: CardEditorImageService,
): Promise<CardEditorRecoveryResult> {
  const repaired = repairCardEditorDraft(stripEditorOnlyDraftFields(value) as CardPackageState)

  await imageService.clearAllImages()

  return {
    draft: markDraftCardsWithSavedImages(repaired.draft, new Set()),
    report: {
      repairs: repaired.report.repairs,
      warnings: [],
    },
  }
}

export async function recoverCardDraftFromDhcbFile(
  file: File,
  imageService: CardEditorImageService,
): Promise<CardEditorRecoveryResult> {
  const zip = await JSZip.loadAsync(file)
  const cardsFile = zip.file("cards.json")

  if (!cardsFile) {
    throw new Error("cards.json not found in ZIP file")
  }

  const cardsData = JSON.parse(await cardsFile.async("text"))
  const repaired = repairCardEditorDraft(stripEditorOnlyDraftFields(cardsData) as CardPackageState)
  const validCardIds = collectCardDraftIds(repaired.draft)
  const stagedImages: Array<{ imageId: string; path: string; blob: Blob }> = []
  const savedImageIds = new Set<string>()
  const warnings: CardEditorRecoveryWarning[] = []

  for (const path of imagePaths(zip)) {
    const imageId = imageIdFromPath(path)

    if (!validCardIds.has(imageId)) {
      warnings.push({ kind: "orphanImageSkipped", imageId, path })
      continue
    }

    const imageFile = zip.file(path)
    if (!imageFile) continue

    try {
      const blob = await imageFile.async("blob")
      stagedImages.push({ imageId, path, blob })
    } catch {
      warnings.push({ kind: "imagePersistenceFailed", imageId, path })
    }
  }

  await imageService.clearAllImages()

  for (const { imageId, path, blob } of stagedImages) {
    try {
      await imageService.saveImageBlob(imageId, blob)
      savedImageIds.add(imageId)
    } catch {
      warnings.push({ kind: "imagePersistenceFailed", imageId, path })
    }
  }

  return {
    draft: markDraftCardsWithSavedImages(repaired.draft, savedImageIds),
    report: {
      repairs: repaired.report.repairs,
      warnings,
    },
  }
}

function stripEditorOnlyDraftFields(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value
  }

  const {
    isModified: _isModified,
    lastSaved: _lastSaved,
    ...draftData
  } = value as Record<string, unknown> & LegacyEditorOnlyDraftFields

  return draftData
}

function imagePaths(zip: JSZip): string[] {
  return Object.keys(zip.files).filter((path) => path.startsWith("images/") && !zip.files[path]?.dir)
}

function imageIdFromPath(path: string): string {
  return path.replace(/^images\//, "").replace(/\.(webp|png|jpg|jpeg|gif|svg)$/i, "")
}

function markDraftCardsWithSavedImages(draft: CardPackageState, savedImageIds: ReadonlySet<string>): CardPackageState {
  return {
    ...draft,
    profession: markCardsWithSavedImages(draft.profession, savedImageIds),
    ancestry: markCardsWithSavedImages(draft.ancestry, savedImageIds),
    community: markCardsWithSavedImages(draft.community, savedImageIds),
    subclass: markCardsWithSavedImages(draft.subclass, savedImageIds),
    domain: markCardsWithSavedImages(draft.domain, savedImageIds),
    variant: markCardsWithSavedImages(draft.variant, savedImageIds),
  }
}

function markCardsWithSavedImages<T extends CardWithLocalImageFlag>(cards: T[] | undefined, savedImageIds: ReadonlySet<string>): T[] {
  if (!Array.isArray(cards)) return []

  return cards.map((card) => {
    const { hasLocalImage: _hasLocalImage, ...cardWithoutLocalImageFlag } = card

    if (typeof card.id !== "string" || !savedImageIds.has(card.id)) {
      return cardWithoutLocalImageFlag as T
    }

    return {
      ...cardWithoutLocalImageFlag,
      hasLocalImage: true,
    } as T
  })
}
