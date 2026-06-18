import { makeCardImportWarning } from "./diagnostics"
import { appendJsonPointer } from "./json-pointer"
import type { CardImportDiagnostic, CardPackV1, CardPackV1Definitions } from "./types"

type RawRecord = Record<string, unknown>

const topLevelKnownFields = new Set([
  "name",
  "version",
  "author",
  "description",
  "customFieldDefinitions",
  "profession",
  "ancestry",
  "community",
  "subclass",
  "domain",
  "variant",
])

const knownCardFields: Record<string, Set<string>> = {
  profession: new Set([
    "id",
    "名称",
    "简介",
    "imageUrl",
    "hasLocalImage",
    "领域1",
    "领域2",
    "起始生命",
    "起始闪避",
    "起始物品",
    "希望特性",
    "职业特性",
  ]),
  ancestry: new Set(["id", "名称", "种族", "简介", "效果", "类别", "imageUrl", "hasLocalImage"]),
  community: new Set(["id", "名称", "特性", "简介", "描述", "imageUrl", "hasLocalImage"]),
  subclass: new Set(["id", "名称", "描述", "imageUrl", "hasLocalImage", "主职", "子职业", "等级", "施法"]),
  domain: new Set(["id", "名称", "领域", "描述", "imageUrl", "hasLocalImage", "等级", "属性", "回想"]),
  variant: new Set(["id", "名称", "类型", "子类别", "等级", "效果", "imageUrl", "hasLocalImage", "简略信息"]),
}

function asRecord(value: unknown): RawRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as RawRecord) : {}
}

function isRecord(value: unknown): value is RawRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function asRecordArray(value: unknown): RawRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : []
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length > 0) : []
}

function uniqueStrings(values: unknown[]): string[] {
  return Array.from(new Set(values.filter((value): value is string => typeof value === "string" && value.length > 0)))
}

function warnUnknownFields(group: string, value: unknown, diagnostics: CardImportDiagnostic[]) {
  const known = knownCardFields[group]

  if (!Array.isArray(value)) return

  value.forEach((item, index) => {
    if (!isRecord(item)) return

    for (const [key, value] of Object.entries(item)) {
      if (!known.has(key)) {
        diagnostics.push(
          makeCardImportWarning(
            "LEGACY_UNKNOWN_FIELD_DROPPED",
            appendJsonPointer(appendJsonPointer(appendJsonPointer("", group), index), key),
            "Unknown legacy card field was ignored.",
            { value },
          ),
        )
      }
    }
  })
}

function deriveDefinitions(input: RawRecord): CardPackV1Definitions {
  const classes = asRecordArray(input.profession)
  const ancestries = asRecordArray(input.ancestry)
  const communities = asRecordArray(input.community)
  const subclasses = asRecordArray(input.subclass)
  const domains = asRecordArray(input.domain)
  const variants = asRecordArray(input.variant)
  const explicit = asRecord(input.customFieldDefinitions)
  const explicitVariantTypes = isRecord(explicit.variantTypes) ? explicit.variantTypes : {}

  const variantNames = uniqueStrings([
    ...asStringArray(explicit.variants),
    ...Object.keys(explicitVariantTypes),
    ...variants.map((card) => card.类型),
  ])
  const variantTypes: NonNullable<CardPackV1Definitions["variantTypes"]> = {}

  for (const type of variantNames) {
    const matching = variants.filter((card) => card.类型 === type)
    const levels = matching.map((card) => card.等级).filter((level): level is number => typeof level === "number")
    const explicitVariantType = asRecord(explicitVariantTypes[type])
    const explicitLevelRange = explicitVariantType.levelRange

    variantTypes[type] = {
      description: typeof explicitVariantType.description === "string" ? explicitVariantType.description : undefined,
      subclasses: uniqueStrings([...asStringArray(explicitVariantType.subclasses), ...matching.map((card) => card.子类别)]),
      levelRange:
        Array.isArray(explicitLevelRange) &&
        explicitLevelRange.length === 2 &&
        explicitLevelRange.every((level): level is number => typeof level === "number")
          ? [explicitLevelRange[0], explicitLevelRange[1]]
          : levels.length > 0
            ? [Math.min(...levels), Math.max(...levels)]
            : undefined,
    }
  }

  return {
    classes: uniqueStrings([
      ...asStringArray(explicit.professions),
      ...asStringArray(explicit.classes),
      ...classes.map((card) => card.名称),
      ...subclasses.map((card) => card.主职),
    ]),
    ancestries: uniqueStrings([...asStringArray(explicit.ancestries), ...ancestries.map((card) => card.种族)]),
    communities: uniqueStrings([...asStringArray(explicit.communities), ...communities.map((card) => card.名称)]),
    domains: uniqueStrings([
      ...asStringArray(explicit.domains),
      ...classes.map((card) => card.领域1),
      ...classes.map((card) => card.领域2),
      ...domains.map((card) => card.领域),
    ]),
    variants: variantNames,
    variantTypes,
  }
}

export function adaptLegacyCardPack(input: unknown): { value: CardPackV1; diagnostics: CardImportDiagnostic[] } {
  const source = asRecord(input)
  const diagnostics: CardImportDiagnostic[] = [
    makeCardImportWarning("LEGACY_FORMAT_ASSUMED", "", "No format field; using legacy card format."),
  ]

  for (const [key, value] of Object.entries(source)) {
    if (!topLevelKnownFields.has(key)) {
      diagnostics.push(
        makeCardImportWarning(
          "LEGACY_UNKNOWN_FIELD_DROPPED",
          appendJsonPointer("", key),
          "Unknown legacy field was ignored.",
          { value },
        ),
      )
    }
  }

  for (const group of Object.keys(knownCardFields)) {
    warnUnknownFields(group, source[group], diagnostics)
  }

  return {
    value: {
      format: "daggerheart.card-pack.v1",
      name: source.name,
      version: source.version,
      author: source.author,
      description: source.description,
      definitions: deriveDefinitions(source),
      classes: asRecordArray(source.profession).map((card) => ({
        id: card.id,
        name: card.名称,
        summary: card.简介,
        imageUrl: card.imageUrl,
        hasLocalImage: card.hasLocalImage,
        domain1: card.领域1,
        domain2: card.领域2,
        startingHitPoints: card.起始生命,
        startingEvasion: card.起始闪避,
        startingItems: card.起始物品,
        hopeFeature: card.希望特性,
        classFeature: card.职业特性,
      })),
      ancestries: asRecordArray(source.ancestry).map((card) => ({
        id: card.id,
        name: card.名称,
        ancestry: card.种族,
        summary: card.简介,
        effect: card.效果,
        category: card.类别,
        imageUrl: card.imageUrl,
        hasLocalImage: card.hasLocalImage,
      })),
      communities: asRecordArray(source.community).map((card) => ({
        id: card.id,
        name: card.名称,
        feature: card.特性,
        summary: card.简介,
        description: card.描述,
        imageUrl: card.imageUrl,
        hasLocalImage: card.hasLocalImage,
      })),
      subclasses: asRecordArray(source.subclass).map((card) => ({
        id: card.id,
        name: card.名称,
        description: card.描述,
        imageUrl: card.imageUrl,
        hasLocalImage: card.hasLocalImage,
        class: card.主职,
        subclass: card.子职业,
        level: card.等级,
        spellcastTrait: card.施法,
      })),
      domains: asRecordArray(source.domain).map((card) => ({
        id: card.id,
        name: card.名称,
        domain: card.领域,
        description: card.描述,
        imageUrl: card.imageUrl,
        hasLocalImage: card.hasLocalImage,
        level: card.等级,
        trait: card.属性,
        recallCost: card.回想,
      })),
      variants: asRecordArray(source.variant).map((card) => ({
        id: card.id,
        name: card.名称,
        type: card.类型,
        subCategory: card.子类别,
        level: card.等级,
        effect: card.效果,
        imageUrl: card.imageUrl,
        hasLocalImage: card.hasLocalImage,
        summaryItems: card.简略信息,
      })),
    } as CardPackV1,
    diagnostics,
  }
}
