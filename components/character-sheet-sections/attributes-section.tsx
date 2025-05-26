import type { FormData } from "@/lib/form-data"

"use client"

interface AttributesSectionProps {
  formData: FormData
  handleAttributeValueChange: (attribute: keyof FormData, value: string) => void
  handleBooleanChange: (field: keyof FormData) => void
}

export function AttributesSection({
  formData,
  handleAttributeValueChange,
  handleBooleanChange,
}: AttributesSectionProps) {
  return (
    <div className="space-y-2">
      <div className=" mb-2">
        <h3 className="text-xs font-bold text-center mb-1">ATTRIBUTES</h3>
      </div>

      <div className="grid grid-cols-3 gap-x-2 gap-y-2">
        {[
          { name: "敏捷", key: "agility", skills: ["Sprint", "Leap", "Maneuver"] },
          { name: "力量", key: "strength", skills: ["Lift", "Smash", "Grapple"] },
          { name: "灵巧", key: "finesse", skills: ["Control", "Hide", "Tinker"] },
          { name: "本能", key: "instinct", skills: ["Perceive", "Sense", "Navigate"] },
          { name: "风度", key: "presence", skills: ["Charm", "Perform", "Deceive"] },
          { name: "知识", key: "knowledge", skills: ["Recall", "Analyze", "Comprehend"] },
        ].map((attr) => (
          <div key={attr.name} className="flex flex-col items-center">
            <div className="flex items-center justify-between w-full mb-0.5">
              <div className="text-[12px] font-bold">{attr.name}</div>
              <div
                className={`w-3 h-3 rounded-full border border-gray-800 flex items-center justify-center cursor-pointer ${
                  formData[attr.key].checked ? "bg-gray-800" : "bg-white"
                }`}
                onClick={() => handleBooleanChange(attr.key as keyof FormData)}
              >
                {formData[attr.key].checked && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
              </div>
            </div>
            <div className="w-full h-14 relative">
              <div className="absolute inset-0 rounded-md bg-gray-800 flex flex-col items-center justify-center text-white">
                <input
                  type="text"
                  value={formData[attr.key].value}
                  onChange={(e) => handleAttributeValueChange(attr.key as keyof FormData, e.target.value)}
                  className="w-6 text-center bg-transparent border-b border-gray-400 focus:outline-none text-base font-bold print-empty-hide"
                  placeholder="#"
                />
                <div className="text-[6px] text-center mt-0.5">{attr.skills.join(", ")}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
