"use client"

import { useSheetStore } from "@/lib/sheet-store"

export const UpgradeSlots = () => {
  const { sheetData, updateUpgradeSlot, updateUpgradeSlotText } = useSheetStore()
  const slots = sheetData.armorTemplate?.upgradeSlots || []

  return (
    <div className="space-y-1 px-3">
      {slots.map((slot, i) => (
        <div key={i} className="flex items-center gap-3">
          <div
            className={`w-4 h-4 border-2 mt-1 border-black rounded-full cursor-pointer transition-colors ${slot.checked ? 'bg-gray-800' : 'bg-white'}`}
            onClick={() => updateUpgradeSlot(i, !slot.checked, slot.text)}
            tabIndex={0}
            role="checkbox"
            aria-checked={slot.checked}
          ></div>
          <input
            type="text"
            value={slot.text}
            onChange={(e) => updateUpgradeSlotText(i, e.target.value)}
            className="flex-grow border-b border-gray-400 bg-transparent focus:outline-none focus:border-blue-500 transition-all duration-150 h-4 text-sm mt-1 print-empty-hide"
            placeholder="强化件名称"
          />
        </div>
      ))}
    </div>
  );
};