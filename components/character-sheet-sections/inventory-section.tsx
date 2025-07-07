"use client"

import type React from "react"
import type { SheetData } from "@/lib/sheet-data"
import { useAutoResizeFont } from "@/hooks/use-auto-resize-font"

interface InventorySectionProps {
  formData: SheetData
  setFormData: React.Dispatch<React.SetStateAction<SheetData>>
}

export function InventorySection({ formData, setFormData }: InventorySectionProps) {
  const { getElementProps } = useAutoResizeFont({
    maxFontSize: 14,
    minFontSize: 10
  })

  // 确保 inventory 是一个包含5个元素的数组
  const safeInventory =
    Array.isArray(formData.inventory) && formData.inventory.length >= 5 ? formData.inventory : ["", "", "", "", ""]

  return (
    <div className="py-1 mb-2">
      <h3 className="text-xs font-bold text-center">库存</h3>

      <div className="space-y-0.5">
        {safeInventory.slice(0, 5).map((item: string, i: number) => (
          <input
            key={`inventory-${i}`}
            type="text"
            value={item || ""}
            onChange={(e) => {
              const newInventory = [...safeInventory]
              newInventory[i] = e.target.value
              setFormData((prev) => ({ ...prev, inventory: newInventory }))
            }}
            {...getElementProps(item || "", `inventory-${i}`)}
            className="w-full border-b border-gray-400 p-0.5 focus:outline-none print-empty-hide"
          />
        ))}
      </div>
    </div>
  )
}
