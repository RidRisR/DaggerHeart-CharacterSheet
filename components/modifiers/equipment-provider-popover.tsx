"use client"

import { useEffect, useState } from "react"
import { CircleHelp, Plus, Trash2 } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  EQUIPMENT_MODIFIER_TARGETS,
  EQUIPMENT_TARGET_LABELS,
  sanitizeEquipmentModifierContributions,
} from "@/automation/equipment/contribution-utils"
import type { ArmorSlot, EquipmentModifierContribution, WeaponSlot } from "@/automation/equipment/types"
import { parseNumberExpressionOr } from "@/lib/number-utils"
import { useSheetStore } from "@/lib/sheet-store"
import { cn } from "@/lib/utils"

export type EquipmentSlotRef =
  | { type: "weapon"; slot: "primary" | "secondary" }
  | { type: "inventoryWeapon"; index: 0 | 1 }
  | { type: "armor" }

interface EquipmentProviderAnchorProps {
  slotRef: EquipmentSlotRef
  fallbackLabel: string
  size?: "default" | "compact"
}

type EquipmentSlot = WeaponSlot | ArmorSlot

function slotForRef(sheetData: ReturnType<typeof useSheetStore.getState>["sheetData"], slotRef: EquipmentSlotRef): EquipmentSlot {
  if (slotRef.type === "armor") return sheetData.equipment.armorSlot
  if (slotRef.type === "inventoryWeapon") return sheetData.equipment.weaponSlots.inventory[slotRef.index]
  return sheetData.equipment.weaponSlots[slotRef.slot]
}

function isArmorSlot(slotRef: EquipmentSlotRef, slot: EquipmentSlot): slot is ArmorSlot {
  return slotRef.type === "armor"
}

function contributionLabel(contribution: EquipmentModifierContribution): string {
  return contribution.editable.label || "未命名修正"
}

function contributionSectionLabel(slotRef: EquipmentSlotRef): string {
  if (slotRef.type === "armor") return "护甲修正"
  if (slotRef.type === "inventoryWeapon") return slotRef.index === 0 ? "备用武器一修正" : "备用武器二修正"
  return slotRef.slot === "primary" ? "主武器修正" : "副武器修正"
}

function EditableContributionRow({
  contribution,
  slotRef,
}: {
  contribution: EquipmentModifierContribution
  slotRef: EquipmentSlotRef
}) {
  const updateContribution = useSheetStore(state => state.updateEquipmentModifierContribution)
  const changeTarget = useSheetStore(state => state.changeEquipmentModifierContributionTarget)
  const removeContribution = useSheetStore(state => state.removeEquipmentModifierContribution)
  const [label, setLabel] = useState(contribution.editable.label)
  const [value, setValue] = useState(String(contribution.editable.value))

  useEffect(() => {
    setLabel(contribution.editable.label)
  }, [contribution.editable.label])

  useEffect(() => {
    setValue(String(contribution.editable.value))
  }, [contribution.editable.value])

  const commitValue = () => {
    const parsedValue = parseNumberExpressionOr(value, 0)
    updateContribution(slotRef, contribution.id, {
      editable: { value: parsedValue },
    })
    setValue(String(parsedValue))
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_4rem_7rem_2rem] items-center gap-2">
      <input
        type="text"
        aria-label="修正名称"
        placeholder="未命名修正"
        value={label}
        className="h-8 min-w-0 rounded border border-gray-300 bg-white px-2 text-xs"
        onChange={event => {
          const nextLabel = event.target.value
          setLabel(nextLabel)
          updateContribution(slotRef, contribution.id, {
            editable: { label: nextLabel },
          })
        }}
      />
      <input
        type="text"
        aria-label="修正数值"
        value={value}
        className="h-8 w-full rounded border border-gray-300 bg-white px-2 text-right text-xs font-semibold"
        onChange={event => setValue(event.target.value)}
        onBlur={commitValue}
        onKeyDown={event => {
          if (event.key === "Enter") {
            commitValue()
            event.currentTarget.blur()
          }
        }}
      />
      <select
        aria-label="修正目标"
        value={contribution.definition.target}
        className="h-8 min-w-0 rounded border border-gray-300 bg-white px-2 text-xs"
        onChange={event => {
          changeTarget(slotRef, contribution.id, event.target.value as EquipmentModifierContribution["definition"]["target"])
        }}
      >
        {EQUIPMENT_MODIFIER_TARGETS.map(target => (
          <option key={target} value={target}>
            {EQUIPMENT_TARGET_LABELS[target]}
          </option>
        ))}
      </select>
      <button
        type="button"
        aria-label={`删除${contributionLabel(contribution)}`}
        className="flex h-8 w-8 items-center justify-center rounded border border-red-200 text-red-600 hover:bg-red-50"
        onClick={() => removeContribution(slotRef, contribution.id)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function ArmorSummary({ armorSlot }: { armorSlot: ArmorSlot }) {
  const armorMax = armorSlot.baseArmorMax ?? "未知"
  const minorThreshold = armorSlot.baseThresholds.minor ?? "未知"
  const majorThreshold = armorSlot.baseThresholds.major ?? "未知"

  return (
    <div className="grid grid-cols-3 gap-2 border-b border-slate-200 p-3 text-xs">
      <span className="rounded border border-slate-200 bg-white px-2 py-1.5 text-center">护甲值 {armorMax}</span>
      <span className="rounded border border-slate-200 bg-white px-2 py-1.5 text-center">重伤 {minorThreshold}</span>
      <span className="rounded border border-slate-200 bg-white px-2 py-1.5 text-center">严重 {majorThreshold}</span>
    </div>
  )
}

export function EquipmentProviderAnchor({ slotRef, fallbackLabel, size = "default" }: EquipmentProviderAnchorProps) {
  const [open, setOpen] = useState(false)
  const [selectedInventoryIndex, setSelectedInventoryIndex] = useState<0 | 1>(
    slotRef.type === "inventoryWeapon" ? slotRef.index : 0,
  )
  const sheetData = useSheetStore(state => state.sheetData)
  const addContribution = useSheetStore(state => state.addEquipmentModifierContribution)
  const isInventoryWeapon = slotRef.type === "inventoryWeapon"
  const effectiveSlotRef: EquipmentSlotRef = isInventoryWeapon
    ? { type: "inventoryWeapon", index: selectedInventoryIndex }
    : slotRef
  const slot = slotForRef(sheetData, effectiveSlotRef)
  const labelFallback = isInventoryWeapon ? `备用武器 ${selectedInventoryIndex + 1}` : fallbackLabel
  const label = slot.name || labelFallback
  const compact = size === "compact"
  const contributions = sanitizeEquipmentModifierContributions(slot.modifierContributions)

  useEffect(() => {
    if (open && slotRef.type === "inventoryWeapon") {
      setSelectedInventoryIndex(slotRef.index)
    }
  }, [open, slotRef])

  return (
    <span className={cn("inline-flex print:hidden", compact && "align-middle")}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`查看${label}来源`}
            className={cn(
              "inline-flex items-center justify-center rounded text-current opacity-70 transition-opacity hover:opacity-100",
              compact ? "h-3.5 w-3.5" : "h-5 w-5",
            )}
          >
            <CircleHelp className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          aria-label={`${label}来源`}
          side="bottom"
          align="end"
          sideOffset={4}
          collisionPadding={8}
          className={cn(
            "border-slate-300 bg-slate-50 p-0 shadow-xl print:hidden",
            isInventoryWeapon ? "w-[28rem]" : "w-[26rem]",
          )}
        >
          <div className={cn("max-h-[min(28rem,80vh)]", isInventoryWeapon ? "flex" : "overflow-y-auto")}>
            <div className="min-w-0 flex-1 overflow-y-auto">
              {isArmorSlot(effectiveSlotRef, slot) && <ArmorSummary armorSlot={slot} />}
              <div className="space-y-2 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-600">{contributionSectionLabel(effectiveSlotRef)}</span>
                  <button
                    type="button"
                    aria-label="新增修正"
                    className="inline-flex h-7 items-center gap-1 rounded border border-slate-300 bg-white px-2 text-xs hover:bg-slate-100"
                    onClick={() => addContribution(effectiveSlotRef)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    新增修正
                  </button>
                </div>
                {contributions.length === 0 ? (
                  <p className="py-3 text-center text-xs text-gray-500">暂无修正</p>
                ) : (
                  <div className="space-y-2">
                    {contributions.map(contribution => (
                      <EditableContributionRow
                        key={contribution.id}
                        contribution={contribution}
                        slotRef={effectiveSlotRef}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
            {isInventoryWeapon && (
              <div
                role="tablist"
                aria-label="备用武器槽位"
                className="flex w-9 shrink-0 self-stretch flex-col gap-1 border-l border-slate-200 bg-slate-100 p-1"
              >
                {[0, 1].map(index => (
                  <button
                    key={index}
                    type="button"
                    role="tab"
                    aria-label={`备用武器 ${index + 1}`}
                    aria-selected={selectedInventoryIndex === index}
                    className={cn(
                      "flex min-h-0 flex-1 items-center justify-center rounded text-xs font-semibold transition-colors",
                      selectedInventoryIndex === index
                        ? "bg-gray-800 text-white"
                        : "bg-white text-gray-700 hover:bg-slate-50",
                    )}
                    onClick={() => setSelectedInventoryIndex(index as 0 | 1)}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </span>
  )
}
