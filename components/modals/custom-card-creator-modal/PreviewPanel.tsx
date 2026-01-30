"use client"

import { motion } from 'framer-motion'
import { ImageCard } from '@/components/ui/image-card'
import { SelectableCard } from '@/components/ui/selectable-card'
import type { ExtendedStandardCard } from '@/card/card-types'
import { cn } from '@/lib/utils'

interface PreviewPanelProps {
  previewCard: ExtendedStandardCard
  isAnimating: boolean
  viewMode: 'image' | 'selectable'
  onViewModeChange: (mode: 'image' | 'selectable') => void
}

export function PreviewPanel({
  previewCard,
  isAnimating,
  viewMode,
  onViewModeChange
}: PreviewPanelProps) {
  return (
    <div className="h-full flex flex-col gap-6">
      {/* 标题与切换按钮 */}
      <div className="flex items-center justify-between pb-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">
          实时预览
        </h3>

        {/* 视图切换按钮 */}
        <div className="flex items-center gap-2 bg-white rounded-md p-1 border border-gray-200">
          <button
            type="button"
            onClick={() => onViewModeChange('image')}
            className={cn(
              "px-3 py-1.5 rounded text-sm font-medium transition-colors",
              viewMode === 'image'
                ? "bg-blue-500 text-white"
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            图片卡
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('selectable')}
            className={cn(
              "px-3 py-1.5 rounded text-sm font-medium transition-colors",
              viewMode === 'selectable'
                ? "bg-blue-500 text-white"
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            文字卡
          </button>
        </div>
      </div>

      {/* 预览卡牌 (带动画) */}
      <motion.div
        key={`preview-${viewMode}`}
        animate={{
          opacity: isAnimating ? 0.7 : 1,
          y: isAnimating ? -5 : 0,
        }}
        transition={{ duration: 0.2 }}
        className="flex-1 flex items-start justify-center"
      >
        {viewMode === 'image' ? (
          <ImageCard
            card={previewCard}
            onClick={() => {}}
            isSelected={false}
            showSource={false}
          />
        ) : (
          <SelectableCard
            card={previewCard}
            onClick={() => {}}
            isSelected={false}
            showSource={false}
          />
        )}
      </motion.div>

      {/* 提示文本 */}
      <div className="text-sm text-gray-600 bg-blue-50 rounded p-3 border border-blue-200">
        <p>💡 输入内容会立即反映在预览卡牌中</p>
      </div>
    </div>
  )
}
