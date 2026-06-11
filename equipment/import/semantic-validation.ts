import { makeErrorDiagnostic } from "./diagnostics"
import type {
  EquipmentPackConflictContext,
  EquipmentPackImportDiagnostic,
  NormalizedEquipmentPackData,
} from "./types"

type TemplateRef = { id: string; path: string }

function templateRefs(pack: NormalizedEquipmentPackData): TemplateRef[] {
  return [
    ...pack.weapons.map((template, index) => ({
      id: template.id,
      path: `/equipment/weapons/${index}/id`,
    })),
    ...pack.armor.map((template, index) => ({
      id: template.id,
      path: `/equipment/armor/${index}/id`,
    })),
  ]
}

export function validateEquipmentPackSemantics(
  pack: NormalizedEquipmentPackData,
): EquipmentPackImportDiagnostic[] {
  const diagnostics: EquipmentPackImportDiagnostic[] = []

  if (pack.weapons.length + pack.armor.length === 0) {
    diagnostics.push(makeErrorDiagnostic("EMPTY_EQUIPMENT", "/equipment", "Equipment pack is empty."))
  }

  const firstPathById = new Map<string, string>()
  for (const item of templateRefs(pack)) {
    const firstPath = firstPathById.get(item.id)
    if (firstPath) {
      diagnostics.push(
        makeErrorDiagnostic("DUPLICATE_ID", item.path, "Duplicate template id.", {
          value: item.id,
          relatedPaths: [firstPath],
        }),
      )
    } else {
      firstPathById.set(item.id, item.path)
    }
  }

  const templateGroups = [
    ...pack.weapons.map((template, templateIndex) => ({
      contributions: template.modifierContributions,
      basePath: `/equipment/weapons/${templateIndex}/modifierContributions`,
    })),
    ...pack.armor.map((template, templateIndex) => ({
      contributions: template.modifierContributions,
      basePath: `/equipment/armor/${templateIndex}/modifierContributions`,
    })),
  ]

  for (const group of templateGroups) {
    const firstContributionPathById = new Map<string, string>()
    for (const [contributionIndex, contribution] of group.contributions.entries()) {
      const path = `${group.basePath}/${contributionIndex}/id`
      const firstPath = firstContributionPathById.get(contribution.id)
      if (firstPath) {
        diagnostics.push(
          makeErrorDiagnostic("DUPLICATE_ID", path, "Duplicate contribution id.", {
            value: contribution.id,
            relatedPaths: [firstPath],
          }),
        )
      } else {
        firstContributionPathById.set(contribution.id, path)
      }
    }
  }

  for (const [index, armor] of pack.armor.entries()) {
    if (armor.baseThresholds.major < armor.baseThresholds.minor) {
      diagnostics.push(
        makeErrorDiagnostic(
          "INVALID_THRESHOLD_ORDER",
          `/equipment/armor/${index}/baseThresholds/major`,
          "Major threshold must be greater than or equal to minor threshold.",
          { value: { ...armor.baseThresholds } },
        ),
      )
    }
  }

  return diagnostics
}

export function checkEquipmentPackConflicts(
  pack: NormalizedEquipmentPackData,
  context: EquipmentPackConflictContext,
): EquipmentPackImportDiagnostic[] {
  const diagnostics: EquipmentPackImportDiagnostic[] = []

  if (context.customPackCount >= context.maxCustomPackCount) {
    diagnostics.push(
      makeErrorDiagnostic("PACK_LIMIT_EXCEEDED", "", "Custom equipment pack limit exceeded.", {
        value: {
          customPackCount: context.customPackCount,
          maxCustomPackCount: context.maxCustomPackCount,
        },
      }),
    )
  }

  for (const template of templateRefs(pack)) {
    if (context.builtinTemplateIds.has(template.id)) {
      diagnostics.push(
        makeErrorDiagnostic("ID_CONFLICT", template.path, "Template id conflicts with builtin equipment.", {
          value: { id: template.id, conflictSource: "builtin" },
        }),
      )
      continue
    }

    if (context.importedTemplateIds.has(template.id)) {
      diagnostics.push(
        makeErrorDiagnostic("ID_CONFLICT", template.path, "Template id conflicts with imported equipment.", {
          value: {
            id: template.id,
            conflictSource: "custom",
            ...context.importedTemplateSources?.get(template.id),
          },
        }),
      )
    }
  }

  return diagnostics
}
