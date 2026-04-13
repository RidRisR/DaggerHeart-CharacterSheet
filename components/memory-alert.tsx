"use client"

import { useState, useEffect, useCallback } from 'react'
import { memoryMonitor } from '@/lib/memory-monitor'

function downloadJSON(data: object, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function MemoryAlert() {
  const [alertLevel, setAlertLevel] = useState<'warning' | 'critical' | null>(null)
  const [heapMB, setHeapMB] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const unsubscribe = memoryMonitor.onAlert((level, heap) => {
      setAlertLevel(level)
      setHeapMB(heap)
      setDismissed(false)
    })
    return unsubscribe
  }, [])

  const handleExport = useCallback(() => {
    const report = memoryMonitor.exportReport()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    downloadJSON(report, `memory-diagnostic-${timestamp}.json`)
  }, [])

  if (!alertLevel || dismissed) return null

  const isWarning = alertLevel === 'warning'

  return (
    <div
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] print:hidden
        px-4 py-2.5 rounded-lg shadow-lg border text-sm max-w-lg w-[90vw]
        flex items-center justify-between gap-3
        ${isWarning
          ? 'bg-yellow-50 border-yellow-300 text-yellow-800'
          : 'bg-red-50 border-red-300 text-red-800'
        }`}
    >
      <div className="flex-1 min-w-0">
        {isWarning
          ? '检测到内存偏高，如遇卡顿可导出诊断报告。'
          : `内存异常（${heapMB}MB），建议导出诊断报告后刷新页面。`
        }
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleExport}
          className={`px-3 py-1 rounded text-xs font-medium border
            ${isWarning
              ? 'bg-yellow-100 border-yellow-400 hover:bg-yellow-200'
              : 'bg-red-100 border-red-400 hover:bg-red-200'
            }`}
        >
          导出报告
        </button>
        {!isWarning && (
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700"
          >
            刷新
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          aria-label="关闭提示"
        >
          ×
        </button>
      </div>
    </div>
  )
}
