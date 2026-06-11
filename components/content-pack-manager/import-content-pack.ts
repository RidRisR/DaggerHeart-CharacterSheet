import type { ImportData, ImportResult } from "@/card/card-types"
import type { DhcbImportResult } from "@/card/utils/dhcb-importer"
import { toDiagnosticView, type EquipmentUiStoreDiagnostic } from "@/equipment/ui/types"
import type { ContentPackImportDiagnosticView, ContentPackImportResultView } from "./global-import-panel"

export type ContentPackAggregateStatus = "success" | "partialFailure" | "failed"
export type ContentPackTab = "cards" | "equipment"

interface EquipmentImportResultLike {
  success: boolean
  summary: {
    weaponCount: number
    armorCount: number
  }
  diagnostics: EquipmentUiStoreDiagnostic[]
}

export interface ImportContentPackDependencies {
  importEquipmentFile(file: File): Promise<EquipmentImportResultLike>
  importCardJson(importData: ImportData, fileName: string): Promise<ImportResult>
  importDhcb(file: File): Promise<DhcbImportResult>
  toEquipmentDiagnosticView?: typeof toDiagnosticView
}

export interface ImportContentPackAggregateResult {
  results: ContentPackImportResultView[]
  aggregateStatus: ContentPackAggregateStatus
  nextTab?: ContentPackTab
}

const UNKNOWN_CONTENT_PACK_DIAGNOSTIC: ContentPackImportDiagnosticView = {
  severity: "error",
  code: "UNKNOWN_CONTENT_PACK",
  path: "",
  message: "无法识别内容包类型",
}

export async function importContentPackFiles(
  files: File[],
  dependencies: ImportContentPackDependencies,
): Promise<ImportContentPackAggregateResult> {
  const results: ContentPackImportResultView[] = []
  let nextTab: ContentPackTab | undefined

  for (const file of files) {
    const result = await importOneContentPackFile(file, dependencies)
    results.push(result)
    if (result.success && result.kind !== "unknown") {
      nextTab = result.kind === "equipment" ? "equipment" : "cards"
    }
  }

  const successCount = results.filter((result) => result.success).length
  const aggregateStatus: ContentPackAggregateStatus =
    results.length > 0 && successCount === results.length ? "success" : successCount === 0 ? "failed" : "partialFailure"

  return { results, aggregateStatus, nextTab }
}

async function importOneContentPackFile(
  file: File,
  dependencies: ImportContentPackDependencies,
): Promise<ContentPackImportResultView> {
  try {
    const lowerName = file.name.toLowerCase()

    if (lowerName.endsWith(".dhcb") || lowerName.endsWith(".zip")) {
      const result = await dependencies.importDhcb(file)
      return {
        fileName: file.name,
        kind: "card",
        success: true,
        summary: `导入 ${result.totalCards} 张卡牌`,
        diagnostics: cardMessagesToDiagnostics(result.validationErrors),
      }
    }

    if (lowerName.endsWith(".json")) {
      const text = await file.text()
      const parsed = JSON.parse(text)

      if (isEquipmentPackJson(parsed)) {
        const result = await dependencies.importEquipmentFile(file)
        const mapDiagnostic = dependencies.toEquipmentDiagnosticView ?? toDiagnosticView
        const importedCount = result.summary.weaponCount + result.summary.armorCount
        return {
          fileName: file.name,
          kind: "equipment",
          success: result.success,
          summary: result.success ? `导入 ${importedCount} 个装备模板` : "装备包导入失败",
          diagnostics: result.diagnostics.map(mapDiagnostic),
        }
      }

      if (!isCardPackJson(parsed)) {
        return unknownContentPackResult(file.name)
      }

      const result = await dependencies.importCardJson(parsed, file.name)
      return {
        fileName: file.name,
        kind: "card",
        success: result.success,
        summary: result.success ? `导入 ${result.imported} 张卡牌` : "卡牌包导入失败",
        diagnostics: cardMessagesToDiagnostics(result.errors),
      }
    }

    return unknownContentPackResult(file.name)
  } catch (error) {
    return {
      fileName: file.name,
      kind: "unknown",
      success: false,
      summary: "导入失败",
      diagnostics: [
        {
          severity: "error",
          code: "CONTENT_PACK_IMPORT_FAILED",
          path: "",
          message: error instanceof Error ? error.message : "文件导入失败",
        },
      ],
    }
  }
}

function isEquipmentPackJson(value: unknown): value is { format: "daggerheart.equipment-pack.v1" } {
  return isRecord(value) && value.format === "daggerheart.equipment-pack.v1"
}

export function isCardPackJson(value: unknown): value is ImportData {
  if (!isRecord(value)) return false

  const cardArrayFields = ["profession", "ancestry", "community", "subclass", "domain", "variant"]
  return cardArrayFields.some((field) => {
    const cards = value[field]
    return Array.isArray(cards) && cards.length > 0
  })
}

function unknownContentPackResult(fileName: string): ContentPackImportResultView {
  return {
    fileName,
    kind: "unknown",
    success: false,
    summary: "无法识别内容包类型",
    diagnostics: [{ ...UNKNOWN_CONTENT_PACK_DIAGNOSTIC }],
  }
}

function cardMessagesToDiagnostics(messages: string[] | undefined): ContentPackImportDiagnosticView[] {
  return (messages ?? []).map((message) => ({
    severity: "error",
    code: "CARD_IMPORT_ERROR",
    path: "",
    message,
  }))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
