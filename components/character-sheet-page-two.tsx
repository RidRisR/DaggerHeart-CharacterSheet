"use client"

import type React from "react"
import { useState, useRef } from "react"
import { upgradeOptionsData } from "@/data/list/upgrade"
import type { FormData } from "@/lib/form-data"
import { createEmptyCard, type StandardCard } from "@/data/card/card-types"

// Import sections
import { CharacterDescriptionSection } from "@/components/character-sheet-page-two-sections/character-description-section"
import { CardDeckSection } from "@/components/character-sheet-page-two-sections/card-deck-section"
import { UpgradeSection } from "@/components/character-sheet-page-two-sections/upgrade-section"

interface CharacterSheetPageTwoProps {
  formData: FormData
  setFormData: React.Dispatch<React.SetStateAction<FormData>>
}

export default function CharacterSheetPageTwo({ formData, setFormData }: CharacterSheetPageTwoProps) {
  // 确保 formData 存在并有默认值
  const safeFormData = {
    ...formData,
    cards: Array.isArray(formData?.cards)
      ? formData.cards
      : Array(20).fill(0).map(() => createEmptyCard()),
    checkedUpgrades: formData?.checkedUpgrades || { tier1: {}, tier2: {}, tier3: {} },
    profession: formData?.profession || "",
    gold: Array.isArray(formData?.gold) ? formData.gold : Array(20).fill(false),
    experience: Array.isArray(formData?.experience) ? formData.experience : ["", "", "", "", ""],
    hope: Array.isArray(formData?.hope) ? formData.hope : Array(6).fill(false),
    hp: Array.isArray(formData?.hp) ? formData.hp : Array(18).fill(false),
    stress: Array.isArray(formData?.stress) ? formData.stress : Array(18).fill(false),
    armorBoxes: Array.isArray(formData?.armorBoxes) ? formData.armorBoxes : Array(12).fill(false),
    companionExperience: Array.isArray(formData?.companionExperience) ? formData.companionExperience : ["", "", "", "", ""],
    companionExperienceValue: Array.isArray(formData?.companionExperienceValue) ? formData.companionExperienceValue : ["", "", "", "", ""],
    companionStress: Array.isArray(formData?.companionStress) ? formData.companionStress : Array(6).fill(false),
    agility: formData?.agility || { checked: false, value: "" },
    strength: formData?.strength || { checked: false, value: "" },
    finesse: formData?.finesse || { checked: false, value: "" },
    instinct: formData?.instinct || { checked: false, value: "" },
    presence: formData?.presence || { checked: false, value: "" },
    knowledge: formData?.knowledge || { checked: false, value: "" },
    proficiency: Array.isArray(formData?.proficiency) ? formData.proficiency : Array(6).fill(false),
  }

  // 模态框状态
  const [importExportModalOpen, setImportExportModalOpen] = useState(false)

  // State for CardSelectionModal filters, lifted to this component
  const [cardModalActiveTab, setCardModalActiveTab] = useState<string>("");
  const [cardModalSearchTerm, setCardModalSearchTerm] = useState<string>("");
  const [cardModalSelectedClasses, setCardModalSelectedClasses] = useState<string[]>([]);
  const [cardModalSelectedLevels, setCardModalSelectedLevels] = useState<string[]>([]);

  // 使用ref来避免无限循环
  const isUpdatingRef = useRef(false)

  // Handle card changes
  const handleCardChange = (index: number, card: StandardCard) => {
    if (isUpdatingRef.current) return

    // 检查是否是空卡牌，如果是则不记录日志
    const isEmptyCard = !card || (!card.name && (!card.type || card.type === "unknown"))

    if (!isEmptyCard) {
      console.log(`[handleCardChange] 更新卡牌 #${index}:`, card)
    }

    isUpdatingRef.current = true

    setFormData((prev) => {
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
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Handle checkbox changes for upgrades
  const handleUpgradeCheck = (tier: string, index: number) => {
    setFormData((prev) => {
      const checkedUpgrades = prev.checkedUpgrades ?? { tier1: {}, tier2: {}, tier3: {} }
      const newCheckedUpgrades = {
        ...checkedUpgrades,
        tier1: checkedUpgrades.tier1 ?? {},
        tier2: checkedUpgrades.tier2 ?? {},
        tier3: checkedUpgrades.tier3 ?? {},
      }
      const tierKey = tier as keyof typeof newCheckedUpgrades
      const tierUpgrades = { ...newCheckedUpgrades[tierKey] }

      // Toggle the checked state
      tierUpgrades[index] = !tierUpgrades[index]

      newCheckedUpgrades[tierKey] = tierUpgrades
      return { ...prev, checkedUpgrades: newCheckedUpgrades }
    })
  }

  // Check if an upgrade is checked
  const isUpgradeChecked = (tier: string, index: number): boolean => {
    return !!safeFormData.checkedUpgrades?.[tier as keyof typeof safeFormData.checkedUpgrades]?.[index]
  }

  // 更新 getUpgradeOptions 函数以移除职业相关逻辑，并确保其与新的升级选项系统一致
  const getUpgradeOptions = (_profession: string, tier: number) => {
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
        <CardDeckSection
          formData={safeFormData}
          onCardChange={handleCardChange}
          cardModalActiveTab={cardModalActiveTab}
          setCardModalActiveTab={setCardModalActiveTab}
          cardModalSearchTerm={cardModalSearchTerm}
          setCardModalSearchTerm={setCardModalSearchTerm}
          cardModalSelectedClasses={cardModalSelectedClasses}
          setCardModalSelectedClasses={setCardModalSelectedClasses}
          cardModalSelectedLevels={cardModalSelectedLevels}
          setCardModalSelectedLevels={setCardModalSelectedLevels}
        />

          {/* Upgrade Section */}
        <div className="mt-3 grid grid-cols-3 gap-3 text-m">
            {/* Tier 1: Levels 2-4 */}
            <UpgradeSection
              tier={1}
            title="T2 等级 2-4"
            description="当你到达 2 级时：获得一项额外+2经2经历，熟练值标记+1。"
              formData={safeFormData}
              isUpgradeChecked={isUpgradeChecked}
              handleUpgradeCheck={handleUpgradeCheck}
              getUpgradeOptions={getUpgradeOptions}
            />

            {/* Tier 2: Levels 5-7 */}
            <UpgradeSection
              tier={2}
            title="T3 等级 5-7"
            description="当你到达 5 级时：获得一项额外+2经历，清除所有角色属性上的升级标记，熟练值标记+1。"
              formData={safeFormData}
              isUpgradeChecked={isUpgradeChecked}
              handleUpgradeCheck={handleUpgradeCheck}
              getUpgradeOptions={getUpgradeOptions}
            />

            {/* Tier 3: Levels 8-10 */}
            <UpgradeSection
              tier={3}
            title="T4 等级 8-10"
            description="当你到达 8 级时：获得一项额外+2经历，清除所有角色属性上的升级标记，熟练值标记+1。"
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
