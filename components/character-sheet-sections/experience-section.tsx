"use client"

import type React from "react"

interface ExperienceSectionProps {
  formData: any
  setFormData: React.Dispatch<React.SetStateAction<any>>
}

export function ExperienceSection({ formData, setFormData }: ExperienceSectionProps) {
  return (
    <div className="py-1 mb-2">
      <h3 className="text-xs font-bold text-center mb-1">EXPERIENCE</h3>

      <div className="space-y-1">
        {formData.experience.map((exp: string, i: number) => (
          <div key={`exp-${i}`} className="flex items-center">
            <input
              type="text"
              value={exp}
              onChange={(e) => {
                const newExp = [...formData.experience]
                newExp[i] = e.target.value
                setFormData((prev: any) => ({ ...prev, experience: newExp }))
              }}
              className="flex-grow border-b border-gray-400 p-1 focus:outline-none text-sm print-empty-hide"
              placeholder="Experience description"
            />
            <input
              type="text"
              value={formData.experienceValues[i]}
              onChange={(e) => {
                const newValues = [...formData.experienceValues]
                newValues[i] = e.target.value
                setFormData((prev: any) => ({ ...prev, experienceValues: newValues }))
              }}
              className="w-8 border border-gray-400 rounded ml-1 text-center text-sm print-empty-hide"
              placeholder="#"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
