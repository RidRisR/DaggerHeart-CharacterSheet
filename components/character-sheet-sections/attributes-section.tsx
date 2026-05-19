"use client"

import { useState } from "react"
import type { SheetData, AttributeValue } from "@/lib/sheet-data"
import { useSheetStore } from "@/lib/sheet-store";
import { ModifierFieldAnchor } from "@/components/modifiers/modifier-field-anchor"
import type { AttributeTargetId, ModifierTargetId, UserModifierContribution } from "@/lib/modifiers/types"
import {
  getAttributeAutoBaseId,
  shouldRemoveAttributeAutoBase,
} from "@/lib/modifiers/attribute-auto-base"

type AttributeKey = "agility" | "strength" | "finesse" | "instinct" | "presence" | "knowledge"

function isAttributeValue(val: unknown): val is AttributeValue {
  return val !== undefined && typeof val === "object" && val !== null && "checked" in val && "value" in val;
}

function attributeTarget(attribute: AttributeKey): AttributeTargetId {
  return `${attribute}.value` as AttributeTargetId
}

function userBaseEntriesForTarget(formData: SheetData, target: AttributeTargetId): UserModifierContribution[] {
  return (formData.userModifierContributions ?? [])
    .filter(contribution => contribution.definition.target === target && contribution.definition.kind === "base")
}

export function AttributesSection() {
  const {
    sheetData: formData,
    toggleAttributeChecked,
    setSheetData,
    setActiveModifierBase,
    removeUserModifierContribution,
    commitModifierTargetValue,
  } = useSheetStore();
  const [valueDrafts, setValueDrafts] = useState<Partial<Record<AttributeKey, string>>>({})

  const handleAttributeValueChange = (attribute: AttributeKey, value: string) => {
    setValueDrafts((drafts) => ({ ...drafts, [attribute]: value }))
  }

  const handleAttributeCommit = (attribute: AttributeKey) => {
    const target = attributeTarget(attribute)
    const attrValue = formData[attribute]
    const submittedValue = valueDrafts[attribute] ?? (isAttributeValue(attrValue) ? attrValue.value : "")
    const existingUserBases = userBaseEntriesForTarget(formData, target)

    if (shouldRemoveAttributeAutoBase({
      target,
      level: formData.level,
      submittedValue,
      existingUserBases,
    })) {
      const autoBaseId = getAttributeAutoBaseId(target)
      removeUserModifierContribution(autoBaseId)
      if (formData.modifierState?.targetStates?.[target]?.activeBaseId === autoBaseId) {
        setActiveModifierBase(target, undefined)
      }
    }

    commitModifierTargetValue(target, submittedValue)
    setValueDrafts((drafts) => {
      const next = { ...drafts }
      delete next[attribute]
      return next
    })
  }

  const handleAttributeKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, attribute: AttributeKey) => {
    if (event.key === "Enter") {
      handleAttributeCommit(attribute)
      event.currentTarget.blur()
    }
  }

  const handleBooleanChange = (field: keyof SheetData) => {
    toggleAttributeChecked(field)
  }

  const handleSpellcastingToggle = (attribute: keyof SheetData) => {
    setSheetData((prev) => {
      const currentAttribute = prev[attribute]
      if (typeof currentAttribute === "object" && currentAttribute !== null && "spellcasting" in currentAttribute) {
        return {
          ...prev,
          [attribute]: {
            ...currentAttribute,
            spellcasting: !currentAttribute.spellcasting,
          },
        }
      }
      return prev
    })
  }

  return (
    <div className="mt-2.5">
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
            <div className="flex items-center justify-between w-full bg-gray-800 text-white px-1 rounded-t-md py-0.5">
              <div className="flex items-center">
                <div className="text-[12px] font-bold">{attr.name}</div>
                <ModifierFieldAnchor target={`${attr.key}.value` as ModifierTargetId} label={attr.name} />
                {(() => {
                  const attrValue = formData[attr.key as keyof typeof formData];
                  const isSpellcasting = isAttributeValue(attrValue) && attrValue.spellcasting;

                  return (
                    <button
                      type="button"
                      onClick={() => handleSpellcastingToggle(attr.key as keyof SheetData)}
                      className={`ml-1 text-[14px] font-bold cursor-pointer transition-colors hover:scale-110 ${isSpellcasting ? "text-white" : "text-gray-600 print:hidden"
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
                const isUpgraded = isAttributeValue(attrValue) && attrValue.checked;

                return (
                  <div
                    data-testid={`attribute-upgrade-marker-${attr.key}`}
                    className={`w-2 h-2 rounded-full border border-white cursor-pointer ${isUpgraded ? "bg-gray-800" : "bg-white"
                      }`}
                    onClick={() => handleBooleanChange(attr.key as keyof SheetData)}
                  >
                  </div>
                );
              })()}
            </div>
            <div className="w-full h-14 relative">
              <div className="absolute inset-0 rounded-b-md bg-white border border-t-0 border-gray-800 flex flex-col items-center justify-center">
                <input
                  type="text"
                  value={(() => {
                    const attrValue = formData[attr.key as keyof typeof formData];
                    return valueDrafts[attr.key as AttributeKey] ?? (isAttributeValue(attrValue) ? attrValue.value : "");
                  })()}
                  onChange={(e) => handleAttributeValueChange(attr.key as AttributeKey, e.target.value)}
                  onBlur={() => handleAttributeCommit(attr.key as AttributeKey)}
                  onKeyDown={(event) => handleAttributeKeyDown(event, attr.key as AttributeKey)}
                  className="w-16 text-center bg-transparent border-b border-gray-400 focus:outline-none text-lg font-bold text-gray-800 print-empty-hide"
                />
                <div className="text-[8px] text-center text-gray-600">{attr.skills.join(", ")}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
