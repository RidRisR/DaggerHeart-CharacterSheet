"use client"

import { useState } from "react"
import { useSheetStore } from "@/lib/sheet-store";
import { useAutoResizeFont } from "@/hooks/use-auto-resize-font"
import { ExperienceProviderAnchor } from "@/components/modifiers/experience-provider-popover"
import type { ModifierTargetId } from "@/automation/core/types"

export function ExperienceSection() {
  const { sheetData: formData, updateExperience, commitModifierTargetValue } = useSheetStore();
  const [valueDrafts, setValueDrafts] = useState<Partial<Record<number, string>>>({})
  
  const { getElementProps } = useAutoResizeFont({
    maxFontSize: 14,
    minFontSize: 10,
  })

  const experienceTexts = formData.experience || ["", "", "", "", ""]
  const experienceValues = formData.experienceValues || ["", "", "", "", ""]

  const commitExperienceValue = (index: number, value: string) => {
    commitModifierTargetValue(`experienceValues.${index}` as ModifierTargetId, value)
    setValueDrafts((drafts) => {
      const next = { ...drafts }
      delete next[index]
      return next
    })
  }

  return (
    <div className="py-1">
      <h3 className="flex items-center justify-center gap-1 text-xs font-bold">
        <span>经历</span>
        <ExperienceProviderAnchor size="compact" />
      </h3>

      <div className="space-y-1.5 print:space-y-1">
        {experienceTexts.map((exp: string, i: number) => (
          <div key={`exp-${i}`} className="flex items-center">
            <input
              type="text"
              value={exp}
              onChange={(e) => {
                updateExperience(i, e.target.value)
              }}
              {...getElementProps(exp, `exp-${i}`, "flex-grow border-b border-gray-400 p-1 focus:outline-none print-empty-hide")}
            />
            <input
              type="text"
              value={valueDrafts[i] ?? experienceValues[i]}
              onChange={(e) => {
                const value = e.target.value
                setValueDrafts((drafts) => ({ ...drafts, [i]: value }))
              }}
              onBlur={(event) => commitExperienceValue(i, event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  commitExperienceValue(i, event.currentTarget.value)
                  event.currentTarget.blur()
                }
              }}
              {...getElementProps(valueDrafts[i] ?? experienceValues[i], `exp-value-${i}`, "w-8 border border-gray-400 rounded ml-1 text-center print-empty-hide")}
              placeholder="#"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
