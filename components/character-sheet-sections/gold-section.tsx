"use client"

interface GoldSectionProps {
  formData: any
  handleCheckboxChange: (field: string, index: number) => void
}

export function GoldSection({ formData, handleCheckboxChange }: GoldSectionProps) {
  return (
    <div className="py-1 mb-2">
      <h3 className="text-xs font-bold text-center mb-1">GOLD</h3>

      <div className="flex justify-between">
        <div>
          <div className="text-[9px] mb-1">HANDFULS</div>
          <div className="flex gap-1 flex-wrap">
            {formData.gold.slice(0, 10).map((checked: boolean, i: number) => (
              <div
                key={`gold-${i}`}
                className={`w-4 h-4 rounded-full border-2 border-gray-800 cursor-pointer ${
                  checked ? "bg-gray-800" : "bg-white"
                }`}
                onClick={() => handleCheckboxChange("gold", i)}
              ></div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[9px] mb-1">BAGS</div>
          <div className="flex gap-1 flex-wrap">
            {formData.gold.slice(10, 20).map((checked: boolean, i: number) => (
              <div
                key={`gold-bag-${i}`}
                className={`w-4 h-4 border-2 border-gray-800 cursor-pointer ${checked ? "bg-gray-800" : "bg-white"}`}
                onClick={() => handleCheckboxChange("gold", i + 10)}
              ></div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[9px] mb-1">CHEST</div>
          <div className="w-6 h-6 border-2 border-gray-800"></div>
        </div>
      </div>
    </div>
  )
}
