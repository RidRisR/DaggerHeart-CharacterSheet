"use client"

import { useSheetStore } from "@/lib/sheet-store";
import { useAutoResizeFont } from "@/hooks/use-auto-resize-font"

export function InventorySection() {
  const { sheetData: formData, setSheetData } = useSheetStore();
  
  const { getElementProps } = useAutoResizeFont({
    maxFontSize: 14,
    minFontSize: 10
  })

  // 确保 inventory 是一个包含5个元素的数组
  const safeInventory =
    Array.isArray(formData.inventory) && formData.inventory.length >= 5 ? formData.inventory : ["", "", "", "", ""]

  return (
    <div className="py-1">
      <h3 className="text-xs font-bold text-center mb-2">库存</h3>

      <div className="space-y-1">
        {safeInventory.slice(0, 5).map((item: string, i: number) => (
          <input
            key={`inventory-${i}`}
            type="text"
            value={item || ""}
            onChange={(e) => {
              const newInventory = [...safeInventory]
              newInventory[i] = e.target.value
              setSheetData((prev) => ({ ...prev, inventory: newInventory }))
            }}
            {...getElementProps(item || "", `inventory-${i}`)}
            className="w-full border-b border-gray-400 p-0.5 focus:outline-none print-empty-hide"
          />
        ))}
      </div>
    </div>
  )
}
