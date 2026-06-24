import { compileCardAutomationDefinition } from "@/card/automation/compile-definition"
import { makeCardImportError } from "./diagnostics"
import { getImageAssetTemplateId } from "./types"
import type {
  CardImportDiagnostic,
  CardImportErrorCode,
  CardPackDryRunCard,
  CardPackDryRunValidationModel,
  CardPackV1,
  CardPackV1DefinitionKey,
} from "./types"

const groupOrder = ["classes", "ancestries", "communities", "subclasses", "domains", "variants"] as const
type CardGroup = (typeof groupOrder)[number]

function validateDuplicateIds(model: CardPackDryRunValidationModel): CardImportDiagnostic[] {
  const diagnostics: CardImportDiagnostic[] = []
  const seen = new Map<string, string>()
  const countsByGroup: Record<string, number> = {}

  for (const card of model.cards) {
    const index = countsByGroup[card.group] ?? 0
    countsByGroup[card.group] = index + 1
    const path = `/${card.group}/${index}/id`
    const existingPath = seen.get(card.id)

    if (existingPath) {
      diagnostics.push(
        makeCardImportError("DUPLICATE_ID", path, "Duplicate card id.", {
          value: card.id,
          relatedPaths: [existingPath],
        }),
      )
    } else {
      seen.set(card.id, path)
    }
  }

  return diagnostics
}

function requireReference(
  diagnostics: CardImportDiagnostic[],
  model: CardPackDryRunValidationModel,
  definitionKey: CardPackV1DefinitionKey,
  values: string[],
  path: string,
  value: unknown,
): void {
  if (!model.declaredDefinitions.includes(definitionKey)) {
    return
  }

  if (typeof value === "string" && value.length > 0 && !values.includes(value)) {
    diagnostics.push(
      makeCardImportError("UNKNOWN_REFERENCE", path, "Referenced definition is not declared by this pack.", { value }),
    )
  }
}

function validateReferences(model: CardPackDryRunValidationModel): CardImportDiagnostic[] {
  const diagnostics: CardImportDiagnostic[] = []

  for (const group of groupOrder) {
    const cards = model.cards.filter((card) => card.group === group)

    cards.forEach((card, index) => {
      if (card.group === "classes") {
        requireReference(diagnostics, model, "classes", model.definitions.classes, `/classes/${index}/name`, card.name)
        requireReference(diagnostics, model, "domains", model.definitions.domains, `/classes/${index}/domain1`, card.domain1)
        requireReference(diagnostics, model, "domains", model.definitions.domains, `/classes/${index}/domain2`, card.domain2)
      }

      if (card.group === "ancestries") {
        requireReference(
          diagnostics,
          model,
          "ancestries",
          model.definitions.ancestries,
          `/ancestries/${index}/ancestry`,
          card.ancestry,
        )
      }

      if (card.group === "communities") {
        requireReference(
          diagnostics,
          model,
          "communities",
          model.definitions.communities,
          `/communities/${index}/name`,
          card.name,
        )
      }

      if (card.group === "subclasses") {
        requireReference(diagnostics, model, "classes", model.definitions.classes, `/subclasses/${index}/class`, card.class)
      }

      if (card.group === "domains") {
        requireReference(diagnostics, model, "domains", model.definitions.domains, `/domains/${index}/domain`, card.domain)
      }

      if (card.group === "variants") {
        requireReference(diagnostics, model, "variants", model.definitions.variants, `/variants/${index}/type`, card.type)
        const typeDefinition = model.definitions.variantTypes[card.type]

        if (
          model.declaredDefinitions.includes("variantTypes") &&
          card.subCategory &&
          typeDefinition?.subclasses?.length &&
          !typeDefinition.subclasses.includes(card.subCategory)
        ) {
          diagnostics.push(
            makeCardImportError(
              "UNKNOWN_REFERENCE",
              `/variants/${index}/subCategory`,
              "Variant subcategory is not declared by this pack.",
              { value: card.subCategory },
            ),
          )
        }
      }
    })
  }

  return diagnostics
}

function validateImageAssets(model: CardPackDryRunValidationModel): CardImportDiagnostic[] {
  const cardIds = new Set(model.cards.map((card) => card.id))

  return model.imageAssets
    .map((asset, index) => ({ asset, index }))
    .filter(({ asset }) => !cardIds.has(getImageAssetTemplateId(asset)))
    .map(({ asset, index }) => {
      const legacyCardIdOnly = asset.cardId !== undefined && !Object.prototype.propertyIsEnumerable.call(asset, "templateId")

      return makeCardImportError(
        "ORPHAN_IMAGE",
        `/imageAssets/${index}/${legacyCardIdOnly ? "cardId" : "templateId"}`,
        "Image does not reference a card in this pack.",
        {
          value: getImageAssetTemplateId(asset),
        },
      )
    })
}

function sourceCardsForGroup(pack: CardPackV1, group: CardGroup) {
  return pack[group] ?? []
}

function cardPath(group: CardGroup, index: number): string {
  return `/${group}/${index}`
}

function automationDiagnosticPath(basePath: string, childPath: string | undefined): string {
  if (!childPath) return basePath
  const sourcePath = childPath.startsWith("/abilities") ? `/body${childPath}` : childPath
  return sourcePath.startsWith("/") ? `${basePath}${sourcePath}` : `${basePath}/${sourcePath}`
}

export function compileCardPackAutomation(
  pack: CardPackV1,
  model: CardPackDryRunValidationModel,
): { model: CardPackDryRunValidationModel; diagnostics: CardImportDiagnostic[] } {
  const diagnostics: CardImportDiagnostic[] = []
  const countsByGroup: Partial<Record<CardGroup, number>> = {}
  const cards = model.cards.map((card) => {
    const group = card.group
    const index = countsByGroup[group] ?? 0
    countsByGroup[group] = index + 1
    const sourceAutomation = sourceCardsForGroup(pack, group)[index]?.automation

    if (sourceAutomation === undefined) {
      return card
    }

    const result = compileCardAutomationDefinition(sourceAutomation)
    if (!result.ok) {
      for (const diagnostic of result.diagnostics) {
        diagnostics.push(
          makeCardImportError(
            diagnostic.code as CardImportErrorCode,
            automationDiagnosticPath(`${cardPath(group, index)}/automation`, diagnostic.path),
            diagnostic.message,
            { value: diagnostic.value },
          ),
        )
      }
      return card
    }

    return { ...card, automation: result.ir } as CardPackDryRunCard
  })

  return {
    model: { ...model, cards },
    diagnostics,
  }
}

export function validateCardPackSemantics(model: CardPackDryRunValidationModel): CardImportDiagnostic[] {
  return [...validateDuplicateIds(model), ...validateReferences(model), ...validateImageAssets(model)]
}
