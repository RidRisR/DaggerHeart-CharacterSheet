import type {
  CardAncestryV1,
  CardClassV1,
  CardCommunityV1,
  CardDomainV1,
  CardImportImageAsset,
  CardPackDryRunCard,
  CardPackDryRunValidationModel,
  CardPackV1,
  CardPackV1DefinitionKey,
  CardPackV1Definitions,
  CardSubclassV1,
  CardVariantV1,
} from "./types"

interface CardGroupItems {
  classes: CardClassV1
  ancestries: CardAncestryV1
  communities: CardCommunityV1
  subclasses: CardSubclassV1
  domains: CardDomainV1
  variants: CardVariantV1
}

interface CardImportImageAssetInput {
  templateId?: string
  cardId?: string
  path: string
  sizeBytes?: number
  mimeType?: string
  readBlob?: () => Promise<Blob>
}

function withGroup<G extends keyof CardGroupItems>(
  items: CardGroupItems[G][] | undefined,
  group: G,
): Array<Extract<CardPackDryRunCard, { group: G }>> {
  return (items ?? []).map((item) => {
    const { automation: _automation, ...cardWithoutAutomation } = item
    return { ...cardWithoutAutomation, group } as unknown as Extract<CardPackDryRunCard, { group: G }>
  })
}

const definitionKeys: CardPackV1DefinitionKey[] = [
  "classes",
  "ancestries",
  "communities",
  "domains",
  "variants",
  "variantTypes",
]

function copyStringArray(items: string[] | undefined): string[] {
  return items ? [...items] : []
}

function copyVariantTypes(
  variantTypes: CardPackV1Definitions["variantTypes"],
): NonNullable<CardPackV1Definitions["variantTypes"]> {
  return Object.fromEntries(
    Object.entries(variantTypes ?? {}).map(([type, definition]) => [
      type,
      {
        ...definition,
        ...(definition.subclasses ? { subclasses: [...definition.subclasses] } : {}),
        ...(definition.levelRange ? { levelRange: [...definition.levelRange] as [number, number] } : {}),
      },
    ]),
  )
}

function getDeclaredDefinitions(definitions: CardPackV1Definitions | undefined): CardPackV1DefinitionKey[] {
  if (!definitions) {
    return []
  }

  return definitionKeys.filter((key) => Object.prototype.hasOwnProperty.call(definitions, key))
}

function copyImageAsset(asset: CardImportImageAssetInput): CardImportImageAsset {
  const templateId = asset.templateId ?? asset.cardId ?? ""
  const copy = { ...asset } as CardImportImageAsset

  if (asset.templateId === undefined) {
    Object.defineProperty(copy, "templateId", {
      value: templateId,
      enumerable: false,
      configurable: true,
      writable: true,
    })
  } else {
    copy.templateId = templateId
  }

  return copy
}

export function buildCardPackDryRunValidationModel(
  pack: CardPackV1,
  imageAssets: CardImportImageAssetInput[],
): CardPackDryRunValidationModel {
  return {
    metadata: {
      format: "daggerheart.card-pack.v1",
      name: pack.name,
      version: pack.version,
      author: pack.author,
      description: pack.description,
    },
    definitions: {
      classes: copyStringArray(pack.definitions?.classes),
      ancestries: copyStringArray(pack.definitions?.ancestries),
      communities: copyStringArray(pack.definitions?.communities),
      domains: copyStringArray(pack.definitions?.domains),
      variants: copyStringArray(pack.definitions?.variants),
      variantTypes: copyVariantTypes(pack.definitions?.variantTypes),
    },
    declaredDefinitions: getDeclaredDefinitions(pack.definitions),
    cards: [
      ...withGroup(pack.classes, "classes"),
      ...withGroup(pack.ancestries, "ancestries"),
      ...withGroup(pack.communities, "communities"),
      ...withGroup(pack.subclasses, "subclasses"),
      ...withGroup(pack.domains, "domains"),
      ...withGroup(pack.variants, "variants"),
    ],
    imageAssets: imageAssets.map(copyImageAsset),
  }
}
