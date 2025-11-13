"use client"

import { useState } from "react"
import { useSheetStore } from "@/lib/sheet-store"
import { X, ChevronUp, ChevronDown } from "lucide-react"
import { isValidNumber, parseToNumber } from "@/lib/number-utils"
import { showFadeNotification } from "@/components/ui/fade-notification"
import type { AttributeValue } from "@/lib/sheet-data"

interface AttributeUpgradeEditorProps {
  onClose?: () => void
  checkKey: string  // 完整的 checkKey，如 "tier1-0-2"
  optionIndex: number  // 选项索引
  toggleUpgradeCheckbox: (checkKey: string, index: number, checked: boolean) => void  // 状态切换函数
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

export function AttributeUpgradeEditor({ onClose, checkKey, optionIndex, toggleUpgradeCheckbox }: AttributeUpgradeEditorProps) {
  const { sheetData } = useSheetStore()
  const updateAttribute = useSheetStore(state => state.updateAttribute)
  const toggleAttributeChecked = useSheetStore(state => state.toggleAttributeChecked)
  const saveAttributeUpgradeRecord = useSheetStore(state => state.saveAttributeUpgradeRecord)

  const handleClose = () => {
    // 关闭时不做任何修改，直接关闭
    onClose?.()
  }

  // 在组件 mount 时保存 beforeState 快照
  const [beforeState] = useState<Record<string, AttributeValue>>(() => {
    return {
      agility: {
        value: sheetData.agility?.value ?? "0",
        checked: sheetData.agility?.checked ?? false,
        ...(sheetData.agility?.spellcasting !== undefined && { spellcasting: sheetData.agility.spellcasting })
      },
      strength: {
        value: sheetData.strength?.value ?? "0",
        checked: sheetData.strength?.checked ?? false,
        ...(sheetData.strength?.spellcasting !== undefined && { spellcasting: sheetData.strength.spellcasting })
      },
      finesse: {
        value: sheetData.finesse?.value ?? "0",
        checked: sheetData.finesse?.checked ?? false,
        ...(sheetData.finesse?.spellcasting !== undefined && { spellcasting: sheetData.finesse.spellcasting })
      },
      instinct: {
        value: sheetData.instinct?.value ?? "0",
        checked: sheetData.instinct?.checked ?? false,
        ...(sheetData.instinct?.spellcasting !== undefined && { spellcasting: sheetData.instinct.spellcasting })
      },
      presence: {
        value: sheetData.presence?.value ?? "0",
        checked: sheetData.presence?.checked ?? false,
        ...(sheetData.presence?.spellcasting !== undefined && { spellcasting: sheetData.presence.spellcasting })
      },
      knowledge: {
        value: sheetData.knowledge?.value ?? "0",
        checked: sheetData.knowledge?.checked ?? false,
        ...(sheetData.knowledge?.spellcasting !== undefined && { spellcasting: sheetData.knowledge.spellcasting })
      },
    }
  })

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

  const handleDecrement = (key: keyof AttributeValues) => {
    const currentValue = editingValues[key]
    if (isValidNumber(currentValue)) {
      const numValue = parseToNumber(currentValue, 0)
      setEditingValues(prev => ({ ...prev, [key]: String(numValue - 1) }))
    }
  }

  const handleApply = () => {
    // 收集升级的属性名称（用于通知）
    const upgradedAttributes: string[] = []

    // 1. 先构造 afterState（基于 beforeState + 选择的修改）
    const afterState: Record<string, AttributeValue> = {
      agility: { ...beforeState.agility },
      strength: { ...beforeState.strength },
      finesse: { ...beforeState.finesse },
      instinct: { ...beforeState.instinct },
      presence: { ...beforeState.presence },
      knowledge: { ...beforeState.knowledge },
    }

    // 更新 afterState 中被选中的属性
    Object.entries(selected).forEach(([key, isSelected]) => {
      if (isSelected) {
        afterState[key] = {
          ...afterState[key],
          value: editingValues[key as keyof AttributeValues],
          checked: true,
        }

        // 记录升级的属性名称
        const attrInfo = ATTRIBUTES.find(a => a.key === key)
        if (attrInfo) upgradedAttributes.push(attrInfo.name)
      }
    })

    // 2. 应用属性修改到 store
    Object.entries(selected).forEach(([key, isSelected]) => {
      if (isSelected) {
        // 直接使用编辑后的值
        const editedValue = editingValues[key as keyof AttributeValues]
        updateAttribute(key as keyof typeof sheetData, editedValue)

        // 标记为已升级
        toggleAttributeChecked(key as keyof typeof sheetData)
      }
    })

    // 3. 保存快照到 store
    saveAttributeUpgradeRecord(checkKey, beforeState, afterState)

    // 4. 勾选复选框（使用新的状态切换函数）
    toggleUpgradeCheckbox(checkKey, optionIndex, true)

    // 5. 显示成功通知
    if (upgradedAttributes.length > 0) {
      showFadeNotification({
        message: `已升级属性：${upgradedAttributes.join('、')}`,
        type: "success"
      })
    }

    // 6. 关闭气泡
    onClose?.()
  }

  // 检查是否可以应用升级
  const canApply = selectedCount === 2

  return (
    <div className="w-48">
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
        <strong>选择并修改</strong>两项未升级的属性 ({selectedCount}/2)
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
                  onClick={() => !isDisabled && handleToggle(key)}
                  className={`
                    flex items-center justify-between px-2 py-1.5 rounded border transition-colors
                    ${isDisabled
                    ? "bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed"
                    : "bg-white border-gray-300 cursor-pointer hover:bg-gray-50"
                    }
                    ${isSelected ? "!border-blue-500 !bg-blue-100 hover:!bg-blue-100" : ""}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium flex items-center gap-0.5">
                      {name}
                      {isSpellcasting && (
                        <span className="text-gray-800 text-[11px] font-bold">✦</span>
                      )}
                      {isUpgraded && (
                        <span className="text-[10px] text-gray-500 ml-1">(已升级)</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {isSelected && isValidNumber(displayValue) && (
                      <>
                        <button
                          onClick={() => handleDecrement(key)}
                          className="w-6 h-6 flex items-center justify-center bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                          title="减少属性值 (-1)"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleIncrement(key)}
                          className="w-6 h-6 flex items-center justify-center bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                          title="增加属性值 (+1)"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                      </>
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
                    />
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
