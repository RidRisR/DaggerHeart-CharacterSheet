"use client"

import { useSheetStore } from "@/lib/sheet-store";
import { useAutoResizeFont } from "@/hooks/use-auto-resize-font"

export function ExperienceSection() {
  const { sheetData: formData, setSheetData } = useSheetStore();
  
  const { getElementProps } = useAutoResizeFont({
    maxFontSize: 14,
    minFontSize: 10,
  })

  const experienceTexts = formData.experience || ["", "", "", "", ""]
  const experienceValues = formData.experienceValues || ["", "", "", "", ""]

  return (
    <div className="py-1 mb-2">
      <h3 className="text-xs font-bold text-center mb-1">经历</h3>

      <div className="space-y-1">
        {experienceTexts.map((exp: string, i: number) => (
          <div key={`exp-${i}`} className="flex items-center">
            <input
              type="text"
              value={exp}
              onChange={(e) => {
                const newExp = [...experienceTexts]
                newExp[i] = e.target.value
                setSheetData((prev) => ({ ...prev, experience: newExp }))
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
                setSheetData((prev) => ({ ...prev, experienceValues: newValues }))
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
