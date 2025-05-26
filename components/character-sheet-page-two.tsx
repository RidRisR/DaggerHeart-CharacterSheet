"use client"

import type React from "react"
import { useState, useRef } from "react"
import { upgradeOptionsData } from "@/data/game-data"

// Import sections
import { CharacterDescriptionSection } from "@/components/character-sheet-page-two-sections/character-description-section"
import { CardDeckSection } from "@/components/character-sheet-page-two-sections/card-deck-section"
import { UpgradeSection } from "@/components/character-sheet-page-two-sections/upgrade-section"

interface CharacterSheetPageTwoProps {
  formData: any
  setFormData: (data: any) => void
}

export default function CharacterSheetPageTwo({ formData, setFormData }: CharacterSheetPageTwoProps) {
  // 确保 formData 存在并有默认值
  const safeFormData = formData || {
    cards: [],
    checkedUpgrades: {
      tier1: {},
      tier2: {},
      tier3: {},
    },
    profession: "",
  }

  // 模态框状态
  const [importExportModalOpen, setImportExportModalOpen] = useState(false)

  // 使用ref来避免无限循环
  const isUpdatingRef = useRef(false)

  // Handle card changes
  const handleCardChange = (index: number, card: any) => {
    // 防止无限循环
    if (isUpdatingRef.current) return

    // 检查是否是空卡牌，如果是则不记录日志
    const isEmptyCard = !card || (!card.name && (!card.type || card.type === "unknown"))

    if (!isEmptyCard) {
      console.log(`[handleCardChange] 更新卡牌 #${index}:`, card)
    }

    isUpdatingRef.current = true

    setFormData((prev: any) => {
      const newCards = [...prev.cards]
      newCards[index] = card
      return { ...prev, cards: newCards }
    })

    // 重置标志
    setTimeout(() => {
      isUpdatingRef.current = false
    }, 0)
  }

  // Update form data when input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev: any) => ({ ...prev, [name]: value }))
  }

  // Handle checkbox changes for upgrades
  const handleUpgradeCheck = (tier: string, index: number) => {
    setFormData((prev: any) => {
      const newCheckedUpgrades = { ...prev.checkedUpgrades }
      const tierUpgrades = { ...newCheckedUpgrades[tier as keyof typeof newCheckedUpgrades] }

      // Toggle the checked state
      tierUpgrades[index] = !tierUpgrades[index]

      newCheckedUpgrades[tier as keyof typeof newCheckedUpgrades] = tierUpgrades
      return { ...prev, checkedUpgrades: newCheckedUpgrades }
    })
  }

  // Check if an upgrade is checked
  const isUpgradeChecked = (tier: string, index: number): boolean => {
    return !!safeFormData.checkedUpgrades?.[tier as keyof typeof safeFormData.checkedUpgrades]?.[index]
  }

  // 更新 getUpgradeOptions 函数以使用新的数据结构
  const getUpgradeOptions = (profession: string, tier: number) => {
    // 获取基础升级选项
    const baseUpgrades = [...upgradeOptionsData.baseUpgrades]

    // 添加特定等级升级选项
    const tierSpecificKey = `tier${tier}` as keyof typeof upgradeOptionsData.tierSpecificUpgrades
    const tierSpecificUpgrades = upgradeOptionsData.tierSpecificUpgrades[tierSpecificKey] || []

    return [...baseUpgrades, ...tierSpecificUpgrades]
  }
  return (
    <>
      {/* 固定位置的按钮 - 移除建卡指引按钮，因为已经移到父组件 */}
      {/* 固定位置的按钮已移至父组件 */}
      <div></div>

        <div
          className="a4-page p-1 bg-white text-gray-800 shadow-lg print:shadow-none rounded-md"
          style={{ width: "210mm", height: "297mm" }}
        >
          {/* Header - 调整职业名称显示框的大小 */}
          <div className="bg-gray-800 text-white p-5 flex items-center rounded-t-md">
            <div className="flex flex-col">
              <div className="text-[9px]">DAGGERHEART V20250520</div>
            </div>
          </div>

          {/* Character Description Section */}
          <CharacterDescriptionSection formData={safeFormData} handleInputChange={handleInputChange} />

          {/* Card Deck Section */}
          <CardDeckSection formData={safeFormData} onCardChange={handleCardChange} />

          {/* Upgrade Section */}
          <div className="mt-3 grid grid-cols-3 gap-3">
            {/* Tier 1: Levels 2-4 */}
            <UpgradeSection
              tier={1}
              title="LEVELS 2-4"
              description="At Level 2, take an additional Experience and increase your Proficiency by +1."
              formData={safeFormData}
              isUpgradeChecked={isUpgradeChecked}
              handleUpgradeCheck={handleUpgradeCheck}
              getUpgradeOptions={getUpgradeOptions}
            />

            {/* Tier 2: Levels 5-7 */}
            <UpgradeSection
              tier={2}
              title="LEVELS 5-7"
              description="At Level 5, take an additional Experience and clear all marks on Character Traits. Then increase your Proficiency by +1."
              formData={safeFormData}
              isUpgradeChecked={isUpgradeChecked}
              handleUpgradeCheck={handleUpgradeCheck}
              getUpgradeOptions={getUpgradeOptions}
            />

            {/* Tier 3: Levels 8-10 */}
            <UpgradeSection
              tier={3}
              title="LEVELS 8-10"
              description="At Level 8, take an additional Experience and clear all marks on Character Traits. Then increase your Proficiency by +1."
              formData={safeFormData}
              isUpgradeChecked={isUpgradeChecked}
              handleUpgradeCheck={handleUpgradeCheck}
              getUpgradeOptions={getUpgradeOptions}
          />
        </div>
      </div>

      {/* Modals */}
    </>
  )
}
