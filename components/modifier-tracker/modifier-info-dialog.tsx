"use client"

/**
 * 调整值详情弹窗组件
 *
 * 展示某个属性的所有调整值明细
 */

import { useMemo } from 'react'
import { X } from 'lucide-react'
import { useSheetStore } from '@/lib/sheet-store'
import { modifierTracker } from '@/lib/modifier-tracker'
import { SourceTypeIcon } from './source-type-icon'

interface ModifierInfoDialogProps {
  attribute: string
  open: boolean
  onClose: () => void
}

export function ModifierInfoDialog({ attribute, open, onClose }: ModifierInfoDialogProps) {
  const { sheetData } = useSheetStore()

  // 自动刷新：当 sheetData 变化时重新计算
  const modifierInfo = useMemo(
    () => {
      try {
        return modifierTracker.getAttributeModifiers(attribute, sheetData)
      } catch (error) {
        console.error('[ModifierInfoDialog] Error:', error)
        return null
      }
    },
    [attribute, sheetData]
  )

  if (!open || !modifierInfo) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 print:hidden"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-800">
              {modifierInfo.attributeLabel} 调整值明细
            </h3>
            <span className="text-2xl font-bold text-blue-600">
              {modifierInfo.total}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="关闭"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* 基础值 */}
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="font-medium text-gray-700">基础值</span>
            <span className="text-lg font-semibold text-gray-900">{modifierInfo.baseValue}</span>
          </div>

          {/* 加值列表 */}
          {modifierInfo.bonuses.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-green-700 mb-2">
                加值来源
              </h4>
              <div className="space-y-1">
                {modifierInfo.bonuses.map(mod => (
                  <div
                    key={mod.id}
                    className="flex justify-between items-center px-3 py-2 bg-green-50 rounded-md border border-green-200"
                  >
                    <div className="flex items-center gap-2">
                      <SourceTypeIcon type={mod.sourceType} className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-gray-800">{mod.sourceName}</span>
                    </div>
                    <span className="text-sm font-bold text-green-600">
                      +{mod.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 减值列表 */}
          {modifierInfo.penalties.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-red-700 mb-2">
                减值来源
              </h4>
              <div className="space-y-1">
                {modifierInfo.penalties.map(mod => (
                  <div
                    key={mod.id}
                    className="flex justify-between items-center px-3 py-2 bg-red-50 rounded-md border border-red-200"
                  >
                    <div className="flex items-center gap-2">
                      <SourceTypeIcon type={mod.sourceType} className="w-4 h-4 text-red-600" />
                      <span className="text-sm text-gray-800">{mod.sourceName}</span>
                    </div>
                    <span className="text-sm font-bold text-red-600">
                      -{mod.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 无调整值提示 */}
          {modifierInfo.bonuses.length === 0 && modifierInfo.penalties.length === 0 && (
            <p className="text-center text-gray-500 py-6 text-sm">
              暂无额外调整值
            </p>
          )}

          {/* 总计 */}
          <div className="flex justify-between items-center py-3 border-t-2 border-gray-300">
            <span className="font-bold text-gray-800">总计</span>
            <span className="text-2xl font-bold text-blue-600">
              {modifierInfo.total}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
