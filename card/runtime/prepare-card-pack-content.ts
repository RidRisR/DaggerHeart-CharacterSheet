import { buildCardPackDryRunValidationModel } from "@/card/import/dry-run-model"
import { validateLegacyExternalContract } from "@/card/import/external-contract-guard"
import { adaptLegacyCardPack } from "@/card/import/legacy-adapter"
import { validateCardPackV1Structure } from "@/card/import/schema-validator"
import { compileCardPackAutomation, validateCardPackSemantics } from "@/card/import/semantic-validation"
import { makeCardImportError } from "@/card/import/diagnostics"
import type {
  CardImportDiagnostic,
  CardImportImageAsset,
  CardImportPipelineStage,
  CardImportSource,
  CardPackDryRunValidationModel,
  CardPackV1,
} from "@/card/import/types"

type RoutedCardPack =
  | {
      success: true
      value: CardPackV1
      diagnostics: CardImportDiagnostic[]
    }
  | {
      success: false
      stage: CardImportPipelineStage
      diagnostics: CardImportDiagnostic[]
    }

export type PreparedCardPackRuntimeContent =
  | {
      success: true
      model: CardPackDryRunValidationModel
      diagnostics: CardImportDiagnostic[]
      pack: CardPackV1
    }
  | {
      success: false
      stage: "formatRouting" | "structuralValidation" | "semanticValidation"
      diagnostics: CardImportDiagnostic[]
      pack?: CardPackV1
      model?: CardPackDryRunValidationModel
      importStage?: CardImportPipelineStage
    }

function hasErrors(diagnostics: CardImportDiagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === "error")
}

function routeCardPackFormat(value: unknown, _source?: CardImportSource): RoutedCardPack {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {
      success: false,
      stage: "externalContractGuard",
      diagnostics: [makeCardImportError("INVALID_TYPE", "", "Card pack payload must be an object.", { value })],
    }
  }

  const record = value as Record<string, unknown>

  if (record.format === undefined) {
    const guarded = validateLegacyExternalContract(record)
    if (!guarded.success) {
      return { success: false, stage: "externalContractGuard", diagnostics: guarded.diagnostics }
    }

    const adapted = adaptLegacyCardPack(guarded.value)
    return { success: true, value: adapted.value, diagnostics: adapted.diagnostics }
  }

  if (record.format === "daggerheart.card-pack.v1") {
    return { success: true, value: record as unknown as CardPackV1, diagnostics: [] }
  }

  return {
    success: false,
    stage: "externalFormatAdapter",
    diagnostics: [
      makeCardImportError("UNSUPPORTED_FORMAT", "/format", "Unsupported card pack format.", { value: record.format }),
    ],
  }
}

export function prepareCardPackContentForRuntime(input: {
  payload: unknown
  source?: CardImportSource
  imageAssets?: CardImportImageAsset[]
}): PreparedCardPackRuntimeContent {
  const imageAssets = input.imageAssets ?? []
  const routed = routeCardPackFormat(input.payload, input.source)
  if (!routed.success) {
    return {
      success: false,
      stage: "formatRouting",
      importStage: routed.stage,
      diagnostics: routed.diagnostics,
    }
  }

  const structural = validateCardPackV1Structure(routed.value)
  if (!structural.success) {
    return {
      success: false,
      stage: "structuralValidation",
      diagnostics: [...routed.diagnostics, ...structural.diagnostics],
      pack: routed.value,
    }
  }

  const modelWithoutCompiledAutomation = buildCardPackDryRunValidationModel(structural.value, imageAssets)
  const automationCompilation = compileCardPackAutomation(structural.value, modelWithoutCompiledAutomation)
  const model = automationCompilation.model
  const semanticDiagnostics = [...automationCompilation.diagnostics, ...validateCardPackSemantics(model)]
  const diagnostics = [...routed.diagnostics, ...semanticDiagnostics]

  if (hasErrors(semanticDiagnostics)) {
    return {
      success: false,
      stage: "semanticValidation",
      diagnostics,
      pack: structural.value,
      model,
    }
  }

  return { success: true, diagnostics, model, pack: structural.value }
}
