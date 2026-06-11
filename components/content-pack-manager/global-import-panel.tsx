"use client"

import { useRef, useState } from "react"
import { AlertCircle, CheckCircle, FileText, Upload, XCircle } from "lucide-react"
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
  kind: "card" | "equipment" | "unknown"
  success: boolean
  summary: string
  diagnostics: ContentPackImportDiagnosticView[]
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
          支持 JSON 装备包、JSON 卡牌包、DHCB / ZIP 卡牌包。可以一次选择多个文件。
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          文件会逐个导入；如果某个文件失败，其他文件仍会继续处理。
        </p>
        <Button className="mt-4" disabled={importing} onClick={() => inputRef.current?.click()}>
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

            return (
              <article
                key={resultKey}
                className={`rounded border p-3 ${
                  result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-700" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-700" />
                  )}
                  <span className="font-medium">{result.fileName}</span>
                  <span className="text-sm text-muted-foreground">{result.summary}</span>
                </div>

                {result.diagnostics.length > 0 && (
                  <details
                    className="mt-2"
                    onToggle={(event) => {
                      const isOpen = event.currentTarget.open
                      setOpenDiagnostics((current) => ({ ...current, [resultKey]: isOpen }))
                    }}
                  >
                    <summary className="cursor-pointer text-sm text-muted-foreground">
                      查看详细信息（{result.diagnostics.length}）
                    </summary>
                    {diagnosticsOpen && (
                      <>
                        <ul className="mt-2 space-y-1 text-xs">
                          {visibleDiagnostics.map((diagnostic, index) => (
                            <li key={`${diagnostic.code}-${index}`} className="rounded bg-white/70 p-2">
                              <AlertCircle className="mr-1 inline h-3 w-3" />
                              <span className="font-mono">{diagnostic.code}</span>
                              {diagnostic.path && <span className="ml-2 font-mono">{diagnostic.path}</span>}
                              <span className="ml-2">{diagnostic.message}</span>
                              {diagnostic.value !== undefined && (
                                <pre className="mt-1 whitespace-pre-wrap font-mono text-[11px]">
                                  {JSON.stringify(diagnostic.value)}
                                </pre>
                              )}
                            </li>
                          ))}
                        </ul>
                        {result.diagnostics.length > 20 && !expandedDiagnostics[resultKey] && (
                          <Button
                            className="mt-2"
                            size="sm"
                            variant="outline"
                            onClick={() => setExpandedDiagnostics((current) => ({ ...current, [resultKey]: true }))}
                          >
                            显示全部
                          </Button>
                        )}
                      </>
                    )}
                  </details>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
