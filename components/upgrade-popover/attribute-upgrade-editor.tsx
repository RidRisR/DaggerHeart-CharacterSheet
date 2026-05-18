"use client"

import { useState } from "react"
import { useSheetStore } from "@/lib/sheet-store"
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

export function AttributeUpgradeEditor({ onClose, checkKey }: AttributeUpgradeEditorProps) {
  const { sheetData } = useSheetStore()

  const handleClose = () => {
    // 关闭时不做任何修改，直接关闭
    onClose?.()
  }

  const [selected, setSelected] = useState<AttributeSelection>({
    agility: false,
    strength: false,
    finesse: false,
    instinct: false,
    presence: false,
    knowledge: false,
  })

  // 计算已选择数量
  const selectedCount = Object.values(selected).filter(Boolean).length

  const selectedUpgradeAttributes = new Set<string>()
  Object.values(sheetData.upgradeStates ?? {}).forEach(state => {
    if (!state?.checked) return
    const params = state.params
    if (!params || typeof params !== "object" || Array.isArray(params)) return
    const attributes = (params as { attributes?: unknown }).attributes
    if (!Array.isArray(attributes)) return
    attributes.forEach(attribute => {
      if (typeof attribute === "string") selectedUpgradeAttributes.add(attribute)
    })
  })

  const isAttributeUpgraded = (key: keyof AttributeSelection) => {
    const attrData = sheetData[key]
    const isLegacyUpgraded = typeof attrData === "object" && attrData !== null && "checked" in attrData && attrData.checked
    return Boolean(isLegacyUpgraded || selectedUpgradeAttributes.has(key))
  }

  // 获取未升级的属性数量
  const unupgradedCount = ATTRIBUTES.filter(attr => !isAttributeUpgraded(attr.key)).length

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

    const setUpgradeState = useSheetStore.getState().setUpgradeState
    setUpgradeState(checkKey, {
      checked: true,
      params: {
        attributes: selectedAttributes,
      },
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
              const isUpgraded = isAttributeUpgraded(key)
              const isSpellcasting = typeof attrData === "object" && attrData !== null && "spellcasting" in attrData && attrData.spellcasting
              const isSelected = selected[key]
              const isDisabled = isUpgraded || (selectedCount >= 2 && !isSelected)

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
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    {isSelected && (
                      <span className="font-medium text-blue-700">已选择</span>
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
