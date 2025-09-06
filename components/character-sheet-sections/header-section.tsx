"use client"

import type React from "react"
import { useRef, useState } from "react"
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
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState("")

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

  const startEditingName = (field: string, currentValue: string) => {
    setEditingField(field)
    setEditingValue(currentValue || "")
  }

  const saveEditingName = () => {
    if (editingField) {
      setSheetData((prev) => ({
        ...prev,
        [editingField]: {
          ...(prev as any)[editingField],
          name: editingValue
        }
      }))
      setEditingField(null)
      setEditingValue("")
    }
  }

  const cancelEditing = () => {
    setEditingField(null)
    setEditingValue("")
  }

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      saveEditingName()
    } else if (e.key === 'Escape') {
      cancelEditing()
    }
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
          {editingField === 'professionRef' ? (
            <input
              type="text"
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              onKeyDown={handleEditKeyDown}
              onBlur={saveEditingName}
              className="w-56 bg-white border border-gray-400 text-gray-800 rounded p-1 h-7 text-xs px-2 focus:outline-none focus:border-blue-500"
              autoFocus
            />
          ) : (
            <div
              className="group flex w-56 border border-gray-400 rounded h-7 bg-white overflow-hidden"
              onMouseEnter={(e) => handleMouseEnter(formData.professionRef, e.currentTarget)}
              onMouseLeave={handleMouseLeave}
            >
                <button
                  type="button"
                  onClick={openProfessionModal}
                  className="flex-1 text-gray-800 text-xs text-left px-2 py-0.5 hover:bg-gray-50 focus:outline-none"
                >
                  {formData.professionRef?.name || <span className="print:hidden">选择职业</span>}
                </button>
              {formData.professionRef?.name && (
                <>
                  <div className="w-px bg-gray-300 opacity-0 group-hover:opacity-100"></div>
                  <button
                    type="button"
                    onClick={() => startEditingName('professionRef', formData.professionRef?.name || '')}
                    className="w-8 flex items-center justify-center hover:bg-gray-50 focus:outline-none print:hidden opacity-0 group-hover:opacity-100 transition-opacity"
                    title="编辑名称"
                  >
                    <svg className="w-3 h-3 text-gray-500" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M11.498 1.5a.5.5 0 0 1 .707 0l2.295 2.295a.5.5 0 0 1 0 .707l-9.435 9.435a.5.5 0 0 1-.354.146H1.5a.5.5 0 0 1-.5-.5v-3.211a.5.5 0 0 1 .146-.354L10.582 1.5h.916zm-1 2.207-8.646 8.646v2.36h2.36l8.647-8.647L10.498 3.707z" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          )}
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
            {editingField === 'communityRef' ? (
              <input
                type="text"
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onKeyDown={handleEditKeyDown}
                onBlur={saveEditingName}
                className="w-40 bg-white border border-gray-400 text-gray-800 rounded p-1 h-7 text-xs px-2 focus:outline-none focus:border-blue-500"
                autoFocus
              />
            ) : (
              <div
                className="group flex w-40 border border-gray-400 rounded h-7 bg-white overflow-hidden"
                onMouseEnter={(e) => handleMouseEnter(formData.communityRef, e.currentTarget)}
                onMouseLeave={handleMouseLeave}
              >
                  <button
                    type="button"
                    onClick={openCommunityModal}
                    className="flex-1 text-gray-800 text-xs text-left px-2 py-0.5 hover:bg-gray-50 focus:outline-none"
                  >
                    {formData.communityRef?.name || <span className="print:hidden">选择社群</span>}
                  </button>
                {formData.communityRef?.name && (
                  <>
                    <div className="w-px bg-gray-300 opacity-0 group-hover:opacity-100"></div>
                    <button
                      type="button"
                      onClick={() => startEditingName('communityRef', formData.communityRef?.name || '')}
                      className="w-8 flex items-center justify-center hover:bg-gray-50 focus:outline-none print:hidden opacity-0 group-hover:opacity-100 transition-opacity"
                      title="编辑名称"
                    >
                      <svg className="w-3 h-3 text-gray-500" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M11.498 1.5a.5.5 0 0 1 .707 0l2.295 2.295a.5.5 0 0 1 0 .707l-9.435 9.435a.5.5 0 0 1-.354.146H1.5a.5.5 0 0 1-.5-.5v-3.211a.5.5 0 0 1 .146-.354L10.582 1.5h.916zm-1 2.207-8.646 8.646v2.36h2.36l8.647-8.647L10.498 3.707z" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex flex-col">
            <label className="text-[9px] text-gray-300">血统</label>
            <div className="flex gap-1">
              {editingField === 'ancestry1Ref' ? (
                <input
                  type="text"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  onBlur={saveEditingName}
                  className="w-20 bg-white border border-gray-400 text-gray-800 rounded p-1 h-7 text-xs px-2 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              ) : (
                  <div
                    className="group relative flex w-24 border border-gray-400 rounded h-7 bg-white overflow-hidden"
                    onMouseEnter={(e) => handleMouseEnter(formData.ancestry1Ref, e.currentTarget)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <button
                      type="button"
                      onClick={() => openAncestryModal("ancestry1")}
                      className="flex-1 text-gray-800 text-xs text-left px-2 py-0.5 hover:bg-gray-50 focus:outline-none truncate"
                    >
                      {formData.ancestry1Ref?.name || <span className="print:hidden">选择血统</span>}
                    </button>
                    {formData.ancestry1Ref?.name && (
                      <button
                        type="button"
                        onClick={() => startEditingName('ancestry1Ref', formData.ancestry1Ref?.name || '')}
                        className="absolute right-0 top-0 bottom-0 w-8 flex items-center justify-center bg-white hover:bg-gray-50 focus:outline-none print:hidden opacity-0 group-hover:opacity-100 transition-opacity border-l border-gray-300"
                        title="编辑名称"
                      >
                        <svg className="w-3 h-3 text-gray-500" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M11.498 1.5a.5.5 0 0 1 .707 0l2.295 2.295a.5.5 0 0 1 0 .707l-9.435 9.435a.5.5 0 0 1-.354.146H1.5a.5.5 0 0 1-.5-.5v-3.211a.5.5 0 0 1 .146-.354L10.582 1.5h.916zm-1 2.207-8.646 8.646v2.36h2.36l8.647-8.647L10.498 3.707z" />
                        </svg>
                      </button>
                  )}
                </div>
              )}
              <span className="flex items-center text-white text-xs">+</span>
              {editingField === 'ancestry2Ref' ? (
                <input
                  type="text"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  onBlur={saveEditingName}
                  className="w-24 bg-white border border-gray-400 text-gray-800 rounded p-1 h-7 text-xs px-2 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              ) : (
                  <div
                    className="group relative flex w-24 border border-gray-400 rounded h-7 bg-white overflow-hidden"
                    onMouseEnter={(e) => handleMouseEnter(formData.ancestry2Ref, e.currentTarget)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <button
                      type="button"
                      onClick={() => openAncestryModal("ancestry2")}
                      className="flex-1 text-gray-800 text-xs text-left px-2 py-0.5 hover:bg-gray-50 focus:outline-none truncate"
                    >
                      {formData.ancestry2Ref?.name || <span className="print:hidden">选择血统</span>}
                    </button>
                    {formData.ancestry2Ref?.name && (
                      <button
                        type="button"
                        onClick={() => startEditingName('ancestry2Ref', formData.ancestry2Ref?.name || '')}
                        className="absolute right-0 top-0 bottom-0 w-8 flex items-center justify-center bg-white hover:bg-gray-50 focus:outline-none print:hidden opacity-0 group-hover:opacity-100 transition-opacity border-l border-gray-300"
                        title="编辑名称"
                      >
                        <svg className="w-3 h-3 text-gray-500" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M11.498 1.5a.5.5 0 0 1 .707 0l2.295 2.295a.5.5 0 0 1 0 .707l-9.435 9.435a.5.5 0 0 1-.354.146H1.5a.5.5 0 0 1-.5-.5v-3.211a.5.5 0 0 1 .146-.354L10.582 1.5h.916zm-1 2.207-8.646 8.646v2.36h2.36l8.647-8.647L10.498 3.707z" />
                        </svg>
                      </button>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col">
            <label className="text-[9px] text-gray-300">子职业</label>
            {editingField === 'subclassRef' ? (
              <input
                type="text"
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onKeyDown={handleEditKeyDown}
                onBlur={saveEditingName}
                className="w-40 bg-white border border-gray-400 text-gray-800 rounded p-1 h-7 text-xs px-2 focus:outline-none focus:border-blue-500"
                autoFocus
              />
            ) : (
              <div className="group flex w-40 border border-gray-400 rounded h-7 bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={openSubclassModal}
                    onMouseEnter={(e) => handleMouseEnter(formData.subclassRef, e.currentTarget)}
                    onMouseLeave={handleMouseLeave}
                    className="flex-1 text-gray-800 text-xs text-left px-2 py-0.5 hover:bg-gray-50 focus:outline-none"
                  >
                    {formData.subclassRef?.name || <span className="print:hidden">选择子职业</span>}
                  </button>
                {formData.subclassRef?.name && (
                  <>
                    <div className="w-px bg-gray-300 opacity-0 group-hover:opacity-100"></div>
                    <button
                      type="button"
                      onClick={() => startEditingName('subclassRef', formData.subclassRef?.name || '')}
                      className="w-8 flex items-center justify-center hover:bg-gray-50 focus:outline-none print:hidden opacity-0 group-hover:opacity-100 transition-opacity"
                      title="编辑名称"
                    >
                      <svg className="w-3 h-3 text-gray-500" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M11.498 1.5a.5.5 0 0 1 .707 0l2.295 2.295a.5.5 0 0 1 0 .707l-9.435 9.435a.5.5 0 0 1-.354.146H1.5a.5.5 0 0 1-.5-.5v-3.211a.5.5 0 0 1 .146-.354L10.582 1.5h.916zm-1 2.207-8.646 8.646v2.36h2.36l8.647-8.647L10.498 3.707z" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            )}
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
