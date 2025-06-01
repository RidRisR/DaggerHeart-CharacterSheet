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
    <div className="grid grid-cols-3 gap-3 mt-2 p-1">
      <div className="col-span-1 flex flex-col">
        <h3 className="text-xs font-bold text-center mb-1">CHARACTER BACKGROUND</h3>
        <p className="text-[9px] text-center mb-1 print-hide-empty">在这里写下角色的简介和背景故事</p>
        <Textarea
          name="characterBackground"
          value={formData.characterBackground}
          onChange={handleInputChange}
          className="flex-grow min-h-[140px] text-xs border-gray-400 print-empty-hide"
          placeholder="Write your character's background story here..."
        />
      </div>

      <div className="col-span-1 flex flex-col">
        <h3 className="text-xs font-bold text-center mb-1">CHARACTER APPEARANCE</h3>
        <p className="text-[9px] text-center mb-1 print-hide-empty">在这里写下角色的性别，年龄，外貌衣着</p>
        <Textarea
          name="characterAppearance"
          value={formData.characterAppearance}
          onChange={handleInputChange}
          className="flex-grow min-h-[140px] text-xs border-gray-400 print-empty-hide"
          placeholder="Describe your character's gender, age, appearance, and clothing..."
        />
      </div>

      <div className="col-span-1 flex flex-col">
        <h3 className="text-xs font-bold text-center mb-1">CHARACTER MOTIVATION</h3>
        <p className="text-[9px] text-center mb-1 print-hide-empty">在这里写下角色加入这场冒险的原因，与队友的联系</p>
        <Textarea
          name="characterMotivation"
          value={formData.characterMotivation}
          onChange={handleInputChange}
          className="flex-grow min-h-[140px] text-xs border-gray-400 print-empty-hide"
          placeholder="Explain why your character joined this adventure and their connections to other party members..."
        />
      </div>
    </div>
  )
}
