"use client"

import type React from "react"
import { useState } from "react"
import { useAutoResizeFont } from "@/hooks/use-auto-resize-font"
import { useSheetStore } from "@/lib/sheet-store"
import { ContentEditableField } from "@/components/ui/content-editable-field"
import { showFadeNotification } from "@/components/ui/fade-notification"

interface InventoryWeaponSectionProps {
  index: number
  onOpenWeaponModal: (fieldName: string, slotType: "primary" | "secondary" | "inventory") => void;
}

export function InventoryWeaponSection({
  index,
  onOpenWeaponModal,
}: InventoryWeaponSectionProps) {
  const { sheetData: formData, setSheetData } = useSheetStore()
  const [isEditingName, setIsEditingName] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setSheetData((prev) => ({ ...prev, [name]: value }))
  }

  const openWeaponModal = (fieldName: string, slotType: "primary" | "secondary" | "inventory") => {
    onOpenWeaponModal(fieldName, slotType)
  }

  const handleEditName = () => {
    setIsEditingName(true)
  }

  const handleNameChange = (value: string) => {
    setSheetData((prev) => ({ ...prev, [nameField]: value }))
  }

  const handleNameSubmit = () => {
    setIsEditingName(false)
  }

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameSubmit()
    }
  }

  /**
   * 处理武器交换或取消勾选（向后兼容）
   *
   * 行为：
   * 1. 如果 checkbox 当前为 true（老存档遗留状态），点击后仅取消勾选
   * 2. 如果 checkbox 为 false（新存档或已取消的老存档），执行武器交换
   */
  const handleWeaponSwap = (field: string, targetType: 'primary' | 'secondary') => {
    const currentValue = (formData as any)[field]

    // 情况 1: 老存档遗留状态，用户点击取消勾选
    if (currentValue === true) {
      setSheetData((prev) => ({
        ...prev,
        [field]: false
      }))
      return
    }

    // 情况 2: 执行武器交换
    const targetPrefix = targetType === 'primary' ? 'primaryWeapon' : 'secondaryWeapon'
    const inventoryPrefix = `inventoryWeapon${index}`

    setSheetData((prev) => {
      const newData = { ...prev }

      // 交换所有武器字段
      const fieldsToSwap = ['Name', 'Trait', 'Damage', 'Feature']

      for (const fieldName of fieldsToSwap) {
        const inventoryField = `${inventoryPrefix}${fieldName}` as keyof typeof prev
        const targetField = `${targetPrefix}${fieldName}` as keyof typeof prev

        // 执行字段交换
        const temp = (prev as any)[inventoryField]
        ;(newData as any)[inventoryField] = (prev as any)[targetField]
        ;(newData as any)[targetField] = temp
      }

      // 保持 checkbox 为 false（不持久化选中状态）
      (newData as any)[field] = false

      return newData
    })

    // 显示交换成功通知
    showFadeNotification({
      message: targetType === 'primary' ? '已设为主手武器' : '已设为副手武器',
      type: 'success',
      duration: 2000
    })
  }

  const { getElementProps } = useAutoResizeFont({
    maxFontSize: 14,
    minFontSize: 10
  })

  const nameField = `inventoryWeapon${index}Name`
  const traitField = `inventoryWeapon${index}Trait`
  const damageField = `inventoryWeapon${index}Damage`
  const featureField = `inventoryWeapon${index}Feature`
  const primaryField = `inventoryWeapon${index}Primary`
  const secondaryField = `inventoryWeapon${index}Secondary`

  return (
    <div className="py-1 mb-1">

      <div className="grid grid-cols-10 gap-1">
        <div className="col-span-4">
          <label className="text-[8px] text-gray-600">名称</label>
          {isEditingName ? (
            <input
              type="text"
              value={(formData as any)[nameField] || ""}
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
                onClick={() => openWeaponModal(nameField, "inventory")}
                className="flex-1 text-sm text-left px-2 py-0.5 hover:bg-gray-50 focus:outline-none"
              >
                {(formData as any)[nameField] || <span className="print:hidden">选择武器</span>}
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
          <label className="text-[8px] text-gray-600">基本信息</label>
          <input
            type="text"
            name={traitField}
            value={(formData as any)[traitField]}
            onChange={handleInputChange}
            className="w-full border-b border-gray-400 focus:outline-none print-empty-hide text-sm"
          />
        </div>
        <div className="col-span-3">
          <label className="text-[8px] text-gray-600">伤害骰</label>
          <input
            type="text"
            name={damageField}
            value={(formData as any)[damageField]}
            onChange={handleInputChange}
            className="w-full border-b border-gray-400 focus:outline-none print-empty-hide text-sm"
          />
        </div>
      </div>

      <div className="mt-1">
        <ContentEditableField
          name={featureField}
          value={(formData as any)[featureField] || ""}
          onChange={handleInputChange}
          placeholder=""
          maxLines={2}
        />
      </div>

      <div className="flex gap-4 mt-1">
        <div className="flex items-center">
          <input
            type="checkbox"
            id={primaryField}
            checked={!!(formData as any)[primaryField]} // Ensure value is boolean
            onChange={() => handleWeaponSwap(primaryField, 'primary')}
            className="mr-1 h-3 w-3"
          />
          <label htmlFor={primaryField} className="text-[8px]">
            设为主手
          </label>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id={secondaryField}
            checked={!!(formData as any)[secondaryField]} // Ensure value is boolean
            onChange={() => handleWeaponSwap(secondaryField, 'secondary')}
            className="mr-1 h-3 w-3"
          />
          <label htmlFor={secondaryField} className="text-[8px]">
            设为副手
          </label>
        </div>
      </div>
    </div>
  )
}
