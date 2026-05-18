"use client"

import { useState } from "react"
import { useSheetStore } from "@/lib/sheet-store"
import type { AttributeValue, SheetData } from "@/lib/sheet-data"
import { X } from "lucide-react"
import { showFadeNotification } from "@/components/ui/fade-notification"

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

const ATTRIBUTES = [
  { key: "agility", name: "敏捷" },
  { key: "strength", name: "力量" },
  { key: "finesse", name: "灵巧" },
  { key: "instinct", name: "本能" },
  { key: "presence", name: "风度" },
  { key: "knowledge", name: "知识" },
] as const

function isAttributeValue(value: unknown): value is AttributeValue {
  return typeof value === "object" && value !== null && "checked" in value && "value" in value
}

function emptySelection(): AttributeSelection {
  return {
    agility: false,
    strength: false,
    finesse: false,
    instinct: false,
    presence: false,
    knowledge: false,
  }
}

export function AttributeUpgradeEditor({ onClose, checkKey }: AttributeUpgradeEditorProps) {
  const { sheetData, setSheetData, setUpgradeState } = useSheetStore()
  const [mode, setMode] = useState<"standard" | "free">("standard")

  const handleClose = () => {
    // 关闭时不做任何修改，直接关闭
    onClose?.()
  }

  const [selected, setSelected] = useState<AttributeSelection>(emptySelection)

  // 计算已选择数量
  const selectedCount = Object.values(selected).filter(Boolean).length

  const isAttributeUpgraded = (key: keyof AttributeSelection) => {
    if (mode === "free") return false
    const attrData = sheetData[key]
    return isAttributeValue(attrData) && attrData.checked
  }

  // 获取未升级的属性数量
  const unupgradedCount = mode === "standard"
    ? ATTRIBUTES.filter(attr => !isAttributeUpgraded(attr.key)).length
    : ATTRIBUTES.length

  const handleModeChange = (nextMode: "standard" | "free") => {
    setMode(nextMode)
    setSelected(emptySelection())
  }

  const handleToggle = (key: keyof AttributeSelection) => {
    // 如果该属性已升级,不允许选择
    if (isAttributeUpgraded(key)) {
      return
    }

    // 如果已选2个且当前未选中,不允许再选
    if (selectedCount >= 2 && !selected[key]) {
      return
    }

    setSelected(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleApply = () => {
    // 收集升级的属性名称（用于通知）
    const upgradedAttributes: string[] = []

    Object.entries(selected).forEach(([key, isSelected]) => {
      if (isSelected) {
        // 记录升级的属性名称
        const attrInfo = ATTRIBUTES.find(a => a.key === key)
        if (attrInfo) upgradedAttributes.push(attrInfo.name)
      }
    })

    const selectedAttributes = Object.entries(selected)
      .filter(([, isSelected]) => isSelected)
      .map(([key]) => key as keyof AttributeSelection)

    if (mode === "standard") {
      setSheetData((prev: SheetData) => {
        const updates: Partial<SheetData> = {}

        selectedAttributes.forEach(attribute => {
          const currentAttribute = prev[attribute]
          if (isAttributeValue(currentAttribute)) {
            updates[attribute] = {
              ...currentAttribute,
              checked: true,
            }
          }
        })

        return updates
      })
    }

    setUpgradeState(checkKey, {
      checked: true,
      params: {
        attributes: selectedAttributes,
      },
      ...(mode === "standard" ? { attributeMarksApplied: true as const } : {}),
    })

    // 显示成功通知
    if (upgradedAttributes.length > 0) {
      showFadeNotification({
        message: `已记录属性升级：${upgradedAttributes.join('、')}`,
        type: "success",
        position: "middle"
      })
    }

    // 关闭气泡
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
        {mode === "standard" ? "选择两项未升级的属性" : "选择两项属性"} ({selectedCount}/2)
      </div>

      <div className="mb-2 grid grid-cols-2 rounded border border-gray-300 p-0.5 text-xs">
        <button
          type="button"
          onClick={() => handleModeChange("standard")}
          className={`rounded px-2 py-1 font-medium transition-colors ${mode === "standard"
            ? "bg-gray-800 text-white"
            : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          标准
        </button>
        <button
          type="button"
          onClick={() => handleModeChange("free")}
          className={`rounded px-2 py-1 font-medium transition-colors ${mode === "free"
            ? "bg-gray-800 text-white"
            : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          自由
        </button>
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
              const isUpgraded = isAttributeUpgraded(key)
              const isSpellcasting = isAttributeValue(attrData) && attrData.spellcasting
              const isSelected = selected[key]
              const isDisabled = isUpgraded || (selectedCount >= 2 && !isSelected)

              return (
                <button
                  type="button"
                  key={key}
                  data-testid={`attribute-upgrade-option-${key}`}
                  disabled={isDisabled}
                  onClick={() => !isDisabled && handleToggle(key)}
                  className={`
                    flex w-full items-center justify-between px-2 py-1.5 rounded border text-left transition-colors
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
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    {isSelected && (
                      <span className="font-medium text-blue-700">已选择</span>
                    )}
                  </div>
                </button>
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
