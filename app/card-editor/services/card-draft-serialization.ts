import type { CardPackageState } from "../types";
import type { CardEditorImageService } from "./card-editor-image-service";

const cardTypes = ["profession", "ancestry", "community", "subclass", "domain", "variant"] as const;

type CardType = (typeof cardTypes)[number];
type CardWithLocalImageFlag = { hasLocalImage?: unknown };
type VariantTypeDefinitionValue = NonNullable<
  NonNullable<CardPackageState["customFieldDefinitions"]>["variantTypes"]
>[string];

export type CardEditorImageReader = Pick<CardEditorImageService, "listImageKeys" | "getImageBlob">;

export type LegacyCardDraftJson = Pick<
  CardPackageState,
  | "name"
  | "version"
  | "description"
  | "author"
  | "customFieldDefinitions"
  | "profession"
  | "ancestry"
  | "community"
  | "subclass"
  | "domain"
  | "variant"
>;

export interface LegacyDhcbImageView {
  cardId: string;
  blob: Blob;
}

export interface LegacyDhcbView {
  cardsJson: LegacyCardDraftJson;
  images: LegacyDhcbImageView[];
}

function copyCardArray<T extends object>(cards: T[] | undefined): T[] {
  if (!Array.isArray(cards)) return [];

  return cards.map((card) => {
    const { hasLocalImage: _hasLocalImage, ...cardWithoutLocalImageFlag } = card as T & CardWithLocalImageFlag;
    return cardWithoutLocalImageFlag as T;
  });
}

function copyVariantTypeDefinition(definition: VariantTypeDefinitionValue): VariantTypeDefinitionValue {
  return {
    ...definition,
    subclasses: Array.isArray(definition.subclasses) ? [...definition.subclasses] : definition.subclasses,
    levelRange: Array.isArray(definition.levelRange) ? [...definition.levelRange] : definition.levelRange,
  };
}

function copyCustomFieldDefinitions(
  definitions: CardPackageState["customFieldDefinitions"],
): CardPackageState["customFieldDefinitions"] {
  if (!definitions || typeof definitions !== "object") {
    return definitions;
  }

  const copiedDefinitions = Object.fromEntries(
    Object.entries(definitions).map(([key, value]) => [
      key,
      key === "variantTypes" && isRecord(value)
        ? copyVariantTypes(value as Record<string, VariantTypeDefinitionValue>)
        : copyCustomFieldValue(value),
    ]),
  );

  return copiedDefinitions as CardPackageState["customFieldDefinitions"];
}

function copyCustomFieldValue(value: unknown): unknown {
  return Array.isArray(value) ? [...value] : value;
}

function copyVariantTypes(
  variantTypes: Record<string, VariantTypeDefinitionValue>,
): Record<string, VariantTypeDefinitionValue> {
  return Object.fromEntries(
    Object.entries(variantTypes).map(([type, definition]) => [
      type,
      copyVariantTypeDefinition(definition),
    ]),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function collectCardDraftIds(draft: CardPackageState): Set<string> {
  const ids = new Set<string>();

  for (const type of cardTypes) {
    const cards = draft[type];
    if (!Array.isArray(cards)) continue;

    for (const card of cards as Array<{ id?: unknown }>) {
      if (typeof card.id === "string" && card.id.length > 0) {
        ids.add(card.id);
      }
    }
  }

  return ids;
}

export function serializeCardDraftToLegacyJson(draft: CardPackageState): LegacyCardDraftJson {
  return {
    name: draft.name,
    version: draft.version,
    description: draft.description,
    author: draft.author,
    customFieldDefinitions: copyCustomFieldDefinitions(draft.customFieldDefinitions),
    profession: copyCardArray(draft.profession),
    ancestry: copyCardArray(draft.ancestry),
    community: copyCardArray(draft.community),
    subclass: copyCardArray(draft.subclass),
    domain: copyCardArray(draft.domain),
    variant: copyCardArray(draft.variant),
  };
}

function markCardsWithPackagedImages<T extends object>(cards: T[] | undefined, imageKeys: ReadonlySet<string>): T[] {
  if (!Array.isArray(cards)) return [];

  return cards.map((card) => {
    const cardId = (card as { id?: unknown }).id;
    const hasPackagedImage = typeof cardId === "string" && imageKeys.has(cardId);

    if (!hasPackagedImage) {
      const { hasLocalImage: _hasLocalImage, ...cardWithoutLocalImageFlag } = card as typeof card &
        CardWithLocalImageFlag;
      return cardWithoutLocalImageFlag as T;
    }

    const { imageUrl: _imageUrl, ...cardWithoutImageUrl } = card as typeof card & { imageUrl?: unknown };
    return {
      ...cardWithoutImageUrl,
      hasLocalImage: true,
    } as T;
  });
}

export async function createLegacyDhcbView(
  draft: CardPackageState,
  imageService: CardEditorImageReader,
): Promise<LegacyDhcbView> {
  const validCardIds = collectCardDraftIds(draft);
  const matchingImageKeys = (await imageService.listImageKeys()).filter((key) => validCardIds.has(key));
  const images: LegacyDhcbImageView[] = [];

  for (const cardId of matchingImageKeys) {
    try {
      const blob = await imageService.getImageBlob(cardId);
      if (blob) {
        images.push({ cardId, blob });
      }
    } catch {
      // Editor image storage is best-effort; export the card JSON without this packaged image.
    }
  }

  const packagedImageKeys = new Set(images.map((image) => image.cardId));
  const cardsJson = serializeCardDraftToLegacyJson(draft);
  const cardsJsonWithPackagedImages: LegacyCardDraftJson = {
    ...cardsJson,
    profession: markCardsWithPackagedImages(cardsJson.profession, packagedImageKeys),
    ancestry: markCardsWithPackagedImages(cardsJson.ancestry, packagedImageKeys),
    community: markCardsWithPackagedImages(cardsJson.community, packagedImageKeys),
    subclass: markCardsWithPackagedImages(cardsJson.subclass, packagedImageKeys),
    domain: markCardsWithPackagedImages(cardsJson.domain, packagedImageKeys),
    variant: markCardsWithPackagedImages(cardsJson.variant, packagedImageKeys),
  };

  return { cardsJson: cardsJsonWithPackagedImages, images };
}
