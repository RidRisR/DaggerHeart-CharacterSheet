"use client"

import { useRef, useState } from "react"
import { ChevronDown, Copy, FileText, RefreshCw, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface ContentPackImportDiagnosticView {
  severity: "error" | "warning"
  code: string
  path: string
  message: string
  value?: unknown
}

export interface ContentPackImportResultView {
  fileName: string
  kind: "card" | "equipment" | "archive" | "unknown"
  success: boolean
  summary: string
  diagnostics: ContentPackImportDiagnosticView[]
  archiveName?: string
  entryPath?: string
}

interface GlobalImportPanelProps {
  importing: boolean
  results: ContentPackImportResultView[]
  onImportFiles(files: File[]): void
}

export function GlobalImportPanel({ importing, results, onImportFiles }: GlobalImportPanelProps) {
  const [dragActive, setDragActive] = useState(false)
  const [openDiagnostics, setOpenDiagnostics] = useState<Record<string, boolean>>({})
  const [expandedDiagnostics, setExpandedDiagnostics] = useState<Record<string, boolean>>({})
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFiles(files: FileList | null) {
    if (importing) return
    if (!files || files.length === 0) return
    onImportFiles(Array.from(files))
  }

  return (
    <section className="w-full rounded-lg border bg-white p-4 shadow-sm">
      <div
        className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
        } ${importing ? "opacity-70" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault()
          if (importing) return
          setDragActive(true)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault()
          setDragActive(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setDragActive(false)
          if (importing) return
          handleFiles(event.dataTransfer.files)
        }}
      >
        <Upload className="mx-auto mb-3 h-8 w-8 text-gray-500" />
        <h2 className="text-lg font-semibold">导入内容包</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          支持 JSON 装备包、JSON 卡牌包、DHCB / ZIP 卡牌包，以及包含多个内容包的 ZIP 整合包。可以一次选择多个文件。
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          单个文件会逐个导入；ZIP 整合包会先执行全量预检，全部通过后再统一写入并自动归入「整合包」标签页管理。
        </p>
        <Button
          className="mt-4"
          disabled={importing}
          onClick={() => {
            if (inputRef.current) {
              inputRef.current.value = ""
              inputRef.current.click()
            }
          }}
        >
          <FileText className="mr-2 h-4 w-4" />
          选择文件
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".json,.dhcb,.zip"
          multiple
          disabled={importing}
          onChange={(event) => handleFiles(event.target.files)}
        />
      </div>

      {importing && <div className="mt-3 rounded bg-blue-50 p-3 text-sm text-blue-700">正在导入...</div>}

      {results.length > 0 && (
        <div className="mt-4 space-y-3">
          {results.map((result, index) => {
            const resultKey = `${result.fileName}:${index}`
            const diagnosticsOpen = openDiagnostics[resultKey] ?? false
            const visibleDiagnostics = expandedDiagnostics[resultKey]
              ? result.diagnostics
              : result.diagnostics.slice(0, 20)
            const issueOverview = buildIssueOverview(result.diagnostics, result.kind)
            const resultSummary = formatResultSummary(result)
            const title = result.success ? "导入成功" : "导入失败"

            return (
              <article
                key={resultKey}
                className={`rounded-lg border bg-white p-3 ${result.success ? "border-green-200" : "border-red-200"}`}
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className={`text-base font-semibold ${result.success ? "text-green-800" : "text-red-800"}`}>
                      {title}
                    </h3>
                    <div className="mt-1 flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 break-words">{result.fileName}</span>
                    </div>
                  </div>
                  {result.success && <p className="text-sm text-green-800">{result.summary}</p>}
                </div>

                {result.diagnostics.length > 0 && (
                  <div className="mt-3 space-y-3">
                    <p className="text-sm text-muted-foreground">{resultSummary}</p>

                    {issueOverview.length > 0 && (
                      <section>
                        <h4 className="text-sm font-medium">问题概览</h4>
                        <div className="mt-2 overflow-x-auto rounded-md border">
                          <table className="w-full min-w-[520px] text-sm">
                            <thead className="bg-muted/40 text-muted-foreground">
                              <tr className="border-b">
                                <th className="px-3 py-2 text-left font-medium">类型</th>
                                <th className="w-20 px-3 py-2 text-left font-medium">数量</th>
                                <th className="px-3 py-2 text-left font-medium">摘要</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {issueOverview.map((row) => (
                                <tr key={row.type}>
                                  <td className="px-3 py-2 align-top">{row.type}</td>
                                  <td className="px-3 py-2 align-top tabular-nums">{row.count}</td>
                                  <td className="px-3 py-2 align-top text-muted-foreground">{row.summary}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    )}

                    <details
                      className="border-t pt-3"
                      onToggle={(event) => {
                        const isOpen = event.currentTarget.open
                        setOpenDiagnostics((current) => ({
                          ...current,
                          [resultKey]: isOpen,
                        }))
                      }}
                    >
                      <summary className="cursor-pointer text-sm text-muted-foreground">
                        查看问题明细（{result.diagnostics.length}）
                      </summary>
                      {diagnosticsOpen && (
                        <div className="mt-3 space-y-3">
                          <DiagnosticDetailsTable diagnostics={visibleDiagnostics} kind={result.kind} />
                          {result.diagnostics.length > 20 && !expandedDiagnostics[resultKey] && (
                            <Button
                              className="mt-2"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setExpandedDiagnostics((current) => ({
                                  ...current,
                                  [resultKey]: true,
                                }))
                              }
                            >
                              <ChevronDown className="mr-2 h-4 w-4" />
                              还有 {result.diagnostics.length - visibleDiagnostics.length} 个问题，显示全部
                            </Button>
                          )}
                          {!result.success && (
                            <div className="flex flex-wrap gap-2 border-t pt-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (inputRef.current) {
                                    inputRef.current.value = ""
                                    inputRef.current.click()
                                  }
                                }}
                              >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                重新选择文件
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => copyDiagnosticsSummary(result)}>
                                <Copy className="mr-2 h-4 w-4" />
                                复制问题摘要
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </details>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

function DiagnosticDetailsTable({
  diagnostics,
  kind,
}: {
  diagnostics: ContentPackImportDiagnosticView[]
  kind: ContentPackImportResultView["kind"]
}) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr className="border-b">
            <th className="w-24 px-3 py-2 text-left font-medium">影响</th>
            <th className="px-3 py-2 text-left font-medium">问题</th>
            <th className="px-3 py-2 text-left font-medium">位置</th>
            <th className="w-36 px-3 py-2 text-left font-medium">相关信息</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {diagnostics.map((diagnostic, index) => {
            const relatedInfo = diagnosticRelatedInfo(diagnostic, kind)
            return (
              <tr key={`${diagnostic.code}-${diagnostic.path}-${index}`}>
                <td className="px-3 py-2 align-top">
                  {diagnostic.severity === "error" ? "阻碍导入" : "提醒"}
                </td>
                <td className="px-3 py-2 align-top">{diagnostic.message}</td>
                <td className="px-3 py-2 align-top text-muted-foreground">
                  {diagnostic.path ? diagnostic.path : "整个文件"}
                </td>
                <td className="px-3 py-2 align-top text-muted-foreground">{relatedInfo}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

interface IssueOverviewRow {
  type: string
  count: number
  summary: string
}

function formatResultSummary(result: ContentPackImportResultView) {
  const errorCount = result.diagnostics.filter((diagnostic) => diagnostic.severity === "error").length
  const warningCount = result.diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length

  if (result.success) return result.summary

  const warningText = warningCount > 0 ? `，${warningCount} 个提醒` : ""
  return `发现 ${errorCount} 个阻碍导入的问题${warningText}。请处理后重新导入。`
}

function buildIssueOverview(
  diagnostics: ContentPackImportDiagnosticView[],
  kind: ContentPackImportResultView["kind"],
): IssueOverviewRow[] {
  const blockingDiagnostics = diagnostics.filter((diagnostic) => diagnostic.severity === "error")
  const labels = labelsForImportKind(kind)
  const rows: IssueOverviewRow[] = []

  const conflictDiagnostics = blockingDiagnostics.filter((diagnostic) => isConflictDiagnosticCode(diagnostic.code))
  if (conflictDiagnostics.length > 0) {
    rows.push({
      type: conflictOverviewType(conflictDiagnostics, kind),
      count: conflictDiagnostics.length,
      summary: summarizeConflictDiagnostics(conflictDiagnostics, kind),
    })
  }

  const contentDiagnostics = blockingDiagnostics.filter((diagnostic) => contentIssueCodes.has(diagnostic.code))
  if (contentDiagnostics.length > 0) {
    rows.push({
      type: `${labels.itemName}内容不完整`,
      count: contentDiagnostics.length,
      summary: summarizeByCode(contentDiagnostics, kind),
    })
  }

  const fileDiagnostics = blockingDiagnostics.filter((diagnostic) => fileIssueCodes.has(diagnostic.code))
  if (fileDiagnostics.length > 0) {
    rows.push({
      type: fileDiagnostics.some((diagnostic) => diagnostic.code === "UNKNOWN_CONTENT_PACK")
        ? "无法识别内容包类型"
        : "文件格式或文件内容无法识别",
      count: fileDiagnostics.length,
      summary: summarizeByCode(fileDiagnostics, kind),
    })
  }

  const imageDiagnostics = blockingDiagnostics.filter((diagnostic) => imageIssueCodes.has(diagnostic.code))
  if (imageDiagnostics.length > 0) {
    rows.push({
      type: "图片资源问题",
      count: imageDiagnostics.length,
      summary: summarizeByCode(imageDiagnostics, kind),
    })
  }

  const automationDiagnostics = blockingDiagnostics.filter((diagnostic) => automationIssueCodes.has(diagnostic.code))
  if (automationDiagnostics.length > 0) {
    rows.push({
      type: "自动化定义问题",
      count: automationDiagnostics.length,
      summary: summarizeByCode(automationDiagnostics, kind),
    })
  }

  const limitDiagnostics = blockingDiagnostics.filter((diagnostic) => diagnostic.code === "PACK_LIMIT_EXCEEDED")
  if (limitDiagnostics.length > 0) {
    rows.push({
      type: `本地${labels.packName}数量已达上限`,
      count: limitDiagnostics.length,
      summary: "已达到可安装数量上限",
    })
  }

  const groupedCodes = new Set([
    "TEMPLATE_ID_CONFLICT",
    "ID_CONFLICT",
    "PACK_LIMIT_EXCEEDED",
    ...contentIssueCodes,
    ...fileIssueCodes,
    ...imageIssueCodes,
    ...automationIssueCodes,
  ])
  const otherBlockingDiagnostics = blockingDiagnostics.filter((diagnostic) => !groupedCodes.has(diagnostic.code))
  if (otherBlockingDiagnostics.length > 0) {
    rows.push({
      type: "其他阻碍导入的问题",
      count: otherBlockingDiagnostics.length,
      summary: summarizeByCode(otherBlockingDiagnostics, kind),
    })
  }

  return rows
}

const contentIssueCodes = new Set([
  "MISSING_FIELD",
  "INVALID_TYPE",
  "INVALID_ENUM",
  "INVALID_VALUE",
  "DUPLICATE_ID",
  "UNKNOWN_REFERENCE",
  "UNKNOWN_FIELD",
  "INVALID_CONTRIBUTION_TARGET",
  "EMPTY_EQUIPMENT",
  "INVALID_THRESHOLD_ORDER",
  "TEMPLATE_LIMIT_EXCEEDED",
  "FIELD_TOO_LONG",
])

const fileIssueCodes = new Set([
  "UNKNOWN_CONTENT_PACK",
  "CONTENT_PACK_IMPORT_FAILED",
  "INVALID_JSON",
  "INVALID_DHCB",
  "INVALID_ARCHIVE",
  "EMPTY_ARCHIVE",
  "UNSAFE_ARCHIVE_PATH",
  "ARCHIVE_LIMIT_EXCEEDED",
  "NESTED_ARCHIVE_UNSUPPORTED",
  "ARCHIVE_PREFLIGHT_BLOCKED",
  "ARCHIVE_COMMIT_FAILED",
  "ARCHIVE_ROLLBACK_INCOMPLETE",
  "ARCHIVE_COMMIT_ABORTED",
  "MISSING_CARDS_JSON",
  "SOURCE_READ_FAILED",
  "UNSUPPORTED_FORMAT",
  "INVALID_FORMAT",
  "FILE_TOO_LARGE",
])

const imageIssueCodes = new Set(["ORPHAN_IMAGE"])

const automationIssueCodes = new Set([
  "UNSUPPORTED_AUTOMATION_FORMAT",
  "INVALID_AUTOMATION_DEFINITION",
  "INVALID_AUTOMATION_IR",
  "AUTOMATION_LIMIT_EXCEEDED",
])

const overviewCodeLabels: Record<string, string> = {
  UNKNOWN_CONTENT_PACK: "无法识别内容包类型",
  CONTENT_PACK_IMPORT_FAILED: "文件导入失败",
  INVALID_JSON: "JSON 格式错误",
  INVALID_DHCB: "DHCB / ZIP 格式错误",
  INVALID_ARCHIVE: "ZIP 压缩包无法解析",
  EMPTY_ARCHIVE: "压缩包中无内容包",
  UNSAFE_ARCHIVE_PATH: "压缩包路径不安全",
  ARCHIVE_LIMIT_EXCEEDED: "压缩包超过导入限制",
  NESTED_ARCHIVE_UNSUPPORTED: "不支持嵌套整合包",
  ARCHIVE_PREFLIGHT_BLOCKED: "整合包预检未通过",
  ARCHIVE_COMMIT_FAILED: "整合包写入失败",
  ARCHIVE_ROLLBACK_INCOMPLETE: "整合包回滚未完全完成",
  ARCHIVE_COMMIT_ABORTED: "子包提交异常",
  MISSING_CARDS_JSON: "缺少 cards.json",
  SOURCE_READ_FAILED: "文件读取失败",
  UNSUPPORTED_FORMAT: "不支持的格式",
  INVALID_FORMAT: "格式声明不正确",
  MISSING_FIELD: "缺少字段",
  INVALID_TYPE: "字段类型错误",
  INVALID_ENUM: "字段选项错误",
  INVALID_VALUE: "字段值错误",
  UNKNOWN_REFERENCE: "引用不存在",
  UNKNOWN_FIELD: "不支持的字段",
  INVALID_CONTRIBUTION_TARGET: "数值修正目标不支持",
  EMPTY_EQUIPMENT: "装备包没有装备",
  INVALID_THRESHOLD_ORDER: "护甲阈值顺序错误",
  TEMPLATE_LIMIT_EXCEEDED: "装备数量超过限制",
  FIELD_TOO_LONG: "字段内容过长",
  FILE_TOO_LARGE: "文件过大",
  ORPHAN_IMAGE: "图片没有对应卡牌",
  UNSUPPORTED_AUTOMATION_FORMAT: "自动化格式不受支持",
  INVALID_AUTOMATION_DEFINITION: "自动化定义不正确",
  INVALID_AUTOMATION_IR: "自动化定义不正确",
  AUTOMATION_LIMIT_EXCEEDED: "自动化数量超过限制",
  LEGACY_FORMAT_ASSUMED: "未声明格式，已按旧版卡牌包格式读取",
}

function summarizeByCode(diagnostics: ContentPackImportDiagnosticView[], kind: ContentPackImportResultView["kind"]) {
  return summarizeByValue(diagnostics, (diagnostic) => overviewCodeLabel(diagnostic, kind))
}

function summarizeByValue(
  diagnostics: ContentPackImportDiagnosticView[],
  labelForDiagnostic: (diagnostic: ContentPackImportDiagnosticView) => string,
) {
  const counts = new Map<string, number>()

  for (const diagnostic of diagnostics) {
    const label = labelForDiagnostic(diagnostic)
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([label, count]) => `${label}：${count}`)
    .join("，")
}

function summarizeConflictDiagnostics(
  diagnostics: ContentPackImportDiagnosticView[],
  kind: ContentPackImportResultView["kind"],
) {
  const counts = new Map<string, number>()
  const labels = labelsForImportKind(kind)

  for (const diagnostic of diagnostics) {
    const label = conflictOverviewLabel(diagnostic, kind)
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([label, count]) => `${label}：${count} ${labels.unit}${labels.itemName} ID 已存在`)
    .join("，")
}

function conflictOverviewLabel(diagnostic: ContentPackImportDiagnosticView, kind: ContentPackImportResultView["kind"]) {
  const labels = labelsForImportKind(kind)
  if (!isRecord(diagnostic.value)) return `与已有${labels.itemName}内容冲突`
  if (diagnostic.value.conflictSource === "builtin") return `与${labels.builtinItemName}冲突`

  const packLabel = installedPackDisplayName(diagnostic.value, kind)
  return `与已安装${labels.packName}“${packLabel}”冲突`
}

function conflictOverviewType(
  diagnostics: ContentPackImportDiagnosticView[],
  kind: ContentPackImportResultView["kind"],
) {
  const labels = labelsForImportKind(kind)
  const hasBuiltinConflict = diagnostics.some((diagnostic) => isBuiltinConflict(diagnostic))
  const hasInstalledPackConflict = diagnostics.some((diagnostic) => !isBuiltinConflict(diagnostic))

  if (hasBuiltinConflict && !hasInstalledPackConflict) return `与${labels.builtinItemName}冲突`
  if (!hasBuiltinConflict && hasInstalledPackConflict) return `与已安装${labels.packName}冲突`
  return `${labels.itemName} ID 冲突`
}

function conflictSourceLabel(diagnostic: ContentPackImportDiagnosticView, kind: ContentPackImportResultView["kind"]) {
  const labels = labelsForImportKind(kind)
  if (!isRecord(diagnostic.value)) return `已有${labels.itemName}内容`
  if (diagnostic.value.conflictSource === "builtin") return labels.builtinItemName

  return installedPackDisplayName(diagnostic.value, kind)
}

function installedPackDisplayName(value: Record<string, unknown>, kind: ContentPackImportResultView["kind"]) {
  const labels = labelsForImportKind(kind)
  const packName = stringValue(value.packName)
  const packAuthor = stringValue(value.packAuthor)
  if (packName) return packAuthor ? `${packName}（作者：${packAuthor}）` : packName

  const packLabel = stringValue(value.packLabel)
  if (packLabel) return packLabel

  const packId = stringValue(value.packId)
  if (packId) return `ID 为 ${packId} 的已安装${labels.packName}`

  return `一个已安装${labels.packName}`
}

function diagnosticRelatedInfo(diagnostic: ContentPackImportDiagnosticView, kind: ContentPackImportResultView["kind"]) {
  const id = diagnosticId(diagnostic.value)
  const labels = labelsForImportKind(kind)

  if (isConflictDiagnosticCode(diagnostic.code)) {
    const relatedLabel = isBuiltinConflict(diagnostic) ? "冲突来源" : `冲突${labels.detailPackName}`
    const conflictText = `${relatedLabel}：${conflictSourceLabel(diagnostic, kind)}`
    return id ? `${conflictText}；ID：${id}` : conflictText
  }

  return id ? `ID：${id}` : "-"
}

function diagnosticId(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined
  const id = (value as { id?: unknown }).id
  return typeof id === "string" && id.length > 0 ? id : undefined
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isConflictDiagnosticCode(code: string) {
  return code === "TEMPLATE_ID_CONFLICT" || code === "ID_CONFLICT"
}

function isBuiltinConflict(diagnostic: ContentPackImportDiagnosticView) {
  return isRecord(diagnostic.value) && diagnostic.value.conflictSource === "builtin"
}

function overviewCodeLabel(
  diagnostic: ContentPackImportDiagnosticView,
  kind: ContentPackImportResultView["kind"],
) {
  if (diagnostic.code === "DUPLICATE_ID") return `${labelsForImportKind(kind).itemName} ID 重复`
  return overviewCodeLabels[diagnostic.code] ?? diagnostic.message
}

function labelsForImportKind(kind: ContentPackImportResultView["kind"]) {
  if (kind === "equipment") {
    return {
      packName: "装备包",
      detailPackName: "装备包",
      itemName: "装备",
      builtinItemName: "内置装备",
      unit: "件",
    }
  }

  if (kind === "archive") {
    return {
      packName: "整合包",
      detailPackName: "整合包",
      itemName: "内容包",
      builtinItemName: "内置内容",
      unit: "个",
    }
  }

  return {
    packName: "卡牌包",
    detailPackName: "卡包",
    itemName: "卡牌",
    builtinItemName: "内置卡牌",
    unit: "张",
  }
}

function copyDiagnosticsSummary(result: ContentPackImportResultView) {
  const lines = [
    `${result.fileName} ${result.summary}`,
    ...result.diagnostics.map((diagnostic, index) => {
      const path = diagnostic.path ? `（位置：${diagnostic.path}）` : ""
      const id = diagnosticId(diagnostic.value)
      const idText = id ? ` ID：${id}` : ""
      return `${index + 1}. ${diagnostic.severity === "error" ? "阻碍导入" : "不阻碍导入"}：${diagnostic.message}${path}${idText}`
    }),
  ]

  void navigator.clipboard?.writeText(lines.join("\n"))
}
