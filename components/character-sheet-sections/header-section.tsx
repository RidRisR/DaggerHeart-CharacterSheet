"use client"

import type React from "react"
import { useRef } from "react"
import { useAutoResizeFont } from "@/hooks/use-auto-resize-font"
import { useCardPreview } from "@/hooks/use-card-preview"
import { SelectableCard } from "@/components/ui/selectable-card"
import { useSheetStore } from "@/lib/sheet-store"

export function HeaderSection() {
  const { sheetData: formData, setSheetData } = useSheetStore()
  const containerRef = useRef<HTMLDivElement>(null)
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setSheetData((prev) => ({ ...prev, [name]: value }))
  }

  const openProfessionModal = () => {
    // TODO: 这里需要实现职业选择模态框的逻辑
    // 暂时留空，等待后续模态框组件的迁移
    console.log("Open profession modal")
  }

  const openAncestryModal = (field: string) => {
    // TODO: 这里需要实现血统选择模态框的逻辑
    // 暂时留空，等待后续模态框组件的迁移
    console.log("Open ancestry modal:", field)
  }

  const openCommunityModal = () => {
    // TODO: 这里需要实现社群选择模态框的逻辑
    // 暂时留空，等待后续模态框组件的迁移
    console.log("Open community modal")
  }

  const openSubclassModal = () => {
    // TODO: 这里需要实现子职业选择模态框的逻辑
    // 暂时留空，等待后续模态框组件的迁移
    console.log("Open subclass modal")
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
            {formData.professionRef?.name || "选择职业"}
          </button>
        </div>
        <div className="text-[9px] mt-1">DAGGERHEART V20250520</div>
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
              {formData.communityRef?.name || "选择社群"}
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
                {formData.ancestry1Ref?.name || "选择血统"}
              </button>
              <span className="flex items-center text-white text-xs">+</span>
              <button
                type="button"
                onClick={() => openAncestryModal("ancestry2")}
                onMouseEnter={(e) => handleMouseEnter(formData.ancestry2Ref, e.currentTarget)}
                onMouseLeave={handleMouseLeave}
                className="header-selection-button printable-selection-button w-20 bg-white text-gray-800 border-gray-400 rounded p-1 h-7 text-xs print:bg-white print:text-black text-left px-2"
              >
                {formData.ancestry2Ref?.name || "选择血统"}
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
              {formData.subclassRef?.name || "选择子职业"}
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
