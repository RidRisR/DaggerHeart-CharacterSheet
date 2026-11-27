import type { ImportData, ImportResult } from "@/card/card-types"
import type { CardPackApplicationDiagnostic, CardPackApplicationImportResult } from "@/card/packs/application-service"
import type { DhcbImportResult } from "@/card/utils/dhcb-importer"
import type { ArchiveEntryImportResult, ArchiveImportOutcome } from "@/content-packs/archive/types"
import { toDiagnosticView, type EquipmentUiStoreDiagnostic } from "@/equipment/ui/types"
import type { ContentPackImportDiagnosticView, ContentPackImportResultView } from "./global-import-panel"

export type ContentPackAggregateStatus = "success" | "partialFailure" | "failed"
export type ContentPackTab = "cards" | "equipment" | "groups"

interface EquipmentImportResultLike {
  success: boolean
  summary: {
    weaponCount: number
    armorCount: number
  }
  diagnostics: EquipmentUiStoreDiagnostic[]
}

type CardImportResultLike = ImportResult | CardPackApplicationImportResult
type DhcbImportResultLike = DhcbImportResult | CardPackApplicationImportResult

export interface ImportContentPackDependencies {
  importEquipmentFile(file: File): Promise<EquipmentImportResultLike>
  importCardJson(importData: ImportData, fileName: string): Promise<CardImportResultLike>
  importDhcb(file: File): Promise<DhcbImportResultLike>
  importZipArchive?(file: File): Promise<ArchiveImportOutcome>
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
    const fileResults = await importOneContentPackFile(file, dependencies)
    results.push(...fileResults)
    for (const result of fileResults) {
      if (result.success && result.kind !== "unknown") {
        if (result.kind === "archive") {
          nextTab = "groups"
        } else if (nextTab !== "groups") {
          nextTab = result.kind === "equipment" ? "equipment" : "cards"
        }
      }
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
): Promise<ContentPackImportResultView[]> {
  try {
    const lowerName = file.name.toLowerCase()

    if (lowerName.endsWith(".zip") && dependencies.importZipArchive) {
      const archiveOutcome = await dependencies.importZipArchive(file)
      if (archiveOutcome.kind === "archive") {
        return archiveOutcomeToResultViews(archiveOutcome, dependencies)
      }
    }

    if (lowerName.endsWith(".dhcb") || lowerName.endsWith(".zip")) {
      const result = await dependencies.importDhcb(file)
      if (isStructuredCardImportResult(result)) {
        return [cardApplicationResultToView(file.name, undefined, result)]
      }

      return [
        {
          fileName: file.name,
          kind: "card",
          success: true,
          summary: `导入 ${result.totalCards} 张卡牌`,
          diagnostics: cardMessagesToDiagnostics(result.validationErrors),
        },
      ]
    }

    if (lowerName.endsWith(".json")) {
      const text = await file.text()
      const parsed = JSON.parse(text)

      if (isEquipmentPackJson(parsed)) {
        const result = await dependencies.importEquipmentFile(file)
        const mapDiagnostic = dependencies.toEquipmentDiagnosticView ?? toDiagnosticView
        const importedCount = result.summary.weaponCount + result.summary.armorCount
        return [
          {
            fileName: file.name,
            kind: "equipment",
            success: result.success,
            summary: result.success ? `导入 ${importedCount} 个装备模板` : equipmentFailureSummary(result.diagnostics),
            diagnostics: result.diagnostics.map(mapDiagnostic),
          },
        ]
      }

      if (!isCardPackJson(parsed)) {
        return [unknownContentPackResult(file.name)]
      }

      const result = await dependencies.importCardJson(parsed, file.name)
      if (isStructuredCardImportResult(result)) {
        return [cardApplicationResultToView(file.name, parsed, result)]
      }

      const diagnostics = cardMessagesToDiagnostics(result.errors)
      return [
        {
          fileName: file.name,
          kind: "card",
          success: result.success,
          summary: result.success ? `导入 ${result.imported} 张卡牌` : cardFailureSummary(diagnostics),
          diagnostics,
        },
      ]
    }

    return [unknownContentPackResult(file.name)]
  } catch (error) {
    return [
      {
        fileName: file.name,
        kind: "unknown",
        success: false,
        summary: "导入失败",
        diagnostics: [
          {
            severity: "error",
            code: "CONTENT_PACK_IMPORT_FAILED",
            path: "",
            message:
              error instanceof SyntaxError ? "文件不是有效的 JSON。请检查 JSON 语法" : "文件导入失败，请检查文件内容",
          },
        ],
      },
    ]
  }
}

function archiveEntryToResultView(
  archiveName: string,
  entry: ArchiveEntryImportResult,
  dependencies: ImportContentPackDependencies,
): ContentPackImportResultView {
  const displayName = `${archiveName} / ${entry.archivePath}`

  if (entry.kind === "card") {
    const diagnostics = cardDiagnosticsToViews(entry.diagnostics, entry.parsedInput as ImportData | undefined)
    return {
      fileName: displayName,
      archiveName,
      entryPath: entry.archivePath,
      kind: "card",
      success: entry.success,
      summary: entry.success ? `导入 ${entry.cardCount} 张卡牌` : cardFailureSummary(diagnostics),
      diagnostics,
    }
  }

  if (entry.kind === "equipment") {
    const mapDiagnostic = dependencies.toEquipmentDiagnosticView ?? toDiagnosticView
    const importedCount = entry.weaponCount + entry.armorCount
    return {
      fileName: displayName,
      archiveName,
      entryPath: entry.archivePath,
      kind: "equipment",
      success: entry.success,
      summary: entry.success ? `导入 ${importedCount} 个装备模板` : equipmentFailureSummary(entry.diagnostics),
      diagnostics: entry.diagnostics.map(mapDiagnostic),
    }
  }

  return {
    fileName: displayName,
    archiveName,
    entryPath: entry.archivePath,
    kind: "unknown",
    success: false,
    summary: entry.diagnostics[0]?.message ?? "无法识别内容包类型",
    diagnostics: entry.diagnostics,
  }
}

function archiveOutcomeToResultViews(
  outcome: Extract<ArchiveImportOutcome, { kind: "archive" }>,
  dependencies: ImportContentPackDependencies,
): ContentPackImportResultView[] {
  if (outcome.success) {
    const cardPackCount = outcome.entryResults.filter((entry) => entry.kind === "card" && entry.success).length
    const equipmentPackCount = outcome.entryResults.filter(
      (entry) => entry.kind === "equipment" && entry.success,
    ).length
    const groupLabel = outcome.group ? `「${outcome.group.name}」` : ""
    const ignoredSuffix =
      outcome.ignoredFiles.length > 0 ? `（已忽略 ${outcome.ignoredFiles.length} 个非内容包文件）` : ""
    const countsParts: string[] = []
    if (cardPackCount > 0) countsParts.push(`${cardPackCount} 个卡牌包`)
    if (equipmentPackCount > 0) countsParts.push(`${equipmentPackCount} 个装备包`)

    const summaryCard: ContentPackImportResultView = {
      fileName: outcome.archiveName,
      archiveName: outcome.archiveName,
      kind: "archive",
      success: true,
      summary: `已导入整合包${groupLabel}：共包含 ${countsParts.join("、")}${ignoredSuffix}`,
      diagnostics: [],
    }

    const entryViews = outcome.entryResults.map((entry) =>
      archiveEntryToResultView(outcome.archiveName, entry, dependencies),
    )

    return [summaryCard, ...entryViews]
  }

  if (outcome.archiveError && outcome.entryResults.length === 0) {
    const diagnostics: ContentPackImportDiagnosticView[] = [
      {
        severity: "error",
        code: outcome.archiveError.code,
        path: "",
        message: outcome.archiveError.message,
        value: outcome.archiveError.value,
      },
    ]

    if (outcome.rollbackErrors && outcome.rollbackErrors.length > 0) {
      for (const rollbackMessage of outcome.rollbackErrors) {
        diagnostics.push({
          severity: "error",
          code: "ARCHIVE_ROLLBACK_INCOMPLETE",
          path: "",
          message: rollbackMessage,
        })
      }
    }

    return [
      {
        fileName: outcome.archiveName,
        archiveName: outcome.archiveName,
        kind: "archive",
        success: false,
        summary: outcome.archiveError.message,
        diagnostics,
      },
    ]
  }

  const failedEntries = outcome.entryResults.filter((entry) => !entry.success)
  const failedEntryViews = failedEntries.map((entry) =>
    archiveEntryToResultView(outcome.archiveName, entry, dependencies),
  )

  const archiveDiagnostics: ContentPackImportDiagnosticView[] = outcome.archiveError
    ? [
        {
          severity: "error",
          code: outcome.archiveError.code,
          path: "",
          message: outcome.archiveError.message,
          value: outcome.archiveError.value,
        },
      ]
    : [
        {
          severity: "error",
          code: "ARCHIVE_PREFLIGHT_BLOCKED",
          path: "",
          message: `预检发现 ${failedEntries.length} 个子包存在问题，已取消整个整合包导入，请修复后重试`,
        },
      ]

  if (outcome.rollbackErrors && outcome.rollbackErrors.length > 0) {
    for (const rollbackMessage of outcome.rollbackErrors) {
      archiveDiagnostics.push({
        severity: "error",
        code: "ARCHIVE_ROLLBACK_INCOMPLETE",
        path: "",
        message: rollbackMessage,
      })
    }
  }

  const archiveSummaryCard: ContentPackImportResultView = {
    fileName: outcome.archiveName,
    archiveName: outcome.archiveName,
    kind: "archive",
    success: false,
    summary: outcome.archiveError
      ? outcome.archiveError.message
      : `整合包未导入：预检发现 ${failedEntries.length} 个子包存在问题`,
    diagnostics: archiveDiagnostics,
  }

  return [archiveSummaryCard, ...failedEntryViews]
}

function isEquipmentPackJson(value: unknown): value is { format: "daggerheart.equipment-pack.v1" } {
  return isRecord(value) && value.format === "daggerheart.equipment-pack.v1"
}

export function isCardPackJson(value: unknown): value is ImportData {
  if (!isRecord(value)) return false
  if (value.format === "daggerheart.card-pack.v1") return true

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

function isStructuredCardImportResult(
  value: CardImportResultLike | DhcbImportResultLike,
): value is CardPackApplicationImportResult {
  return isRecord(value) && Array.isArray(value.diagnostics) && isRecord(value.summary) && "cardCount" in value.summary
}

function cardApplicationResultToView(
  fileName: string,
  input: ImportData | undefined,
  result: CardPackApplicationImportResult,
): ContentPackImportResultView {
  const diagnostics = cardDiagnosticsToViews(result.diagnostics, input)

  return {
    fileName,
    kind: "card",
    success: result.success,
    summary: result.success ? `导入 ${result.summary.cardCount} 张卡牌` : cardFailureSummary(diagnostics),
    diagnostics,
  }
}

function cardFailureSummary(diagnostics: ContentPackImportDiagnosticView[]) {
  const errorCount = diagnostics.filter((diagnostic) => diagnostic.severity === "error").length
  const warningCount = diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length

  if (warningCount > 0) {
    return `卡牌包导入失败：发现 ${errorCount} 个阻碍导入的问题，${warningCount} 个提醒`
  }

  return `卡牌包导入失败：发现 ${errorCount} 个阻碍导入的问题`
}

function cardDiagnosticsToViews(
  diagnostics: CardPackApplicationDiagnostic[],
  input: ImportData | undefined,
): ContentPackImportDiagnosticView[] {
  return diagnostics
    .map((diagnostic, index) => {
      const pathInfo = parseCardDiagnosticPath(diagnostic.path)
      return {
        view: {
          severity: diagnostic.severity,
          code: diagnostic.code,
          path: formatCardDiagnosticPath(pathInfo, diagnostic.path),
          message: formatCardDiagnosticMessage(diagnostic, input, pathInfo),
          value: diagnostic.value,
        },
        index,
        cardOrder: pathInfo?.index ?? Number.MAX_SAFE_INTEGER,
      }
    })
    .sort((left, right) => {
      const severityOrder = severityRank(left.view.severity) - severityRank(right.view.severity)
      if (severityOrder !== 0) return severityOrder
      if (left.cardOrder !== right.cardOrder) return left.cardOrder - right.cardOrder
      return left.index - right.index
    })
    .map((entry) => entry.view)
}

function severityRank(severity: "error" | "warning") {
  return severity === "error" ? 0 : 1
}

const cardGroupLabels: Record<string, string> = {
  classes: "职业",
  profession: "职业",
  ancestries: "种族",
  ancestry: "种族",
  communities: "社群",
  community: "社群",
  subclasses: "子职业",
  subclass: "子职业",
  domains: "领域",
  domain: "领域",
  variants: "杂项",
  variant: "杂项",
}

const cardGroupInputKeys: Record<string, string[]> = {
  classes: ["classes", "profession"],
  ancestries: ["ancestries", "ancestry"],
  communities: ["communities", "community"],
  subclasses: ["subclasses", "subclass"],
  domains: ["domains", "domain"],
  variants: ["variants", "variant"],
}

const cardFieldLabels: Record<string, string> = {
  id: "id",
  name: "名称",
  description: "描述",
  summary: "摘要",
  level: "等级",
  type: "类型",
  class: "职业",
  domain: "领域",
  domain1: "领域 1",
  domain2: "领域 2",
  effect: "效果",
}

interface CardDiagnosticPathInfo {
  group: string
  index: number
  field?: string
}

function parseCardDiagnosticPath(path: string): CardDiagnosticPathInfo | undefined {
  const segments = path.split("/").filter(Boolean)
  if (segments.length < 2) return undefined

  const group = segments[0]
  const index = Number(segments[1])
  if (!Number.isInteger(index) || index < 0 || !(group in cardGroupLabels)) return undefined

  return { group, index, field: segments[2] }
}

function formatCardDiagnosticPath(pathInfo: CardDiagnosticPathInfo | undefined, fallback: string) {
  if (!pathInfo) return fallback

  const group = cardGroupLabels[pathInfo.group]
  const field = pathInfo.field ? ` / ${cardFieldLabels[pathInfo.field] ?? pathInfo.field}` : ""
  return `${group} / 第 ${pathInfo.index + 1} 张${field}`
}

function formatCardDiagnosticMessage(
  diagnostic: CardPackApplicationDiagnostic,
  input: ImportData | undefined,
  pathInfo: CardDiagnosticPathInfo | undefined,
) {
  const reason = localizedCardDiagnosticReason(diagnostic)
  const cardName = pathInfo ? findCardName(input, pathInfo) : undefined
  return cardName ? `${cardName}：${reason}` : reason
}

function localizedCardDiagnosticReason(diagnostic: CardPackApplicationDiagnostic) {
  switch (diagnostic.code) {
    case "LEGACY_FORMAT_ASSUMED":
      return "未声明文件格式，已按旧版卡牌包格式读取"
    case "TEMPLATE_ID_CONFLICT":
      return "卡牌 ID 已存在"
    case "PACK_LIMIT_EXCEEDED":
      return "本地卡牌包数量已达上限"
    case "MISSING_FIELD":
      return "缺少必填字段"
    case "INVALID_TYPE":
      return "字段类型不正确"
    case "INVALID_VALUE":
      return "字段值不正确"
    case "DUPLICATE_ID":
      return "卡牌 ID 重复"
    case "UNKNOWN_REFERENCE":
      return "引用了不存在的定义"
    case "INVALID_JSON":
      return "文件不是有效的 JSON。请检查 JSON 语法"
    case "INVALID_DHCB":
      return "文件不是有效的 DHCB / ZIP 卡牌包"
    case "MISSING_CARDS_JSON":
      return "DHCB / ZIP 中缺少 cards.json"
    case "UNSUPPORTED_FORMAT":
    case "INVALID_FORMAT":
      return "不支持这个卡牌包格式"
    case "ORPHAN_IMAGE":
      return "图片没有对应的卡牌"
    case "UNKNOWN_FIELD":
      return "包含不支持的字段"
    case "SOURCE_READ_FAILED":
      return "无法读取文件内容"
    case "UNSUPPORTED_AUTOMATION_FORMAT":
      return "自动化定义格式不受支持"
    case "INVALID_AUTOMATION_DEFINITION":
    case "INVALID_AUTOMATION_IR":
      return "自动化定义不正确"
    case "AUTOMATION_LIMIT_EXCEEDED":
      return "自动化定义数量超过限制"
    default:
      return hasChineseText(diagnostic.message) ? diagnostic.message : "文件内容不符合卡牌包要求"
  }
}

function findCardName(input: ImportData | undefined, pathInfo: CardDiagnosticPathInfo) {
  if (!input || !isRecord(input)) return undefined

  const keys = cardGroupInputKeys[pathInfo.group] ?? [pathInfo.group]
  for (const key of keys) {
    const cards = input[key]
    if (!Array.isArray(cards)) continue

    const card = cards[pathInfo.index]
    if (!isRecord(card)) continue

    const name = card.name
    if (typeof name === "string" && name.trim().length > 0) return name.trim()
  }

  return undefined
}

function hasChineseText(value: string) {
  return /[\u4e00-\u9fff]/.test(value)
}

function equipmentFailureSummary(diagnostics: EquipmentUiStoreDiagnostic[]) {
  const errorCount = diagnostics.filter((diagnostic) => diagnostic.severity === "error").length
  const warningCount = diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length

  if (warningCount > 0) {
    return `装备包导入失败：发现 ${errorCount} 个错误和 ${warningCount} 个警告`
  }

  return `装备包导入失败：发现 ${errorCount} 个错误`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
