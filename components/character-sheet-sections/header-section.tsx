"use client"

import type React from "react"
import { useRef } from "react"
import { useAutoResizeFont } from "@/hooks/use-auto-resize-font"
import { useCardPreview } from "@/hooks/use-card-preview"
import { SelectableCard } from "@/components/ui/selectable-card"
import { useSheetStore } from "@/lib/sheet-store"
import { PageHeader } from "@/components/page-header"

interface HeaderSectionProps {
  onOpenProfessionModal: () => void;
  onOpenAncestryModal: (field: string) => void;
  onOpenCommunityModal: () => void;
  onOpenSubclassModal: () => void;
}

export function HeaderSection({
  onOpenProfessionModal,
  onOpenAncestryModal,
  onOpenCommunityModal,
  onOpenSubclassModal
}: HeaderSectionProps) {
  const { sheetData: formData, setSheetData, updateLevelWithThreshold } = useSheetStore()
  const containerRef = useRef<HTMLDivElement>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (name === 'level') {
      // 使用新的等级更新函数，自动计算伤害阈值
      updateLevelWithThreshold(value)
    } else {
      setSheetData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const openProfessionModal = () => {
    onOpenProfessionModal()
  }

  const openAncestryModal = (field: string) => {
    onOpenAncestryModal(field)
  }

  const openCommunityModal = () => {
    onOpenCommunityModal()
  }

  const openSubclassModal = () => {
    onOpenSubclassModal()
  }

  const { getElementProps } = useAutoResizeFont({
    maxFontSize: 14,
    minFontSize: 10
  })

  const {
    hoveredCard,
    previewPosition,
    handleMouseEnter,
    handleMouseLeave
  } = useCardPreview({
    cards: formData.cards || [],
    containerRef
  })

  return (
    <div
      ref={containerRef}
      className="bg-gray-800 text-white p-2 flex justify-between items-center rounded-t-md relative"
    >
      <div className="flex flex-col">
        <label className="text-[9px] text-gray-300">职业</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openProfessionModal}
            onMouseEnter={(e) => handleMouseEnter(formData.professionRef, e.currentTarget)}
            onMouseLeave={handleMouseLeave}
            className="header-selection-button printable-selection-button w-56 bg-white border-gray-400 text-gray-800 text-xl font-bold print:bg-white print:text-black rounded p-1 h-7 text-xs text-left px-2"
          >
            {formData.professionRef?.name
              ? `${formData.professionRef.name}${formData.cards[0]?.cardSelectDisplay?.item1 && formData.cards[0]?.cardSelectDisplay?.item2 ? `  -  ${formData.cards[0].cardSelectDisplay.item1}&${formData.cards[0].cardSelectDisplay.item2}` : ''}`
              : <span className="print:hidden">选择职业</span>}
          </button>
        </div>
        <PageHeader />
      </div>
      <div className="flex flex-col items-center gap-1">
        <div className="flex gap-2">
          <div className="flex flex-col">
            <label className="text-[9px] text-gray-300">名称</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              {...getElementProps(formData.name, 'character-name')}
              className="bg-white text-gray-800 border border-gray-400 rounded p-1 focus:outline-none w-40 print-empty-hide"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-[9px] text-gray-300">社群</label>
            <button
              type="button"
              onClick={openCommunityModal}
              onMouseEnter={(e) => handleMouseEnter(formData.communityRef, e.currentTarget)}
              onMouseLeave={handleMouseLeave}
              className="header-selection-button printable-selection-button w-40 bg-white text-gray-800 border-gray-400 rounded p-1 h-7 text-xs print:bg-white print:text-black text-left px-2"
            >
              {formData.communityRef?.name || <span className="print:hidden">选择社群</span>}
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex flex-col">
            <label className="text-[9px] text-gray-300">血统</label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => openAncestryModal("ancestry1")}
                onMouseEnter={(e) => handleMouseEnter(formData.ancestry1Ref, e.currentTarget)}
                onMouseLeave={handleMouseLeave}
                className="header-selection-button printable-selection-button w-20 bg-white text-gray-800 border-gray-400 rounded p-1 h-7 text-xs print:bg-white print:text-black text-left px-2"
              >
                {formData.ancestry1Ref?.name || <span className="print:hidden">选择血统</span>}
              </button>
              <span className="flex items-center text-white text-xs">+</span>
              <button
                type="button"
                onClick={() => openAncestryModal("ancestry2")}
                onMouseEnter={(e) => handleMouseEnter(formData.ancestry2Ref, e.currentTarget)}
                onMouseLeave={handleMouseLeave}
                className="header-selection-button printable-selection-button w-20 bg-white text-gray-800 border-gray-400 rounded p-1 h-7 text-xs print:bg-white print:text-black text-left px-2"
              >
                {formData.ancestry2Ref?.name || <span className="print:hidden">选择血统</span>}
              </button>
            </div>
          </div>
          <div className="flex flex-col">
            <label className="text-[9px] text-gray-300">子职业</label>
            <button
              type="button"
              onClick={openSubclassModal}
              onMouseEnter={(e) => handleMouseEnter(formData.subclassRef, e.currentTarget)}
              onMouseLeave={handleMouseLeave}
              className="header-selection-button printable-selection-button w-40 bg-white text-gray-800 border-gray-400 rounded p-1 h-7 text-xs print:bg-white print:text-black text-left px-2"
            >
              {formData.subclassRef?.name || <span className="print:hidden">选择子职业</span>}
            </button>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 bg-white text-gray-800 rounded-md border-4 border-gray-600 flex items-center justify-center">
          <div className="text-center">
            <div className="text-xs font-bold">LEVEL</div>
            <input
              type="text"
              name="level"
              value={formData.level}
              placeholder="1"
              onChange={handleInputChange}
              className="w-8 text-center border-b border-gray-400 focus:outline-none text-xl font-bold print-empty-hide"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            const currentLevel = parseInt(formData.level) || 0
            // 如果当前等级为空、不是数字或小于1，设置为1
            // 如果当前等级大于等于10，保持为10
            // 否则加1
            let newLevel = 1
            if (currentLevel >= 1 && currentLevel < 10) {
              newLevel = currentLevel + 1
            } else if (currentLevel >= 10) {
              newLevel = 10
            }
            updateLevelWithThreshold(String(newLevel))
          }}
          className="mt-1 px-2 py-0.5 bg-gray-600 hover:bg-gray-500 text-white text-[10px] font-bold rounded print:hidden transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed"
          disabled={parseInt(formData.level) >= 10}
        >
          Level Up!
        </button>
      </div>

      {/* 卡牌悬停预览 */}
      {hoveredCard && (
        <div
          className="absolute z-50 pointer-events-none"
          style={previewPosition}
        >
          <SelectableCard
            card={hoveredCard}
            onClick={() => { }}
            isSelected={false}
          />
        </div>
      )}
    </div>
  )
}
