import type { CardPackageState } from "../types";
import type { CardEditorImageService } from "./card-editor-image-service";
import { collectCardDraftIds } from "./card-draft-serialization";

type LegacyEditorOnlyDraftFields = {
  isModified?: unknown;
  lastSaved?: unknown;
};
type CardWithLocalImageFlag = {
  id?: unknown;
  hasLocalImage?: unknown;
};

export interface CardEditorWorkspaceRecoveryReport {
  staleLocalImageFlagsRemoved: string[];
  localImageFlagsConfirmed: string[];
  orphanImagesDeleted: string[];
  orphanImageCleanupFailed: string[];
  imageLookupFailed: string[];
  legacyEditorFieldsRemoved: string[];
}

export async function recoverPersistedCardEditorWorkspace(
  draft: CardPackageState,
  imageService: CardEditorImageService,
): Promise<{ draft: CardPackageState; report: CardEditorWorkspaceRecoveryReport }> {
  const { draft: draftWithoutLegacyFields, removedFields } = stripLegacyEditorFields(draft);
  const report: CardEditorWorkspaceRecoveryReport = {
    staleLocalImageFlagsRemoved: [],
    localImageFlagsConfirmed: [],
    orphanImagesDeleted: [],
    orphanImageCleanupFailed: [],
    imageLookupFailed: [],
    legacyEditorFieldsRemoved: removedFields,
  };
  const recoveredDraft: CardPackageState = {
    ...draftWithoutLegacyFields,
    profession: await recoverCards(draftWithoutLegacyFields.profession, imageService, report),
    ancestry: await recoverCards(draftWithoutLegacyFields.ancestry, imageService, report),
    community: await recoverCards(draftWithoutLegacyFields.community, imageService, report),
    subclass: await recoverCards(draftWithoutLegacyFields.subclass, imageService, report),
    domain: await recoverCards(draftWithoutLegacyFields.domain, imageService, report),
    variant: await recoverCards(draftWithoutLegacyFields.variant, imageService, report),
  };

  const validCardIds = collectCardDraftIds(recoveredDraft);
  try {
    const cleanupResult = await imageService.cleanupOrphanImages(validCardIds);
    report.orphanImagesDeleted.push(...cleanupResult.deleted);
    report.orphanImageCleanupFailed.push(...cleanupResult.failed);
  } catch {
    report.orphanImageCleanupFailed.push("*");
  }

  return { draft: recoveredDraft, report };
}

function stripLegacyEditorFields(draft: CardPackageState): {
  draft: CardPackageState;
  removedFields: string[];
} {
  const legacyDraft = draft as CardPackageState & LegacyEditorOnlyDraftFields;
  const removedFields: string[] = [];

  if (Object.prototype.hasOwnProperty.call(legacyDraft, "isModified")) {
    removedFields.push("isModified");
  }
  if (Object.prototype.hasOwnProperty.call(legacyDraft, "lastSaved")) {
    removedFields.push("lastSaved");
  }

  const {
    isModified: _isModified,
    lastSaved: _lastSaved,
    ...draftWithoutLegacyFields
  } = legacyDraft;

  return { draft: draftWithoutLegacyFields as CardPackageState, removedFields };
}

async function recoverCards<T>(
  cards: T[] | undefined,
  imageService: CardEditorImageService,
  report: CardEditorWorkspaceRecoveryReport,
): Promise<T[]> {
  if (!Array.isArray(cards)) return [];

  const recoveredCards: T[] = [];

  for (const card of cards) {
    recoveredCards.push(await recoverCard(card, imageService, report));
  }

  return recoveredCards;
}

async function recoverCard<T>(
  card: T,
  imageService: CardEditorImageService,
  report: CardEditorWorkspaceRecoveryReport,
): Promise<T> {
  if (!card || typeof card !== "object" || Array.isArray(card)) {
    return card;
  }

  const cardWithLocalImageFlag = card as T & CardWithLocalImageFlag;
  const { hasLocalImage: _hasLocalImage, ...cardWithoutLocalImageFlag } = cardWithLocalImageFlag;
  const cardId = cardWithLocalImageFlag.id;

  if (typeof cardId !== "string" || cardId.length === 0) {
    return cardWithoutLocalImageFlag as T;
  }

  try {
    const blob = await imageService.getImageBlob(cardId);
    if (blob) {
      report.localImageFlagsConfirmed.push(cardId);
      return {
        ...cardWithoutLocalImageFlag,
        hasLocalImage: true,
      } as T;
    }
  } catch {
    report.imageLookupFailed.push(cardId);
  }

  if (cardWithLocalImageFlag.hasLocalImage === true) {
    report.staleLocalImageFlagsRemoved.push(cardId);
  }

  return cardWithoutLocalImageFlag as T;
}
