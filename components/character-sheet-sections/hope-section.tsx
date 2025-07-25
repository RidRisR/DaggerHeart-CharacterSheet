"use client"

import { useSheetStore } from "@/lib/sheet-store";
import { StandardCard } from "@/card/card-types";
import ReactMarkdown from 'react-markdown';

export function HopeSection() {
  const { sheetData: formData, updateHope } = useSheetStore();
  
  const handleCheckboxChange = (index: number) => {
    updateHope(index);
  };

  let hopeTrait = ""
  // Ensure formData, profession, and cards are defined and cards is an array
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
      <h3 className="text-xs font-bold text-center mb-2">希望</h3>
      <div className="text-[12px] text-center mb-1">花费一点希望使用经历或帮助队友</div>

      <div className="flex justify-center gap-2 mb-2">
        {formData.hope.map((checked: boolean, i: number) => (
          <div key={`hope-${i}`} className="relative" onClick={() => handleCheckboxChange(i)}>
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
        <div className="text-[12px] leading-tight min-h-[2.5em]">
          <ReactMarkdown>{hopeTrait}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
