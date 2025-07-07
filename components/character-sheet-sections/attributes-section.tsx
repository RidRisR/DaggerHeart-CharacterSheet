import type { SheetData, AttributeValue } from "@/lib/sheet-data"

"use client"

interface AttributesSectionProps {
  formData: SheetData
  handleAttributeValueChange: (attribute: keyof SheetData, value: string) => void
  handleBooleanChange: (field: keyof SheetData) => void
  handleSpellcastingToggle: (attribute: keyof SheetData) => void
}

export function AttributesSection({
  formData,
  handleAttributeValueChange,
  handleBooleanChange,
  handleSpellcastingToggle,
}: AttributesSectionProps) {
  return (
    <div className="space-y-1">

      <div className="grid grid-cols-3 gap-x-2 gap-y-1">
        {[
          { name: "敏捷", key: "agility", skills: ["冲刺", "跳跃", "机动"] },
          { name: "力量", key: "strength", skills: ["举起", "猛击", "擒抱"] },
          { name: "灵巧", key: "finesse", skills: ["控制", "隐藏", "巧手"] },
          { name: "本能", key: "instinct", skills: ["感知", "察觉", "导航"] },
          { name: "风度", key: "presence", skills: ["魅力", "表演", "欺骗"] },
          { name: "知识", key: "knowledge", skills: ["回忆", "分析", "理解"] },
        ].map((attr) => (
          <div key={attr.name} className="flex flex-col items-center">
            <div className="flex items-center justify-between w-full mb-0.5">
              <div className="flex items-center">
                <div className="text-[12px] font-bold">{attr.name}</div>
                {(() => {
                  const attrValue = formData[attr.key as keyof typeof formData];
                  function isAttributeValue(val: unknown): val is AttributeValue {
                    return val !== undefined && typeof val === "object" && val !== null && "checked" in val && "value" in val;
                  }
                  const isSpellcasting = isAttributeValue(attrValue) && attrValue.spellcasting;

                  return (
                    <button
                      type="button"
                      onClick={() => handleSpellcastingToggle(attr.key as keyof SheetData)}
                      className={`ml-1 text-[14px] font-bold cursor-pointer transition-colors hover:scale-110 ${isSpellcasting ? "text-gray-800" : "text-gray-200"
                        }`}
                      title="施法属性标记"
                      aria-label="施法属性标记"
                    >
                      ✦
                    </button>
                  );
                })()}
              </div>
              {(() => {
                const attrValue = formData[attr.key as keyof typeof formData];
                function isAttributeValue(val: unknown): val is AttributeValue {
                  return val !== undefined && typeof val === "object" && val !== null && "checked" in val && "value" in val;
                }

                return (
                  <div
                    className={`w-3 h-3 rounded-full border border-gray-800 flex items-center justify-center cursor-pointer ${isAttributeValue(attrValue) && attrValue.checked ? "bg-gray-800" : "bg-white"
                      }`}
                    onClick={() => handleBooleanChange(attr.key as keyof SheetData)}
                  >
                    {isAttributeValue(attrValue) && attrValue.checked && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                  </div>
                );
              })()}
            </div>
            <div className="w-full h-14 relative">
              <div className="absolute inset-0 rounded-md bg-gray-800 flex flex-col items-center justify-center text-white">
                <input
                  type="text"
                  value={(() => {
                    const attrValue = formData[attr.key as keyof typeof formData];
                    function isAttributeValue(val: unknown): val is AttributeValue {
                      return val !== undefined && typeof val === "object" && val !== null && "checked" in val && "value" in val;
                    }
                    return isAttributeValue(attrValue) ? attrValue.value : "";
                  })()}
                  onChange={(e) => handleAttributeValueChange(attr.key as keyof SheetData, e.target.value)}
                  className="w-16 text-center bg-transparent border-b border-gray-400 focus:outline-none text-base font-bold print-empty-hide"
                  placeholder="#"
                />
                <div className="text-[10px] text-center mt-0.5">{attr.skills.join(", ")}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
