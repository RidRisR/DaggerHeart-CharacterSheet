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

  // 检测是否有内容
  const hasContent = safeInventory.some(item => item.trim() !== "");

  const handleToggle = () => {
    if (hasContent) {
      // 有内容则清空
      const newInventory = ["", "", "", "", ""];
      setSheetData((prev) => ({ ...prev, inventory: newInventory }));
    } else {
      // 无内容则自动填充
      const newInventory = ["", "", "", "", ""];

      // 第一行：基本装备
      newInventory[0] = "一支火把、50 英尺长的绳索、基本补给品。";

      // 第二行：药水选择
      newInventory[1] = "一瓶次级治疗药水或一瓶次级耐力药水（二选一）";

      // 第三行：检查聚焦卡组第一张（职业卡）的起始物品
      const firstCard = formData.cards?.[0];
      if (firstCard && firstCard.type === "profession" && firstCard.professionSpecial?.["起始物品"]) {
        newInventory[2] = firstCard.professionSpecial["起始物品"];
      }

      setSheetData((prev) => ({ ...prev, inventory: newInventory }));
    }
  };

  return (
    <div className="py-1">
      <div className="flex items-center justify-center mb-2">
        <h3 className="text-xs font-bold">库存</h3>
        <button
          onClick={handleToggle}
          className="ml-2 w-6 h-6 flex items-center justify-center bg-white text-black rounded hover:bg-gray-100 transition-colors print:hidden"
          title={hasContent ? "清空库存" : "填充起始物品"}
        >
          <svg className="w-3 h-3 text-gray-500" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.498 1.5a.5.5 0 0 1 .707 0l2.295 2.295a.5.5 0 0 1 0 .707l-9.435 9.435a.5.5 0 0 1-.354.146H1.5a.5.5 0 0 1-.5-.5v-3.211a.5.5 0 0 1 .146-.354L10.582 1.5h.916zm-1 2.207-8.646 8.646v2.36h2.36l8.647-8.647L10.498 3.707z" />
          </svg>
        </button>
      </div>

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
