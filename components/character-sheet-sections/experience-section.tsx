"use client"

import type React from "react"
import type { SheetData } from "@/lib/sheet-data"
import { useAutoResizeFont } from "@/hooks/use-auto-resize-font"

interface ExperienceSectionProps {
  formData: SheetData
  setFormData: React.Dispatch<React.SetStateAction<SheetData>>
}

export function ExperienceSection({ formData, setFormData }: ExperienceSectionProps) {
  const { getElementProps } = useAutoResizeFont({
    maxFontSize: 14,
    minFontSize: 10,
  })

  const experienceTexts = formData.experience || ["", "", "", "", ""]
  const experienceValues = formData.experienceValues || ["", "", "", "", ""]

  return (
    <div className="py-1">
      <h3 className="text-xs font-bold text-center">经历</h3>

      <div className="space-y-1">
        {experienceTexts.map((exp: string, i: number) => (
          <div key={`exp-${i}`} className="flex items-center">
            <input
              type="text"
              value={exp}
              onChange={(e) => {
                const newExp = [...experienceTexts]
                newExp[i] = e.target.value
                setFormData((prev) => ({ ...prev, experience: newExp }))
              }}
              {...getElementProps(exp, `exp-${i}`, "flex-grow border-b border-gray-400 p-1 focus:outline-none print-empty-hide")}
              placeholder="Experience description"
            />
            <input
              type="text"
              value={experienceValues[i]}
              onChange={(e) => {
                const newValues = [...experienceValues]
                newValues[i] = e.target.value
                setFormData((prev) => ({ ...prev, experienceValues: newValues }))
              }}
              {...getElementProps(experienceValues[i], `exp-value-${i}`, "w-8 border border-gray-400 rounded ml-1 text-center print-empty-hide")}
              placeholder="#"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
