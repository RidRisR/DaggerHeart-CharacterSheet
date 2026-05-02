"use client"

import { getReferenceSummary } from "@/lib/modifiers/registry"
import type { ModifierTargetId } from "@/lib/modifiers/types"
import type { SheetData } from "@/lib/sheet-data"

interface ModifierPopoverProps {
  sheetData: SheetData
  target: ModifierTargetId
  label: string
}

function formatSigned(value: number): string {
  return value >= 0 ? `+${value}` : String(value)
}

export function ModifierPopover({ sheetData, target, label }: ModifierPopoverProps) {
  const summary = getReferenceSummary(sheetData, target)

  return (
    <div className="w-64 rounded border border-gray-300 bg-white p-3 text-xs shadow-lg">
      <div className="mb-2 font-semibold text-gray-900">{label}来源</div>

      <div className="mb-2">
        <div className="mb-1 text-[11px] font-medium text-gray-500">基础值</div>
        {summary.activeBase ? (
          <div className="flex justify-between gap-2 rounded bg-gray-50 px-2 py-1">
            <span className="truncate">{summary.activeBase.label}</span>
            <span className="font-semibold">{summary.activeBase.value}</span>
          </div>
        ) : (
          <div className="rounded bg-gray-50 px-2 py-1 text-gray-500">未知基础值</div>
        )}
      </div>

      <div className="mb-2">
        <div className="mb-1 text-[11px] font-medium text-gray-500">加值</div>
        {summary.modifiers.length > 0 ? (
          <div className="space-y-1">
            {summary.modifiers.map(entry => (
              <div key={entry.id} className="flex justify-between gap-2 rounded bg-gray-50 px-2 py-1">
                <span className="truncate">{entry.label}</span>
                <span className="font-semibold">{formatSigned(entry.value)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded bg-gray-50 px-2 py-1 text-gray-500">无加值</div>
        )}
      </div>

      {summary.referenceTotal !== undefined && (
        <div className="flex justify-between border-t border-gray-200 pt-2">
          <span className="text-gray-500">参考合计</span>
          <span className="font-semibold">{summary.referenceTotal}</span>
        </div>
      )}

      {summary.unattributedDelta !== undefined && summary.unattributedDelta !== 0 && (
        <div className="mt-1 rounded bg-amber-50 px-2 py-1 text-amber-800">
          未归因差额 {formatSigned(summary.unattributedDelta)}
        </div>
      )}
    </div>
  )
}
