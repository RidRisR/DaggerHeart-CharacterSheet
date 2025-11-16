"use client"

import type React from "react"
import { useState, useRef } from "react"
import { upgradeOptionsData } from "@/data/list/upgrade"
import { useSheetStore, useSafeSheetData } from "@/lib/sheet-store";
import { createEmptyCard, isEmptyCard, type StandardCard } from "@/card/card-types"
import { showFadeNotification } from "@/components/ui/fade-notification"
import { parseToNumber } from "@/lib/number-utils"

// Import sections
import { CharacterDescriptionSection } from "@/components/character-sheet-page-two-sections/character-description-section"
import { CardDeckSection } from "@/components/character-sheet-page-two-sections/card-deck-section"
import { UpgradeSection } from "@/components/character-sheet-page-two-sections/upgrade-section"
import { PageHeader } from "@/components/page-header"
import { CardSelectionModal } from "@/components/modals/card-selection-modal"

export default function CharacterSheetPageTwo() {
  const { setSheetData: setFormData } = useSheetStore();
  const safeFormData = useSafeSheetData();
  const updateHPMax = useSheetStore(state => state.updateHPMax);
  const updateStressMax = useSheetStore(state => state.updateStressMax);

  // State for CardSelectionModal filters, lifted to this component
  const [cardModalActiveTab, setCardModalActiveTab] = useState<string>("");
  const [cardModalSearchTerm, setCardModalSearchTerm] = useState<string>("");
  const [cardModalSelectedClasses, setCardModalSelectedClasses] = useState<string[]>([]);
  const [cardModalSelectedLevels, setCardModalSelectedLevels] = useState<string[]>([]);

  // State for upgrade domain card modal
  const [upgradeDomainModalOpen, setUpgradeDomainModalOpen] = useState(false);
  const [upgradeDomainCardIndex, setUpgradeDomainCardIndex] = useState<number>(-1);

  // State for upgrade subclass card modal
  const [upgradeSubclassModalOpen, setUpgradeSubclassModalOpen] = useState(false);
  const [upgradeSubclassCardIndex, setUpgradeSubclassCardIndex] = useState<number>(-1);
  const [upgradeSubclassProfession, setUpgradeSubclassProfession] = useState<string | undefined>(undefined);

  // 使用ref来避免无限循环
  const isUpdatingRef = useRef(false)

  // Handle card changes
  const handleCardChange = (index: number, card: StandardCard) => {
    if (isUpdatingRef.current) return

    // 检查是否是空卡牌，如果是则不记录日志
    const isEmptyCard = !card || (!card.name && (!card.type || card.type === "unknown"))

    if (!isEmptyCard) {
      console.log(`[handleCardChange] 更新聚焦卡牌 #${index}:`, card)
    }

    isUpdatingRef.current = true

    setFormData((prev) => {
      const newCards = [...(prev.cards || [])]
      newCards[index] = card
      return { ...prev, cards: newCards }
    })

    // 重置标志
    setTimeout(() => {
      isUpdatingRef.current = false
    }, 0)
  }

  // Handle inventory card changes
  const handleInventoryCardChange = (index: number, card: StandardCard) => {
    if (isUpdatingRef.current) return

    // 检查是否是空卡牌，如果是则不记录日志
    const isEmptyCard = !card || (!card.name && (!card.type || card.type === "unknown"))

    if (!isEmptyCard) {
      console.log(`[handleInventoryCardChange] 更新库存卡牌 #${index}:`, card)
    }

    isUpdatingRef.current = true

    setFormData((prev) => {
      const newInventoryCards = [...(prev.inventory_cards || Array(20).fill(0).map(() => createEmptyCard()))]
      newInventoryCards[index] = card
      return { ...prev, inventory_cards: newInventoryCards }
    })

    // 重置标志
    setTimeout(() => {
      isUpdatingRef.current = false
    }, 0)
  }

  // 已移除聚焦卡牌变更处理函数 - 功能由双卡组系统取代

  // Update form data when input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // 纯粹的状态切换函数：只负责设置复选框状态，无业务逻辑
  const toggleUpgradeCheckbox = (checkKey: string, index: number, checked: boolean) => {
    setFormData((prev) => {
      const checkedUpgrades = prev.checkedUpgrades ?? {
        tier1: {},
        tier2: {},
        tier3: {},
      }

      const newCheckedUpgrades: Record<string, Record<number, boolean>> = {
        ...checkedUpgrades,
        tier1: checkedUpgrades.tier1 ?? {},
        tier2: checkedUpgrades.tier2 ?? {},
        tier3: checkedUpgrades.tier3 ?? {},
      }

      // 确保 checkKey 对应的对象存在
      if (!newCheckedUpgrades[checkKey]) {
        newCheckedUpgrades[checkKey] = {}
      }

      // 设置勾选状态
      newCheckedUpgrades[checkKey] = {
        ...newCheckedUpgrades[checkKey],
        [index]: checked,
      }

      return {
        ...prev,
        checkedUpgrades: newCheckedUpgrades as any,
      }
    })
  }

  // Handle checkbox changes for upgrades
  const handleUpgradeCheck = (checkKeyOrTier: string, index: number) => {
    // 提取 tier（从 "tier1-0-2" 提取出 "tier1"）
    const tierMatch = checkKeyOrTier.match(/^(tier\d+)/)
    const tier = tierMatch ? tierMatch[1] : checkKeyOrTier

    // 获取当前勾选状态（使用完整的 checkKeyOrTier）
    const currentlyChecked = safeFormData.checkedUpgrades?.[checkKeyOrTier as keyof typeof safeFormData.checkedUpgrades]?.[index] ?? false
    const newCheckedState = !currentlyChecked

    // 获取选项信息
    const tierNum = parseInt(tier.replace('tier', ''))
    const options = getUpgradeOptions(tierNum)
    const option = options[index]

    if (option) {
      const label = option.label

      // 属性升级的回滚逻辑
      if (label.includes("角色属性+1") && currentlyChecked) {
        const rollbackAttributeUpgrade = useSheetStore.getState().rollbackAttributeUpgrade
        const result = rollbackAttributeUpgrade(checkKeyOrTier)

        if (result.success) {
          showFadeNotification({
            message: "已撤回属性升级，属性值已恢复",
            type: "success",
            position: "middle"
          })
        } else {
          if (result.reason === 'no-record') {
            showFadeNotification({
              message: "升级记录已丢失，无法自动回滚，请手动调整属性值",
              type: "error",
              position: "middle"
            })
          } else if (result.reason === 'conflict') {
            showFadeNotification({
              message: "属性已被其他操作修改，无法自动回滚，请手动调整",
              type: "error",
              position: "middle"
            })
          }
        }

        // 无论成功与否，都取消勾选
        toggleUpgradeCheckbox(checkKeyOrTier, index, false)
        return  // 早返回，不执行后续逻辑
      }

      // 经历升级的回滚逻辑
      if (label.includes("经历获得额外") && currentlyChecked) {
        const restoreExperienceValuesSnapshot = useSheetStore.getState().restoreExperienceValuesSnapshot
        const result = restoreExperienceValuesSnapshot()

        if (result.reason === 'conflict') {
          showFadeNotification({
            message: "检测到经历加值已被其他升级修改，无法回滚",
            type: "error",
            position: "middle"
          })
        } else if (result.reason === 'no-snapshot') {
          showFadeNotification({
            message: "经历升级的记录已丢失，请手动回滚",
            type: "error",
            position: "middle"
          })
        } else {
          showFadeNotification({
            message: "已撤回经历升级，经历加值已恢复",
            type: "success",
            position: "middle"
          })
        }

        // 取消勾选
        toggleUpgradeCheckbox(checkKeyOrTier, index, false)
        return  // 早返回，不执行后续逻辑
      }

      // 闪避值升级的回滚逻辑
      if (label.includes("闪避值") && currentlyChecked) {
        const restoreEvasionSnapshot = useSheetStore.getState().restoreEvasionSnapshot
        const result = restoreEvasionSnapshot()

        if (result.reason === 'conflict') {
          showFadeNotification({
            message: "检测到闪避值已被其他升级修改，无法回滚",
            type: "error",
            position: "middle"
          })
        } else if (result.reason === 'no-snapshot') {
          showFadeNotification({
            message: "闪避值升级的记录已丢失，请手动回滚",
            type: "error",
            position: "middle"
          })
        } else {
          showFadeNotification({
            message: "已撤回闪避值升级，闪避值已恢复",
            type: "success",
            position: "middle"
          })
        }

        // 取消勾选
        toggleUpgradeCheckbox(checkKeyOrTier, index, false)
        return  // 早返回，不执行后续逻辑
      }

      // 处理生命槽
      if (label.includes("生命槽")) {
        const currentHP = safeFormData.hpMax || 6
        if (newCheckedState) {
          const newValue = Math.min(currentHP + 1, 18)
          updateHPMax(newValue)
          showFadeNotification({
            message: `生命槽上限 +1，当前为 ${newValue}`,
            type: "success",
            position: "middle"
          })
        } else {
          const newValue = Math.max(currentHP - 1, 1)
          updateHPMax(newValue)
          showFadeNotification({
            message: `生命槽上限 -1，当前为 ${newValue}`,
            type: "success",
            position: "middle"
          })
        }
      }

      // 处理压力槽
      if (label.includes("压力槽")) {
        const currentStress = safeFormData.stressMax || 6
        if (newCheckedState) {
          const newValue = Math.min(currentStress + 1, 18)
          updateStressMax(newValue)
          showFadeNotification({
            message: `压力槽上限 +1，当前为 ${newValue}`,
            type: "success",
            position: "middle"
          })
        } else {
          const newValue = Math.max(currentStress - 1, 1)
          updateStressMax(newValue)
          showFadeNotification({
            message: `压力槽上限 -1，当前为 ${newValue}`,
            type: "success",
            position: "middle"
          })
        }
      }

      // 处理熟练度
      if (label.includes("熟练度+1")) {
        const currentProficiency = Array.isArray(safeFormData.proficiency)
          ? safeFormData.proficiency
          : Array(6).fill(false)
        const currentCount = currentProficiency.filter(v => v === true).length

        if (newCheckedState) {
          // 增加熟练度
          if (currentCount < 6) {
            const newProficiency = [...currentProficiency]
            newProficiency[currentCount] = true
            setFormData({ proficiency: newProficiency })
            showFadeNotification({
              message: `熟练度 +1，当前为 ${currentCount + 1}/6`,
              type: "success",
              position: "middle"
            })
          }
        } else {
          // 减少熟练度
          if (currentCount > 0) {
            const newProficiency = [...currentProficiency]
            newProficiency[currentCount - 1] = false
            setFormData({ proficiency: newProficiency })
            showFadeNotification({
              message: `熟练度 -1，当前为 ${currentCount - 1}/6`,
              type: "success",
              position: "middle"
            })
          }
        }
      }

      // 领域卡和子职业卡的选择现在由编辑按钮直接处理，不在这里处理
    }

    // 更新复选框状态（调用纯粹的状态切换函数）
    toggleUpgradeCheckbox(checkKeyOrTier, index, newCheckedState)
  }

  // Check if an upgrade is checked
  const isUpgradeChecked = (tier: string, index: number): boolean => {
    return !!safeFormData.checkedUpgrades?.[tier as keyof typeof safeFormData.checkedUpgrades]?.[index]
  }

  // 更新 getUpgradeOptions 函数以移除职业相关逻辑，并确保其与新的升级选项系统一致
  const getUpgradeOptions = (tier: number) => {
    // 获取基础升级选项
    const baseUpgrades = [...upgradeOptionsData.baseUpgrades]

    // 获取当前 tier 的等级上限文本
    const tierKey = `tier${tier}` as keyof typeof upgradeOptionsData.tierLevelCaps
    const levelCap = upgradeOptionsData.tierLevelCaps[tierKey] || ""

    // 替换占位符 {LEVEL_CAP} 为实际的等级上限
    const processedBaseUpgrades = baseUpgrades.map(option => ({
      ...option,
      label: option.label.replace('{LEVEL_CAP}', levelCap)
    }))

    // 添加特定等级升级选项
    const tierSpecificKey = `tier${tier}` as keyof typeof upgradeOptionsData.tierSpecificUpgrades
    const tierSpecificUpgrades = upgradeOptionsData.tierSpecificUpgrades[tierSpecificKey] || []

    return [...processedBaseUpgrades, ...tierSpecificUpgrades]
  }

  // Handle opening the domain card modal from upgrade section
  const handleOpenUpgradeDomainModal = (cardIndex: number, levels?: string[]) => {
    setUpgradeDomainCardIndex(cardIndex)
    setCardModalActiveTab("domain")
    // Clear class filter and search term
    setCardModalSelectedClasses([])
    setCardModalSearchTerm("")
    // Set smart level filtering
    setCardModalSelectedLevels(levels || [])
    setUpgradeDomainModalOpen(true)
  }

  // Handle opening the subclass card modal from upgrade section
  const handleOpenUpgradeSubclassModal = (cardIndex: number, profession?: string) => {
    setUpgradeSubclassCardIndex(cardIndex)
    setUpgradeSubclassProfession(profession)
    setCardModalActiveTab("subclass")
    setCardModalSearchTerm("")
    setCardModalSelectedLevels([])

    if (profession) {
      setCardModalSelectedClasses([profession])
    } else {
      setCardModalSelectedClasses([])
    }
    setUpgradeSubclassModalOpen(true)
  }


  return (
    <>
      {/* 固定位置的按钮 - 移除建卡指引按钮，因为已经移到父组件 */}
      {/* 固定位置的按钮已移至父组件 */}
      <div></div>

      <div className="w-full max-w-[210mm] mx-auto">
        <div
          className="a4-page p-2 bg-white text-gray-800 shadow-lg print:shadow-none rounded-md"
          style={{ width: "210mm" }}
        >
          {/* Header - 调整职业名称显示框的大小 */}
          <PageHeader />

          {/* Character Description Section */}
          <CharacterDescriptionSection formData={safeFormData} handleInputChange={handleInputChange} />

          {/* Card Deck Section */}
        <CardDeckSection
          formData={safeFormData}
          onCardChange={handleCardChange}
          onInventoryCardChange={handleInventoryCardChange}
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
              description="当你到达 2 级时：获得一项额外+2经历，熟练度标记+1。"
              formData={safeFormData}
              isUpgradeChecked={isUpgradeChecked}
              handleUpgradeCheck={handleUpgradeCheck}
              toggleUpgradeCheckbox={toggleUpgradeCheckbox}
              getUpgradeOptions={getUpgradeOptions}
              onCardChange={handleCardChange}
              onOpenCardModal={handleOpenUpgradeDomainModal}
              onOpenSubclassModal={handleOpenUpgradeSubclassModal}
            />

            {/* Tier 2: Levels 5-7 */}
            <UpgradeSection
              tier={2}
            title="T3 等级 5-7"
              description="当你到达 5 级时：获得一项额外+2经历，清除所有属性升级标记，熟练度标记+1。"
              formData={safeFormData}
              isUpgradeChecked={isUpgradeChecked}
              handleUpgradeCheck={handleUpgradeCheck}
              toggleUpgradeCheckbox={toggleUpgradeCheckbox}
              getUpgradeOptions={getUpgradeOptions}
              onCardChange={handleCardChange}
              onOpenCardModal={handleOpenUpgradeDomainModal}
              onOpenSubclassModal={handleOpenUpgradeSubclassModal}
            />

            {/* Tier 3: Levels 8-10 */}
            <UpgradeSection
              tier={3}
            title="T4 等级 8-10"
              description="当你到达 8 级时：获得一项额外+2经历，清除所有属性升级标记，熟练度标记+1。"
              formData={safeFormData}
              isUpgradeChecked={isUpgradeChecked}
              handleUpgradeCheck={handleUpgradeCheck}
              toggleUpgradeCheckbox={toggleUpgradeCheckbox}
              getUpgradeOptions={getUpgradeOptions}
              onCardChange={handleCardChange}
              onOpenCardModal={handleOpenUpgradeDomainModal}
              onOpenSubclassModal={handleOpenUpgradeSubclassModal}
          />
        </div>
      </div>
      </div>

      {/* Modals */}
      <CardSelectionModal
        isOpen={upgradeDomainModalOpen}
        onClose={() => setUpgradeDomainModalOpen(false)}
        onSelect={(card) => {
          handleCardChange(upgradeDomainCardIndex, card)
          setUpgradeDomainModalOpen(false)
        }}
        selectedCardIndex={upgradeDomainCardIndex}
        activeTab={cardModalActiveTab}
        setActiveTab={setCardModalActiveTab}
        searchTerm={cardModalSearchTerm}
        setSearchTerm={setCardModalSearchTerm}
        selectedClasses={cardModalSelectedClasses}
        setSelectedClasses={setCardModalSelectedClasses}
        selectedLevels={cardModalSelectedLevels}
        setSelectedLevels={setCardModalSelectedLevels}
      />

      <CardSelectionModal
        isOpen={upgradeSubclassModalOpen}
        onClose={() => {
          setUpgradeSubclassModalOpen(false)
          setUpgradeSubclassProfession(undefined)
        }}
        onSelect={(card) => {
          handleCardChange(upgradeSubclassCardIndex, card)
          setUpgradeSubclassModalOpen(false)
          setUpgradeSubclassProfession(undefined)
        }}
        selectedCardIndex={upgradeSubclassCardIndex}
        activeTab={cardModalActiveTab}
        setActiveTab={setCardModalActiveTab}
        searchTerm={cardModalSearchTerm}
        setSearchTerm={setCardModalSearchTerm}
        selectedClasses={cardModalSelectedClasses}
        setSelectedClasses={setCardModalSelectedClasses}
        selectedLevels={cardModalSelectedLevels}
        setSelectedLevels={setCardModalSelectedLevels}
      />
    </>
  )
}
