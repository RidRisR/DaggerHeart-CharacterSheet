import { makeCardImportError } from "./diagnostics"
import { getImageAssetTemplateId } from "./types"
import type { CardImportDiagnostic, CardPackDryRunValidationModel, CardPackV1DefinitionKey } from "./types"

const groupOrder = ["classes", "ancestries", "communities", "subclasses", "domains", "variants"] as const

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

export function validateCardPackSemantics(model: CardPackDryRunValidationModel): CardImportDiagnostic[] {
  return [...validateDuplicateIds(model), ...validateReferences(model), ...validateImageAssets(model)]
}
