"use client"

import type React from "react"
import { Textarea } from "@/components/ui/textarea"
import type { SheetData } from "@/lib/sheet-data"

interface CharacterDescriptionSectionProps {
  formData: SheetData
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
}

export function CharacterDescriptionSection({ formData, handleInputChange }: CharacterDescriptionSectionProps) {  // 基于高度限制的处理函数
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
        <h3 className="text-[12px] font-bold text-center mb-1">角色简介</h3>
        <div className="flex-grow relative">
          <Textarea
            name="characterBackground"
            value={formData.characterBackground}
            onChange={handleTextareaChange}
            className="!h-[220px] !text-[11px] !border-gray-400 !leading-[1.2] !resize-none !overflow-hidden print-empty-hide"
            placeholder="写下对您的角色的概括性介绍，包括他们的过去、经历和个性特征。请注意，角色真正的性格和背景特质应当在游戏中体现出来，这里只是简短的概括和提示。"
          />
        </div>
      </div>

      <div className="col-span-1 flex flex-col">
        <h3 className="text-[12px] font-bold text-center mb-1">角色特质</h3>
        <div className="flex-grow relative">
          <Textarea
            name="characterAppearance"
            value={formData.characterAppearance}
            onChange={handleTextareaChange}
            className="!h-[220px] !text-[11px] !border-gray-400 !leading-[1.2] !resize-none !overflow-hidden print-empty-hide"
            placeholder="写下您的角色的性别、年龄、外貌和服装等外观特征。如果您的角色有什么特征或者与众不同之处，也可以记录在这里。"
          />
        </div>
      </div>

      <div className="col-span-1 flex flex-col">
        <h3 className="text-[12px] font-bold text-center mb-1">冒险笔记</h3>
        <div className="flex-grow relative">
          <Textarea
            name="characterMotivation"
            value={formData.characterMotivation}
            onChange={handleTextareaChange}
            className="!h-[220px] !text-[11px] !border-gray-400 !leading-[1.2] !resize-none !overflow-hidden print-empty-hide"
            placeholder="写下您角色经历的重大事件，值得注意的线索，目前的角色的状态和思考，或者其他值得记录的重要信息。"
          />
        </div>
      </div>
    </div>
  )
}
