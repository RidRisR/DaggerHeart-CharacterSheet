"use client"

import { useEffect, useState } from "react"
import { CircleHelp, Plus, Trash2 } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  EQUIPMENT_MODIFIER_TARGETS,
  EQUIPMENT_TARGET_LABELS,
} from "@/lib/equipment/contribution-utils"
import type { ArmorSlot, EquipmentModifierContribution, WeaponSlot } from "@/lib/equipment/types"
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
  return (
    <div className="grid grid-cols-3 gap-2 border-b border-gray-200 p-3 text-xs">
      <span className="rounded bg-gray-50 px-2 py-1.5 text-center">护甲值 {armorSlot.baseArmorMax ?? 0}</span>
      <span className="rounded bg-gray-50 px-2 py-1.5 text-center">重伤 {armorSlot.baseThresholds.minor ?? 0}</span>
      <span className="rounded bg-gray-50 px-2 py-1.5 text-center">严重 {armorSlot.baseThresholds.major ?? 0}</span>
    </div>
  )
}

export function EquipmentProviderAnchor({ slotRef, fallbackLabel, size = "default" }: EquipmentProviderAnchorProps) {
  const [open, setOpen] = useState(false)
  const sheetData = useSheetStore(state => state.sheetData)
  const addContribution = useSheetStore(state => state.addEquipmentModifierContribution)
  const slot = slotForRef(sheetData, slotRef)
  const label = slot.name || fallbackLabel
  const compact = size === "compact"
  const contributions = slot.modifierContributions as EquipmentModifierContribution[]

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
          className="w-[26rem] p-0 print:hidden"
        >
          <div className="max-h-[min(28rem,80vh)] overflow-y-auto">
            {isArmorSlot(slotRef, slot) && <ArmorSummary armorSlot={slot} />}
            <div className="space-y-2 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600">装备修正</span>
                <button
                  type="button"
                  aria-label="新增修正"
                  className="inline-flex h-7 items-center gap-1 rounded border border-gray-300 bg-white px-2 text-xs hover:bg-gray-50"
                  onClick={() => addContribution(slotRef)}
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
                      slotRef={slotRef}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </span>
  )
}
