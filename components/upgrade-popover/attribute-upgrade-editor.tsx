"use client"

import { useState } from "react"
import { useSheetStore } from "@/lib/sheet-store"
import { X, ChevronUp } from "lucide-react"
import { isValidNumber, parseToNumber } from "@/lib/number-utils"

interface AttributeUpgradeEditorProps {
  onClose?: () => void
  tier?: string
  optionIndex?: number
  boxIndex?: number
  handleUpgradeCheck?: (tier: string, index: number) => void
}

interface AttributeSelection {
  agility: boolean
  strength: boolean
  finesse: boolean
  instinct: boolean
  presence: boolean
  knowledge: boolean
}

interface AttributeValues {
  agility: string
  strength: string
  finesse: string
  instinct: string
  presence: string
  knowledge: string
}

const ATTRIBUTES = [
  { key: "agility", name: "敏捷" },
  { key: "strength", name: "力量" },
  { key: "finesse", name: "灵巧" },
  { key: "instinct", name: "本能" },
  { key: "presence", name: "风度" },
  { key: "knowledge", name: "知识" },
] as const

export function AttributeUpgradeEditor({ onClose, tier, optionIndex, boxIndex, handleUpgradeCheck }: AttributeUpgradeEditorProps) {
  const { sheetData } = useSheetStore()
  const updateAttribute = useSheetStore(state => state.updateAttribute)
  const toggleAttributeChecked = useSheetStore(state => state.toggleAttributeChecked)

  const handleClose = () => {
    // 关闭时不做任何修改，直接关闭
    onClose?.()
  }

  // 初始化原始值
  const [originalValues] = useState<AttributeValues>(() => ({
    agility: typeof sheetData.agility === "object" && sheetData.agility !== null && "value" in sheetData.agility ? sheetData.agility.value : "0",
    strength: typeof sheetData.strength === "object" && sheetData.strength !== null && "value" in sheetData.strength ? sheetData.strength.value : "0",
    finesse: typeof sheetData.finesse === "object" && sheetData.finesse !== null && "value" in sheetData.finesse ? sheetData.finesse.value : "0",
    instinct: typeof sheetData.instinct === "object" && sheetData.instinct !== null && "value" in sheetData.instinct ? sheetData.instinct.value : "0",
    presence: typeof sheetData.presence === "object" && sheetData.presence !== null && "value" in sheetData.presence ? sheetData.presence.value : "0",
    knowledge: typeof sheetData.knowledge === "object" && sheetData.knowledge !== null && "value" in sheetData.knowledge ? sheetData.knowledge.value : "0",
  }))

  const [selected, setSelected] = useState<AttributeSelection>({
    agility: false,
    strength: false,
    finesse: false,
    instinct: false,
    presence: false,
    knowledge: false,
  })

  // 当前编辑中的值（仅选中的属性）
  const [editingValues, setEditingValues] = useState<AttributeValues>(() => ({...originalValues}))

  // 计算已选择数量
  const selectedCount = Object.values(selected).filter(Boolean).length

  // 获取未升级的属性数量
  const unupgradedCount = ATTRIBUTES.filter(attr => {
    const attrData = sheetData[attr.key]
    return typeof attrData === "object" && attrData !== null && "checked" in attrData && !attrData.checked
  }).length

  const handleToggle = (key: keyof AttributeSelection) => {
    const attrData = sheetData[key]

    // 如果该属性已升级,不允许选择
    if (typeof attrData === "object" && attrData !== null && "checked" in attrData && attrData.checked) {
      return
    }

    // 如果已选2个且当前未选中,不允许再选
    if (selectedCount >= 2 && !selected[key]) {
      return
    }

    const isCurrentlySelected = selected[key]

    // 如果取消选择，恢复原始值
    if (isCurrentlySelected) {
      setEditingValues(prev => ({ ...prev, [key]: originalValues[key] }))
    }

    setSelected(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleValueChange = (key: keyof AttributeValues, value: string) => {
    setEditingValues(prev => ({ ...prev, [key]: value }))
  }

  const handleIncrement = (key: keyof AttributeValues) => {
    const currentValue = editingValues[key]
    if (isValidNumber(currentValue)) {
      const numValue = parseToNumber(currentValue, 0)
      setEditingValues(prev => ({ ...prev, [key]: String(numValue + 1) }))
    }
  }

  const handleApply = () => {
    // 1. 应用属性修改
    Object.entries(selected).forEach(([key, isSelected]) => {
      if (isSelected) {
        // 直接使用编辑后的值
        const editedValue = editingValues[key as keyof AttributeValues]
        updateAttribute(key as keyof typeof sheetData, editedValue)

        // 标记为已升级
        toggleAttributeChecked(key as keyof typeof sheetData)
      }
    })

    // 2. 勾选对应的复选框
    if (tier && optionIndex !== undefined && boxIndex !== undefined && handleUpgradeCheck) {
      const checkKey = `${tier}-${optionIndex}-${boxIndex}`
      console.log('[AttributeUpgradeEditor] 勾选复选框:', checkKey)
      handleUpgradeCheck(checkKey, optionIndex)
    }

    // 3. 关闭气泡
    onClose?.()
  }

  // 检查是否可以应用升级
  const canApply = selectedCount === 2

  return (
    <div className="w-56">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-700">属性升级</span>
        <button
          onClick={handleClose}
          className="p-0.5 hover:bg-gray-100 rounded transition-colors"
          title="关闭"
        >
          <X className="w-3 h-3 text-gray-500" />
        </button>
      </div>

      <div className="text-xs text-gray-600 mb-2">
        选择两项未升级的属性 ({selectedCount}/2)
      </div>

      {unupgradedCount < 2 ? (
        <div className="text-xs text-gray-500 py-4 text-center bg-gray-50 rounded border border-gray-200">
          {unupgradedCount === 0
            ? "所有属性已升级"
            : "需要至少2个未升级属性"}
        </div>
      ) : (
        <>
          <div className="space-y-1 mb-3">
            {ATTRIBUTES.map(({ key, name }) => {
              const attrData = sheetData[key]
              const isUpgraded = typeof attrData === "object" && attrData !== null && "checked" in attrData && attrData.checked
              const isSpellcasting = typeof attrData === "object" && attrData !== null && "spellcasting" in attrData && attrData.spellcasting
              const isSelected = selected[key]
              const isDisabled = isUpgraded || (selectedCount >= 2 && !isSelected)
              const displayValue = editingValues[key]

              return (
                <div
                  key={key}
                  className={`
                    flex items-center justify-between px-2 py-1.5 rounded border transition-colors
                    ${isDisabled
                      ? "bg-gray-100 border-gray-200 opacity-60"
                      : "bg-white border-gray-300"
                    }
                    ${isSelected ? "border-blue-500 bg-blue-50" : ""}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <div
                      onClick={() => !isDisabled && handleToggle(key)}
                      className={`
                        w-4 h-4 border rounded flex items-center justify-center
                        ${isDisabled ? "cursor-not-allowed" : "cursor-pointer"}
                        ${isUpgraded
                          ? "bg-gray-300 border-gray-400"
                          : isSelected
                            ? "bg-blue-500 border-blue-500"
                            : "bg-white border-gray-400"
                        }
                      `}
                    >
                      {(isUpgraded || isSelected) && (
                        <span className="text-white text-xs">✓</span>
                      )}
                    </div>
                    <span className="text-xs font-medium flex items-center gap-0.5">
                      {name}
                      {isSpellcasting && (
                        <span className="text-gray-800 text-[11px] font-bold">✦</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {isSelected && isValidNumber(displayValue) && (
                      <button
                        onClick={() => handleIncrement(key)}
                        className="p-0.5 hover:bg-blue-100 rounded transition-colors"
                        title="增加属性值 (+1)"
                      >
                        <ChevronUp className="w-3.5 h-3.5 text-blue-600" />
                      </button>
                    )}
                    <input
                      type="text"
                      value={displayValue}
                      onChange={(e) => handleValueChange(key, e.target.value)}
                      disabled={!isSelected}
                      className={`
                        w-16 px-1 py-0.5 text-xs text-center border rounded
                        ${isSelected
                          ? "bg-white border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          : "bg-gray-50 border-gray-200 text-gray-600"
                        }
                      `}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {isUpgraded && (
                      <span className="text-[10px] text-gray-500">(已升级)</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <button
            onClick={handleApply}
            disabled={!canApply}
            className="w-full py-2 text-xs font-semibold rounded bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            应用升级
          </button>
        </>
      )}
    </div>
  )
}
