"use client"

import type React from "react"
import { Textarea } from "@/components/ui/textarea"
import type { SheetData } from "@/lib/sheet-data"

interface CharacterDescriptionSectionProps {
  formData: SheetData
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
}

export function CharacterDescriptionSection({ formData, handleInputChange }: CharacterDescriptionSectionProps) {
  return (
    <div className="grid grid-cols-3 gap-1 mt-2 p-1">
      <div className="col-span-1 flex flex-col">
        <h3 className="text-[12px] font-bold text-center mb-1">角色简介</h3>
        <Textarea
          name="characterBackground"
          value={formData.characterBackground}
          onChange={handleInputChange}
          className="flex-grow min-h-[190px] text-[8px] border-gray-400 print-empty-hide"
          placeholder="写下对您的角色的概括性介绍，包括他们的过去、经历和个性特征。请注意，角色真正的性格和背景特质应当在游戏中体现出来，这里只是简短的概括和提示。"
        />
      </div>

      <div className="col-span-1 flex flex-col">
        <h3 className="text-[12px] font-bold text-center mb-1">角色外形</h3>
        <Textarea
          name="characterAppearance"
          value={formData.characterAppearance}
          onChange={handleInputChange}
          className="flex-grow min-h-[190px] text-[8px] border-gray-400 print-empty-hide"
          placeholder="写下您的角色的性别、年龄、外貌和服装等外观特征。如果您的角色有什么特殊的形态或外观特征，也可以记录在这里。"
        />
      </div>

      <div className="col-span-1 flex flex-col">
        <h3 className="text-[12px] font-bold text-center mb-1">角色动机</h3>
        <Textarea
          name="characterMotivation"
          value={formData.characterMotivation}
          onChange={handleInputChange}
          className="flex-grow min-h-[190px] text-[8px] border-gray-400 print-empty-hide"
          placeholder="写下您的角色的动机、目标和愿望。描述角色参与冒险的原因和主要驱动力。请注意，角色在游戏中随时可能成长和改变，随着故事发展，他们的动机可以发生转变。"
        />
      </div>
    </div>
  )
}
