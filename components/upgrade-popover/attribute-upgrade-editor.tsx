"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, X } from "lucide-react"
import { showFadeNotification } from "@/components/ui/fade-notification"
import {
  convertDisplayedAttributeToStoredBase,
  getDisplayedAttributeValue,
} from "@/lib/preset-equipment"
import type { AttributeValue } from "@/lib/sheet-data"
import { isValidNumber, parseToNumber } from "@/lib/number-utils"
import { useSheetStore } from "@/lib/sheet-store"

interface AttributeUpgradeEditorProps {
  onClose?: () => void
  checkKey: string
  optionIndex: number
  toggleUpgradeCheckbox: (checkKey: string, index: number, checked: boolean) => void
}

const ATTRIBUTES = [
  { key: "agility", name: "敏捷" },
  { key: "strength", name: "力量" },
  { key: "finesse", name: "灵巧" },
  { key: "instinct", name: "本能" },
  { key: "presence", name: "风度" },
  { key: "knowledge", name: "知识" },
] as const

type AttributeKey = (typeof ATTRIBUTES)[number]["key"]

type AttributeSelection = Record<AttributeKey, boolean>
type AttributeValues = Record<AttributeKey, string>

function createAttributeSnapshot(value?: AttributeValue): AttributeValue {
  return {
    value: value?.value ?? "",
    checked: value?.checked ?? false,
    ...(value?.spellcasting !== undefined && { spellcasting: value.spellcasting }),
  }
}

export function AttributeUpgradeEditor({
  onClose,
  checkKey,
  optionIndex,
  toggleUpgradeCheckbox,
}: AttributeUpgradeEditorProps) {
  const { sheetData } = useSheetStore()
  const updateAttribute = useSheetStore((state) => state.updateAttribute)
  const toggleAttributeChecked = useSheetStore((state) => state.toggleAttributeChecked)
  const saveAttributeUpgradeRecord = useSheetStore((state) => state.saveAttributeUpgradeRecord)

  const [beforeState] = useState<Record<AttributeKey, AttributeValue>>(() => ({
    agility: createAttributeSnapshot(sheetData.agility),
    strength: createAttributeSnapshot(sheetData.strength),
    finesse: createAttributeSnapshot(sheetData.finesse),
    instinct: createAttributeSnapshot(sheetData.instinct),
    presence: createAttributeSnapshot(sheetData.presence),
    knowledge: createAttributeSnapshot(sheetData.knowledge),
  }))

  const [originalValues] = useState<AttributeValues>(() => ({
    agility: getDisplayedAttributeValue(sheetData, "agility", sheetData.agility?.value),
    strength: getDisplayedAttributeValue(sheetData, "strength", sheetData.strength?.value),
    finesse: getDisplayedAttributeValue(sheetData, "finesse", sheetData.finesse?.value),
    instinct: getDisplayedAttributeValue(sheetData, "instinct", sheetData.instinct?.value),
    presence: getDisplayedAttributeValue(sheetData, "presence", sheetData.presence?.value),
    knowledge: getDisplayedAttributeValue(sheetData, "knowledge", sheetData.knowledge?.value),
  }))

  const [selected, setSelected] = useState<AttributeSelection>({
    agility: false,
    strength: false,
    finesse: false,
    instinct: false,
    presence: false,
    knowledge: false,
  })

  const [editingValues, setEditingValues] = useState<AttributeValues>({ ...originalValues })

  const selectedCount = Object.values(selected).filter(Boolean).length

  const unupgradedCount = ATTRIBUTES.filter(({ key }) => {
    const attrData = sheetData[key]
    return typeof attrData === "object" && attrData !== null && "checked" in attrData && !attrData.checked
  }).length

  const handleClose = () => {
    onClose?.()
  }

  const handleToggle = (key: AttributeKey) => {
    const attrData = sheetData[key]
    if (typeof attrData === "object" && attrData !== null && "checked" in attrData && attrData.checked) {
      return
    }

    if (selectedCount >= 2 && !selected[key]) {
      return
    }

    if (selected[key]) {
      setEditingValues((prev) => ({ ...prev, [key]: originalValues[key] }))
    }

    setSelected((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleValueChange = (key: AttributeKey, value: string) => {
    setEditingValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleIncrement = (key: AttributeKey) => {
    const currentValue = editingValues[key]
    if (!isValidNumber(currentValue)) {
      return
    }

    setEditingValues((prev) => ({
      ...prev,
      [key]: String(parseToNumber(currentValue, 0) + 1),
    }))
  }

  const handleDecrement = (key: AttributeKey) => {
    const currentValue = editingValues[key]
    if (!isValidNumber(currentValue)) {
      return
    }

    setEditingValues((prev) => ({
      ...prev,
      [key]: String(parseToNumber(currentValue, 0) - 1),
    }))
  }

  const handleApply = () => {
    const upgradedAttributes: string[] = []
    const afterState: Record<AttributeKey, AttributeValue> = {
      agility: { ...beforeState.agility },
      strength: { ...beforeState.strength },
      finesse: { ...beforeState.finesse },
      instinct: { ...beforeState.instinct },
      presence: { ...beforeState.presence },
      knowledge: { ...beforeState.knowledge },
    }

    Object.entries(selected).forEach(([rawKey, isSelected]) => {
      if (!isSelected) {
        return
      }

      const key = rawKey as AttributeKey
      const displayedValue = editingValues[key]
      const storedValue = convertDisplayedAttributeToStoredBase(sheetData, key, displayedValue)

      afterState[key] = {
        ...afterState[key],
        value: storedValue,
        checked: true,
      }

      const attrInfo = ATTRIBUTES.find((attribute) => attribute.key === key)
      if (attrInfo) {
        upgradedAttributes.push(attrInfo.name)
      }
    })

    Object.entries(selected).forEach(([rawKey, isSelected]) => {
      if (!isSelected) {
        return
      }

      const key = rawKey as AttributeKey
      updateAttribute(key, editingValues[key])
      toggleAttributeChecked(key)
    })

    saveAttributeUpgradeRecord(checkKey, beforeState, afterState)
    toggleUpgradeCheckbox(checkKey, optionIndex, true)

    if (upgradedAttributes.length > 0) {
      showFadeNotification({
        message: `已升级属性：${upgradedAttributes.join("、")}`,
        type: "success",
        position: "middle",
      })
    }

    onClose?.()
  }

  const canApply = selectedCount === 2

  return (
    <div className="w-48">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700">属性升级</span>
        <button
          onClick={handleClose}
          className="rounded p-0.5 transition-colors hover:bg-gray-100"
          title="关闭"
        >
          <X className="h-3 w-3 text-gray-500" />
        </button>
      </div>

      <div className="mb-2 text-xs text-gray-600">
        选择并修改两个未升级的属性 ({selectedCount}/2)
      </div>

      {unupgradedCount < 2 ? (
        <div className="rounded border border-gray-200 bg-gray-50 py-4 text-center text-xs text-gray-500">
          {unupgradedCount === 0 ? "所有属性均已升级" : "至少需要两个未升级属性"}
        </div>
      ) : (
        <>
          <div className="mb-3 space-y-1">
            {ATTRIBUTES.map(({ key, name }) => {
              const attrData = sheetData[key]
              const isUpgraded =
                typeof attrData === "object" && attrData !== null && "checked" in attrData && attrData.checked
              const isSpellcasting =
                typeof attrData === "object" && attrData !== null && "spellcasting" in attrData && attrData.spellcasting
              const isSelected = selected[key]
              const isDisabled = isUpgraded || (selectedCount >= 2 && !isSelected)
              const displayValue = editingValues[key]

              return (
                <div
                  key={key}
                  onClick={() => !isDisabled && handleToggle(key)}
                  className={[
                    "flex items-center justify-between rounded border px-2 py-1.5 transition-colors",
                    isDisabled
                      ? "cursor-not-allowed border-gray-200 bg-gray-100 opacity-60"
                      : "cursor-pointer border-gray-300 bg-white hover:bg-gray-50",
                    isSelected ? "!border-blue-500 !bg-blue-100 hover:!bg-blue-100" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-0.5 text-xs font-medium">
                      {name}
                      {isSpellcasting && <span className="text-[11px] font-bold text-gray-800">◆</span>}
                      {isUpgraded && <span className="ml-1 text-[10px] text-gray-500">(已升级)</span>}
                    </span>
                  </div>

                  <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
                    {isSelected && isValidNumber(displayValue) && (
                      <>
                        <button
                          onClick={() => handleDecrement(key)}
                          className="flex h-6 w-6 items-center justify-center rounded bg-blue-500 text-white transition-colors hover:bg-blue-600"
                          title="属性值 -1"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleIncrement(key)}
                          className="flex h-6 w-6 items-center justify-center rounded bg-blue-500 text-white transition-colors hover:bg-blue-600"
                          title="属性值 +1"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </button>
                      </>
                    )}

                    <input
                      type="text"
                      value={displayValue}
                      onChange={(event) => handleValueChange(key, event.target.value)}
                      disabled={!isSelected}
                      className={[
                        "w-16 rounded border px-1 py-0.5 text-center text-xs",
                        isSelected
                          ? "border-blue-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          : "border-gray-200 bg-gray-50 text-gray-600",
                      ].join(" ")}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <button
            onClick={handleApply}
            disabled={!canApply}
            className="w-full rounded bg-blue-500 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            应用升级
          </button>
        </>
      )}
    </div>
  )
}
