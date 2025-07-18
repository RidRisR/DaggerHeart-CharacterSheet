"use client"

import { useSheetStore, useSheetGold } from "@/lib/sheet-store";

export function GoldSection() {
  const gold = useSheetGold()
  const { updateGold } = useSheetStore()

  const handleCheckboxChange = (index: number) => {
    updateGold(index)
  }

  return (
    <div className="py-1 mb-2">
      <h3 className="text-xs font-bold text-center mb-1">金币</h3>
      <div className="flex flex-row gap-6 items-end justify-center">
        {/* HANDFULS */}
        <div className="flex flex-col items-center">
          <div className="text-[9px] mb-1">把</div>
          <div className="flex flex-col gap-1">
            <div className="flex gap-2">
              {gold.slice(0, 5).map((checked: boolean, i: number) => (
                <div
                  key={`gold-handful-${i}`}
                  className={`w-4 h-4 border-2 border-gray-800 cursor-pointer rounded-full ${checked ? "bg-gray-800" : "bg-white"
                    }`}
                  onClick={() => handleCheckboxChange(i)}
                ></div>
              ))}
            </div>
            <div className="flex gap-2">
              {gold.slice(5, 10).map((checked: boolean, i: number) => (
                <div
                  key={`gold-handful-${i + 5}`}
                  className={`w-4 h-4 border-2 border-gray-800 cursor-pointer rounded-full ${checked ? "bg-gray-800" : "bg-white"
                    }`}
                  onClick={() => handleCheckboxChange(i + 5)}
                ></div>
              ))}
            </div>
          </div>
        </div>
        {/* BAGS */}
        <div className="flex flex-col items-center">
          <div className="text-[9px] mb-1">袋</div>
          <div className="flex flex-col gap-1">
            <div className="flex gap-2">
              {gold.slice(10, 15).map((checked: boolean, i: number) => (
                <div
                  key={`gold-bag-${i + 10}`}
                  className={`w-4 h-4 border-2 border-gray-800 cursor-pointer ${checked ? "bg-gray-800" : "bg-white"
                    }`}
                  onClick={() => handleCheckboxChange(i + 10)}
                ></div>
              ))}
            </div>
            <div className="flex gap-2">
              {gold.slice(15, 20).map((checked: boolean, i: number) => (
                <div
                  key={`gold-bag-${i + 15}`}
                  className={`w-4 h-4 border-2 border-gray-800 cursor-pointer ${checked ? "bg-gray-800" : "bg-white"
                    }`}
                  onClick={() => handleCheckboxChange(i + 15)}
                ></div>
              ))}
            </div>
          </div>
        </div>
        {/* CHEST */}
        <div className="flex flex-col items-center">
          <div className="text-[9px] mb-1">箱</div>
          <div
            className={`w-8 h-8 border-2 border-gray-800 cursor-pointer flex items-center justify-center ${gold[20] ? "bg-gray-800" : "bg-white"
              }`}
            onClick={() => handleCheckboxChange(20)}
          >
            {/* 可选：可加个小图标或文字 */}
          </div>
        </div>
      </div>
    </div>
  )
}
