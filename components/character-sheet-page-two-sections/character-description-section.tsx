"use client"

import type React from "react"
import { useRef } from "react"
import { Textarea } from "@/components/ui/textarea"
import type { SheetData } from "@/lib/sheet-data"

interface CharacterDescriptionSectionProps {
  formData: SheetData
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
}

export function CharacterDescriptionSection({ formData, handleInputChange }: CharacterDescriptionSectionProps) {
  // 基于高度限制的处理函数
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target
    const newValue = e.target.value

    // 暂时设置新值来检查是否会超出高度
    const originalValue = textarea.value
    textarea.value = newValue

    // 检查是否超出高度（scrollHeight > clientHeight 表示有滚动条）
    if (textarea.scrollHeight <= textarea.clientHeight) {
    // 没有超出高度，允许输入
      handleInputChange(e)
    } else {
      // 超出高度，恢复原值
      textarea.value = originalValue
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
            className="!h-[190px] !text-[12px] !border-gray-400 !leading-[1.25] !resize-none !overflow-hidden print-empty-hide"
            placeholder="写下对您的角色的概括性介绍，包括他们的过去、经历和个性特征。请注意，角色真正的性格和背景特质应当在游戏中体现出来，这里只是简短的概括和提示。"
          />
        </div>
      </div>

      <div className="col-span-1 flex flex-col">
        <h3 className="text-[12px] font-bold text-center mb-1">角色外形</h3>
        <div className="flex-grow relative">
          <Textarea
            name="characterAppearance"
            value={formData.characterAppearance}
            onChange={handleTextareaChange}
            className="!h-[190px] !text-[12px] !border-gray-400 !leading-[1.25] !resize-none !overflow-hidden print-empty-hide"
            placeholder="写下您的角色的性别、年龄、外貌和服装等外观特征。如果您的角色有什么特殊的形态或外观特征，也可以记录在这里。"
          />
        </div>
      </div>

      <div className="col-span-1 flex flex-col">
        <h3 className="text-[12px] font-bold text-center mb-1">角色动机</h3>
        <div className="flex-grow relative">
          <Textarea
            name="characterMotivation"
            value={formData.characterMotivation}
            onChange={handleTextareaChange}
            className="!h-[190px] !text-[12px] !border-gray-400 !leading-[1.25] !resize-none !overflow-hidden print-empty-hide"
            placeholder="写下您的角色的动机、目标和愿望。描述角色参与冒险的原因和主要驱动力。请注意，角色在游戏中随时可能成长和改变，随着故事发展，他们的动机可以发生转变。"
          />
        </div>
      </div>
    </div>
  )
}
