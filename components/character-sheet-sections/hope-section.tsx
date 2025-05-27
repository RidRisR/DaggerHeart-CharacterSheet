"use client"
import type { FormData } from "@/lib/form-data"

interface HopeSectionProps {
  formData: FormData
  handleCheckboxChange: (field: keyof FormData, index: number) => void
}

export function HopeSection({ formData, handleCheckboxChange }: HopeSectionProps) {
  let hopeFeatureDescription = "";

  if (formData && formData.profession && formData.cards && Array.isArray(formData.cards)) {
    // Assuming StandardCard structure, but using 'any' to align with formData: any
    const professionCard = formData.cards.find(
      (card: any) => card.id === formData.profession && card.type === "profession"
    );

    if (professionCard &&
      professionCard.professionSpecial &&
      professionCard.professionSpecial["希望特性"]) {
      hopeFeatureDescription = String(professionCard.professionSpecial["希望特性"]);
    }
  }

  return (
    <div className="py-1 mb-2">
      <h3 className="text-xs font-bold text-center mb-1">希望</h3>
      <div className="text-[12px] text-center mb-1">花费一点希望使用经历或帮助队友</div>

      <div className="flex justify-center gap-2 mb-2">
        {formData.hope.map((checked: boolean, i: number) => (
          <div key={`hope-${i}`} className="relative" onClick={() => handleCheckboxChange("hope", i)}>
            <div className="w-5 h-5 border-2 border-gray-800 transform rotate-45 cursor-pointer"></div>
            {checked && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 bg-gray-800 transform rotate-45"></div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="text-center px-2">
        <p className="text-[12px] leading-tight">
          {hopeFeatureDescription}
        </p>
      </div>
    </div>
  );
}
