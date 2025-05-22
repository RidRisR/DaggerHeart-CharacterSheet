"use client"

interface HopeSectionProps {
  formData: any
  handleCheckboxChange: (field: string, index: number) => void
}

export function HopeSection({ formData, handleCheckboxChange }: HopeSectionProps) {
  return (
    <div className="py-1 mb-2">
      <h3 className="text-sm font-bold text-center mb-1">HOPE</h3>
      <div className="text-[10px] text-center mb-1">Spend a Hope to use an experience or help an ally.</div>

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
        <p className="text-[10px] leading-tight">
          Spend three Hope to reroll any number of your damage dice on an attack.
        </p>
      </div>
    </div>
  )
}
