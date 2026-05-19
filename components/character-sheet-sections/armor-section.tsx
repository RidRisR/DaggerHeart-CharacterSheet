"use client"

import type React from "react"
import { useState } from "react"
import { useAutoResizeFont } from "@/hooks/use-auto-resize-font"
import { useSheetStore } from "@/lib/sheet-store"
import { EquipmentProviderAnchor } from "@/components/modifiers/equipment-provider-popover"
import { ContentEditableField } from "@/components/ui/content-editable-field"
import type { ArmorSlot } from "@/automation/equipment/types"

interface ArmorSectionProps {
  onOpenArmorModal: () => void;
}

type ThresholdSide = "minor" | "major"

export function ArmorSection({ onOpenArmorModal }: ArmorSectionProps) {
  const { sheetData: formData, setSheetData, updateArmorBaseThresholdSide, updateArmorBaseMax } = useSheetStore()
  const [isEditingName, setIsEditingName] = useState(false)
  const [baseArmorMaxDraft, setBaseArmorMaxDraft] = useState<string | null>(null)
  const [thresholdDrafts, setThresholdDrafts] = useState<Partial<Record<ThresholdSide, string>>>({})
  const armorSlot = formData.equipment.armorSlot
  const currentBaseArmorMaxValue = armorSlot.baseArmorMax === null ? "" : String(armorSlot.baseArmorMax)
  const baseArmorMaxValue = baseArmorMaxDraft ?? currentBaseArmorMaxValue

  const updateArmorSlot = (updates: Partial<ArmorSlot>) => {
    setSheetData((prev) => ({
      equipment: {
        ...prev.equipment,
        armorSlot: {
          ...prev.equipment.armorSlot,
          ...updates,
        },
      },
    }))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (name === 'feature') {
      updateArmorSlot({ feature: value })
    } else {
      setSheetData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const commitBaseArmorMax = () => {
    updateArmorBaseMax(baseArmorMaxValue)
    setBaseArmorMaxDraft(null)
  }

  const thresholdValue = (side: ThresholdSide) => {
    const draft = thresholdDrafts[side]
    if (draft !== undefined) return draft

    const value = armorSlot.baseThresholds[side]
    return value === null ? "" : String(value)
  }

  const commitThresholdSide = (side: ThresholdSide) => {
    updateArmorBaseThresholdSide(side, thresholdValue(side))
    setThresholdDrafts((drafts) => {
      const next = { ...drafts }
      delete next[side]
      return next
    })
  }

  const handleThresholdChange = (side: ThresholdSide, value: string) => {
    setThresholdDrafts((drafts) => ({ ...drafts, [side]: value }))
  }

  const handleCommitKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    commit: () => void,
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    }
  }

  const openArmorModal = () => {
    onOpenArmorModal()
  }

  const handleEditName = () => {
    setIsEditingName(true)
  }

  const handleNameChange = (value: string) => {
    updateArmorSlot({ name: value })
  }

  const handleNameSubmit = () => {
    setIsEditingName(false)
  }

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameSubmit()
    }
  }

  const { getElementProps } = useAutoResizeFont({
    maxFontSize: 14,
    minFontSize: 10
  })

  return (
    <div>
      <h4 className="flex items-center gap-1 font-bold text-[10px] bg-gray-800 text-white p-1 rounded-t-md">
        <span>护甲</span>
        <EquipmentProviderAnchor
          slotRef={{ type: "armor" }}
          fallbackLabel="护甲"
          size="compact"
        />
      </h4>
      <div className="grid grid-cols-10 gap-1 -mt-0.5">
        <div className="col-span-4">
          <label className="text-[8px] text-gray-600">名称</label>
          {isEditingName ? (
            <input
              type="text"
              value={armorSlot.name || ""}
              onChange={(e) => handleNameChange(e.target.value)}
              onKeyDown={handleNameKeyDown}
              onBlur={handleNameSubmit}
              className="w-full border border-gray-400 rounded p-0.5 h-6 text-sm px-2 bg-white focus:outline-none focus:border-blue-500"
              autoFocus
            />
          ) : (
            <div className="group flex w-full border border-gray-400 rounded h-6 bg-white overflow-hidden">
              <button
                type="button"
                onClick={openArmorModal}
                className="flex-1 text-sm text-left px-2 py-0.5 hover:bg-gray-50 focus:outline-none"
              >
                {armorSlot.name || <span className="print:hidden">选择护甲</span>}
              </button>
              <div className="w-px bg-gray-300 hidden group-hover:block"></div>
              <button
                type="button"
                onClick={handleEditName}
                className="w-8 hidden group-hover:flex items-center justify-center hover:bg-gray-50 focus:outline-none print:hidden"
                title="编辑名称"
              >
                <svg className="w-3 h-3 text-gray-500" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M11.498 1.5a.5.5 0 0 1 .707 0l2.295 2.295a.5.5 0 0 1 0 .707l-9.435 9.435a.5.5 0 0 1-.354.146H1.5a.5.5 0 0 1-.5-.5v-3.211a.5.5 0 0 1 .146-.354L10.582 1.5h.916zm-1 2.207-8.646 8.646v2.36h2.36l8.647-8.647L10.498 3.707z" />
                </svg>
              </button>
            </div>
          )}
        </div>
        <div className="col-span-3">
          <label className="text-[8px] text-gray-600">护甲值</label>
          <input
            type="text"
            name="baseArmorMax"
            value={baseArmorMaxValue}
            onChange={(e) => setBaseArmorMaxDraft(e.target.value)}
            onBlur={commitBaseArmorMax}
            onKeyDown={(e) => handleCommitKeyDown(e, commitBaseArmorMax)}
            {...getElementProps(baseArmorMaxValue, "armor-base-score")}
            className="w-full border-b border-gray-400 focus:outline-none print-empty-hide"
          />
        </div>
        <div className="col-span-3">
          <label className="text-[8px] text-gray-600">阈值</label>
          <div className="flex h-6 min-w-0 items-center gap-0.5">
            <input
              type="text"
              aria-label="重伤阈值"
              value={thresholdValue("minor")}
              onChange={(e) => handleThresholdChange("minor", e.target.value)}
              onBlur={() => commitThresholdSide("minor")}
              onKeyDown={(e) => handleCommitKeyDown(e, () => commitThresholdSide("minor"))}
              {...getElementProps(thresholdValue("minor"), "armor-minor-threshold")}
              className="w-0 min-w-0 flex-1 border-b border-gray-400 text-center focus:outline-none print-empty-hide"
            />
            <span className="flex-none text-[10px] leading-none text-gray-500">/</span>
            <input
              type="text"
              aria-label="严重阈值"
              value={thresholdValue("major")}
              onChange={(e) => handleThresholdChange("major", e.target.value)}
              onBlur={() => commitThresholdSide("major")}
              onKeyDown={(e) => handleCommitKeyDown(e, () => commitThresholdSide("major"))}
              {...getElementProps(thresholdValue("major"), "armor-major-threshold")}
              className="w-0 min-w-0 flex-1 border-b border-gray-400 text-center focus:outline-none print-empty-hide"
            />
          </div>
        </div>
      </div>
      <div className="mt-1">
        <ContentEditableField
          name="feature"
          value={armorSlot.feature || ""}
          onChange={handleInputChange}
          placeholder=""
          maxLines={2}
        />
      </div>
    </div>
  )
}
