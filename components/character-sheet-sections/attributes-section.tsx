import type { FormData, AttributeValue } from "@/lib/form-data"

"use client"

interface AttributesSectionProps {
  formData: FormData
  handleAttributeValueChange: (attribute: keyof FormData, value: string) => void
  handleBooleanChange: (field: keyof FormData) => void
}

export function AttributesSection({
  formData,
  handleAttributeValueChange,
  handleBooleanChange,
}: AttributesSectionProps) {
  return (
    <div className="space-y-2">
      <div className="mb-2">
        <h3 className="text-xs font-bold text-center mb-1">属性</h3>
      </div>

      <div className="grid grid-cols-3 gap-x-2 gap-y-2">
        {[
          { name: "敏捷", key: "agility", skills: ["冲刺", "跳跃", "机动"] },
          { name: "力量", key: "strength", skills: ["举起", "猛击", "摔倒"] },
          { name: "灵巧", key: "finesse", skills: ["控制", "藏匿", "修理"] },
          { name: "本能", key: "instinct", skills: ["感知", "察觉", "导航"] },
          { name: "风度", key: "presence", skills: ["魅力", "表演", "欺骗"] },
          { name: "知识", key: "knowledge", skills: ["回忆", "分析", "理解"] },
        ].map((attr) => (
          <div key={attr.name} className="flex flex-col items-center">
            <div className="flex items-center justify-between w-full mb-0.5">
              <div className="text-[12px] font-bold">{attr.name}</div>
              {(() => {
                const attrValue = formData[attr.key as keyof typeof formData];
                function isAttributeValue(val: unknown): val is AttributeValue {
                  return val !== undefined && typeof val === "object" && val !== null && "checked" in val && "value" in val;
                }

                return (
                  <div
                    className={`w-3 h-3 rounded-full border border-gray-800 flex items-center justify-center cursor-pointer ${isAttributeValue(attrValue) && attrValue.checked ? "bg-gray-800" : "bg-white"
                      }`}
                    onClick={() => handleBooleanChange(attr.key as keyof FormData)}
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
                  onChange={(e) => handleAttributeValueChange(attr.key as keyof FormData, e.target.value)}
                  className="w-6 text-center bg-transparent border-b border-gray-400 focus:outline-none text-base font-bold print-empty-hide"
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
