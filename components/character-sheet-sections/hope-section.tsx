"use client"

import { useSheetStore } from "@/lib/sheet-store";
import { StandardCard } from "@/card/card-types";
import ReactMarkdown from 'react-markdown';

export function HopeSection() {
  const { sheetData: formData, updateHope, setSheetData } = useSheetStore();

  // 获取当前值和最大值
  const currentHope = typeof formData.hope === 'number' ? formData.hope : 0
  const hopeMax = formData.hopeMax || 6

  const handleCheckboxChange = (index: number) => {
    updateHope(index);
  };

  // 增加希望上限
  const handleIncreaseMax = () => {
    if (hopeMax < 8) {
      setSheetData((prev) => ({ ...prev, hopeMax: hopeMax + 1 }))
    }
  }

  // 减少希望上限
  const handleDecreaseMax = () => {
    if (hopeMax > 1) {
      const newMax = hopeMax - 1
      setSheetData((prev) => {
        const newSheetData = { ...prev, hopeMax: newMax }

        // 如果当前希望值超过新的最大值，调整为最大值
        if (currentHope > newMax) {
          newSheetData.hope = newMax
        }

        return newSheetData
      })
    }
  }

  // 获取希望特性
  let hopeTrait = ""
  if (formData && formData.professionRef?.id && formData.cards && Array.isArray(formData.cards)) {
    const professionCard = formData.cards.find(
      (card: StandardCard | null) => card && card.id === formData.professionRef?.id && card.type === "profession"
    ) as StandardCard;
    if (professionCard && professionCard.professionSpecial && professionCard.professionSpecial["希望特性"]) {
      hopeTrait = String(professionCard.professionSpecial["希望特性"])
    }
  }

  return (
    <div className="py-1 mb-1">
      <div className="flex items-center justify-center gap-2 mb-2">
        <h3 className="text-xs font-bold">希望</h3>
      </div>

      <div className="text-[12px] text-center mb-1">花费一点希望使用经历或帮助队友</div>

      <div className="flex justify-center items-center gap-2 mb-2">
        {/* 减少按钮 - 固定位置，移动端加大 */}
        <button
          onClick={handleDecreaseMax}
          disabled={hopeMax <= 1}
          className="print:hidden w-6 h-6 sm:w-5 sm:h-5 flex items-center justify-center border border-gray-800 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-sm sm:text-xs font-bold"
          title="减少希望上限"
        >
          −
        </button>

        {/* 希望格子容器 - 固定宽度为8个格子的宽度，内容居中 */}
        <div className="flex gap-2 justify-center" style={{ width: 'calc(8 * 1.25rem + 7 * 0.5rem)' }}>
          {Array(Math.max(hopeMax, 6)).fill(0).map((_, i) => {
            const isWithinMax = i < hopeMax
            const isLit = i < currentHope
            const isDashed = !isWithinMax && i < 6 // 超出上限但在默认6个以内

            return (
              <div
                key={`hope-${i}`}
                className="relative"
                onClick={() => isWithinMax && handleCheckboxChange(i)}
              >
                <div
                  className={`w-5 h-5 border-2 transform rotate-45 ${
                    isDashed
                      ? 'border-dashed border-gray-400'
                      : 'border-gray-800 cursor-pointer'
                  }`}
                ></div>
                {isLit && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-3 h-3 bg-gray-800 transform rotate-45"></div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 增加按钮 - 固定位置，移动端加大 */}
        <button
          onClick={handleIncreaseMax}
          disabled={hopeMax >= 8}
          className="print:hidden w-6 h-6 sm:w-5 sm:h-5 flex items-center justify-center border border-gray-800 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-sm sm:text-xs font-bold"
          title="增加希望上限"
        >
          +
        </button>
      </div>

      <div className="text-center px-2">
        <div className="text-[12px] leading-tight min-h-[30px]">
          <ReactMarkdown>{hopeTrait}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
