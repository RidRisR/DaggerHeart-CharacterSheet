"use client"

import type React from "react"
import { useState } from "react"
import { useSheetStore } from "@/lib/sheet-store"
import { ModifierFieldAnchor } from "@/components/modifiers/modifier-field-anchor"

export function HitPointsSection() {
  const { sheetData: formData, setSheetData, commitModifierTargetValue } = useSheetStore()
  const [maxDrafts, setMaxDrafts] = useState<Partial<Record<"hpMax" | "stressMax", string>>>({})
  const baseThresholds = formData.equipment.armorSlot.baseThresholds
  const level = Number(formData.level)
  const thresholdPlaceholder = (baseThreshold: number | null) => {
    if (baseThreshold === null || !Number.isFinite(level)) {
      return ""
    }
    return String(baseThreshold + level)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setSheetData((prev) => ({ ...prev, [name]: value }))
  }

  const commitTextTarget = (name: string, value: string) => {
    if (name === "minorThreshold" || name === "majorThreshold") {
      commitModifierTargetValue(name, value)
    }
  }

  const handleMaxChange = (field: "hp" | "stress", value: string, commit = false) => {
    const maxField = `${field}Max` as "hpMax" | "stressMax"

    if (commit) {
      if (/^\d+$/.test(value)) {
        const intValue = parseInt(value) || 0
        if (intValue <= 18) {
          commitModifierTargetValue(maxField, intValue)
        }
      }
      setMaxDrafts((prev) => {
        const next = { ...prev }
        delete next[maxField]
        return next
      })
      return
    }

    setMaxDrafts((prev) => ({ ...prev, [maxField]: value }))
  }

  const maxInputValue = (field: "hp" | "stress") => {
    const maxField = `${field}Max` as "hpMax" | "stressMax"
    return maxDrafts[maxField] ?? formData[maxField] ?? ""
  }

  // 增加上限
  const handleIncreaseMax = (field: "hp" | "stress") => {
    const maxField = `${field}Max` as "hpMax" | "stressMax"
    const currentMax = formData[maxField] || 6
    if (currentMax < 18) {
      handleMaxChange(field, String(currentMax + 1), true)
    }
  }

  // 减少上限
  const handleDecreaseMax = (field: "hp" | "stress") => {
    const maxField = `${field}Max` as "hpMax" | "stressMax"
    const currentMax = formData[maxField] || 6
    if (currentMax > 1) {
      handleMaxChange(field, String(currentMax - 1), true)
    }
  }

  const renderBoxes = (field: "hp" | "stress", max: number, total: number) => {
    const fieldArray = Array.isArray(formData[field]) ? (formData[field] as boolean[]) : Array(total).fill(false)

    const handleClick = (index: number) => {
      const newFieldData = [...fieldArray]
      const lastCheckedIndex = fieldArray.lastIndexOf(true)

      if (lastCheckedIndex === index) {
        // If clicking the last checked box, uncheck all
        for (let i = 0; i < newFieldData.length; i++) {
          newFieldData[i] = false
        }
      } else {
        // Otherwise, check up to the clicked box
        for (let i = 0; i < newFieldData.length; i++) {
          newFieldData[i] = i <= index
        }
      }
      setSheetData((prev) => ({ ...prev, [field]: newFieldData }))
    }

    return (
      <div className="flex gap-1 flex-wrap">
        {Array(total)
          .fill(0)
          .map((_, i) => {
            const isWithinMax = i < max
            const isChecked = fieldArray[i] || false

            return (
              <div
                key={`${String(field)}-${i}`}
                className={`w-4 h-4 border-2 ${isWithinMax ? "border-gray-800 cursor-pointer" : "border-gray-400 border-dashed"
                  } ${isChecked ? "bg-gray-800" : "bg-white"} ${i > 0 && i % 6 === 0 ? "ml-1" : ""
                  }`}
                onClick={() => {
                  if (isWithinMax) {
                    handleClick(i)
                  }
                }}
              />
            )
          })}
      </div>
    )
  }
  return (
    <div className="py-1 mb-1 print:mt-1.5">
      <h3 className="text-xs font-bold text-center mb-2.5">生命值与压力</h3>

      <div className="flex justify-between items-center gap-1">
        <div className="bg-gray-800 text-white text-[10px] p-1 text-center rounded-md flex-1">
          <div>轻度伤害</div>
          <div className="text-[8px] mt-0.5 text-gray-300">Mark 1 HP</div>
        </div>
        <input
          type="text"
          name="minorThreshold"
          value={formData.minorThreshold || ""}
          onChange={handleInputChange}
          onBlur={(event) => commitTextTarget(event.currentTarget.name, event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              commitTextTarget(event.currentTarget.name, event.currentTarget.value)
              event.currentTarget.blur()
            }
          }}
          placeholder={thresholdPlaceholder(baseThresholds.minor)}
          className="w-10 text-center text-m border border-gray-400 rounded mx-1 placeholder-gray-400 print-empty-hide"
        />
        <div className="bg-gray-800 text-white text-[10px] p-1 text-center rounded-md flex-1">
          <div className="flex items-center justify-center">
            重度伤害
            <ModifierFieldAnchor target="minorThreshold" label="重伤阈值" size="compact" />
          </div>
          <div className="text-[8px] mt-0.5 text-gray-300">Mark 2 HP</div>
        </div>
        <input
          type="text"
          name="majorThreshold"
          value={formData.majorThreshold || ""}
          onChange={handleInputChange}
          onBlur={(event) => commitTextTarget(event.currentTarget.name, event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              commitTextTarget(event.currentTarget.name, event.currentTarget.value)
              event.currentTarget.blur()
            }
          }}
          placeholder={thresholdPlaceholder(baseThresholds.major)}
          className="w-10 text-center text-m border border-gray-400 rounded mx-1 placeholder-gray-400 print-empty-hide"
        />
        <div className="bg-gray-800 text-white text-[10px] p-1 text-center rounded-md flex-1">
          <div className="flex items-center justify-center">
            严重伤害
            <ModifierFieldAnchor target="majorThreshold" label="严重阈值" size="compact" />
          </div>
          <div className="text-[8px] mt-0.5 text-gray-300">Mark 3 HP</div>
        </div>
      </div>

      <div className="mt-1 space-y-1">
        <div className="flex items-center justify-between group">
          <span className="font-bold mr-2 text-xs">
            生命
            <ModifierFieldAnchor target="hpMax" label="生命上限" size="compact" />
            {formData.cards?.[0]?.professionSpecial?.["起始生命"] && (
              <span className="text-[10px] text-gray-600 ml-1">
                (职业初始: {formData.cards?.[0]?.professionSpecial?.["起始生命"] ?? "未知"})
              </span>
            )}
          </span>
          <div className="flex items-center">
            {/* 渐进式显示的上限调整按钮 */}
            <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 print:hidden">
              <button
                onClick={() => handleDecreaseMax("hp")}
                disabled={(formData.hpMax || 6) <= 1}
                className="w-6 h-6 sm:w-5 sm:h-5 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-base sm:text-sm text-gray-400 sm:text-gray-800 transition-colors"
                title="减少HP上限"
              >
                −
              </button>
              <button
                onClick={() => handleIncreaseMax("hp")}
                disabled={(formData.hpMax || 6) >= 18}
                className="w-6 h-6 sm:w-5 sm:h-5 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-base sm:text-sm text-gray-400 sm:text-gray-800 transition-colors"
                title="增加HP上限"
              >
                ＋
              </button>
            </div>

            <span className="text-[9px] mr-1 print:hidden">最大值:</span> {/* 打印时隐藏 */}
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={maxInputValue("hp")}
              onChange={(e) => handleMaxChange("hp", e.target.value)}
              onBlur={(e) => handleMaxChange("hp", e.currentTarget.value, true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleMaxChange("hp", e.currentTarget.value, true)
                  e.currentTarget.blur()
                }
              }}
              onFocus={(e) => e.target.select()}
              placeholder="6"
              className="w-8 text-center border border-gray-400 rounded text-xs print:hidden" // 打印时隐藏
            />
          </div>
        </div>
        {renderBoxes("hp", Number(formData.hpMax || formData.cards?.[0]?.professionSpecial?.["起始生命"] || 6), 18)}

        <div className="flex items-center justify-between group">
          <span className="font-bold mr-2 text-xs">
            压力
            <ModifierFieldAnchor target="stressMax" label="压力上限" size="compact" />
          </span>
          <div className="flex items-center">
            {/* 渐进式显示的上限调整按钮 */}
            <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 print:hidden">
              <button
                onClick={() => handleDecreaseMax("stress")}
                disabled={(formData.stressMax || 6) <= 1}
                className="w-6 h-6 sm:w-5 sm:h-5 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-base sm:text-sm text-gray-400 sm:text-gray-800 transition-colors"
                title="减少压力上限"
              >
                −
              </button>
              <button
                onClick={() => handleIncreaseMax("stress")}
                disabled={(formData.stressMax || 6) >= 18}
                className="w-6 h-6 sm:w-5 sm:h-5 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-base sm:text-sm text-gray-400 sm:text-gray-800 transition-colors"
                title="增加压力上限"
              >
                ＋
              </button>
            </div>

            <span className="text-[9px] mr-1 print:hidden">最大值:</span> {/* 打印时隐藏 */}
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={maxInputValue("stress")}
              onChange={(e) => handleMaxChange("stress", e.target.value)}
              onBlur={(e) => handleMaxChange("stress", e.currentTarget.value, true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleMaxChange("stress", e.currentTarget.value, true)
                  e.currentTarget.blur()
                }
              }}
              onFocus={(e) => e.target.select()}
              placeholder="6"
              className="w-8 text-center border border-gray-400 rounded text-xs print:hidden" // 打印时隐藏
            />
          </div>
        </div>
        {renderBoxes("stress", Number(formData.stressMax || 6), 18)}
      </div>
    </div>
  )
}
