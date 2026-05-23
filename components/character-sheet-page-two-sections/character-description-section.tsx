"use client"

import type React from "react"
import { Textarea } from "@/components/ui/textarea"
import type { SheetData } from "@/lib/sheet-data"
import { useTranslation } from "@/lib/i18n"

interface CharacterDescriptionSectionProps {
  formData: SheetData
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
}

export function CharacterDescriptionSection({ formData, handleInputChange }: CharacterDescriptionSectionProps) {  // 基于高度限制的处理函数
  const t = useTranslation()

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target
    const newValue = e.target.value

    // 创建一个模拟的事件对象用于更新状态
    const createSyntheticEvent = (value: string) => {
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          value: value,
          name: e.target.name
        }
      } as React.ChangeEvent<HTMLTextAreaElement>
      return syntheticEvent
    }

    // 临时保存当前值
    const originalValue = textarea.value

    // 应用新值来测试
    textarea.value = newValue

    // 立即检查是否溢出
    const hasOverflow = textarea.scrollHeight > textarea.clientHeight + 5

    if (hasOverflow) {
    // 有溢出，恢复原值
      textarea.value = originalValue
      // 不调用 handleInputChange，保持原来的状态
    } else {
      // 没有溢出，更新 React 状态
      handleInputChange(createSyntheticEvent(newValue))
    }
  }
  return (
    <div className="grid grid-cols-3 gap-1 mt-2 p-1">
      <div className="col-span-1 flex flex-col">
        <h3 className="text-[12px] font-bold text-center mb-1">{t("sheet.characterSummary")}</h3>
        <div className="flex-grow relative">
          <Textarea
            name="characterBackground"
            value={formData.characterBackground}
            onChange={handleTextareaChange}
            className="!h-[220px] !text-[11px] !border-gray-400 !leading-[1.2] !resize-none !overflow-hidden print-empty-hide"
            placeholder={t("sheet.characterSummaryPlaceholder")}
          />
        </div>
      </div>

      <div className="col-span-1 flex flex-col">
        <h3 className="text-[12px] font-bold text-center mb-1">{t("sheet.characterTraits")}</h3>
        <div className="flex-grow relative">
          <Textarea
            name="characterAppearance"
            value={formData.characterAppearance}
            onChange={handleTextareaChange}
            className="!h-[220px] !text-[11px] !border-gray-400 !leading-[1.2] !resize-none !overflow-hidden print-empty-hide"
            placeholder={t("sheet.characterTraitsPlaceholder")}
          />
        </div>
      </div>

      <div className="col-span-1 flex flex-col">
        <h3 className="text-[12px] font-bold text-center mb-1">{t("sheet.adventureNotes")}</h3>
        <div className="flex-grow relative">
          <Textarea
            name="characterMotivation"
            value={formData.characterMotivation}
            onChange={handleTextareaChange}
            className="!h-[220px] !text-[11px] !border-gray-400 !leading-[1.2] !resize-none !overflow-hidden print-empty-hide"
            placeholder={t("sheet.adventureNotesPlaceholder")}
          />
        </div>
      </div>
    </div>
  )
}
