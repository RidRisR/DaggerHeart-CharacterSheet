"use client"
import { useState } from "react"
import { Edit } from "lucide-react"
import type { SheetData } from "@/lib/sheet-data"
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from "@/components/ui/popover"
import { HPMaxEditor } from "@/components/upgrade-popover/hp-max-editor"
import { StressMaxEditor } from "@/components/upgrade-popover/stress-max-editor"
import { ExperienceValuesEditor } from "@/components/upgrade-popover/experience-values-editor"
import { AttributeUpgradeEditor } from "@/components/upgrade-popover/attribute-upgrade-editor"
import { EvasionEditor } from "@/components/upgrade-popover/evasion-editor"
import { DomainCardSelector } from "@/components/upgrade-popover/domain-card-selector"
import { ProficiencyEditor } from "@/components/upgrade-popover/proficiency-editor"
import { SubclassCardSelector } from "@/components/upgrade-popover/subclass-card-selector"
import type { StandardCard } from "@/card/card-types"

interface UpgradeSectionProps {
  tier: number
  title: string
  description: string
  formData: SheetData
  isUpgradeChecked: (tier: string, index: number) => boolean
  handleUpgradeCheck: (tier: string, index: number) => void
  toggleUpgradeCheckbox: (checkKey: string, index: number, checked: boolean) => void  // 新增：纯粹的状态切换函数
  getUpgradeOptions: (tier: number) => any[]
  onCardChange?: (index: number, card: StandardCard) => void
  onOpenCardModal?: (index: number, levels?: string[]) => void
  onOpenSubclassModal?: (index: number, profession?: string) => void
}

export function UpgradeSection({
  tier,
  title,
  description,
  formData,
  isUpgradeChecked,
  handleUpgradeCheck,
  toggleUpgradeCheckbox,
  getUpgradeOptions,
  onCardChange,
  onOpenCardModal,
  onOpenSubclassModal,
}: UpgradeSectionProps) {
  const tierKey = `tier${tier}`
  const [openPopoverIndex, setOpenPopoverIndex] = useState<string | null>(null)

  // Helper functions to detect upgrade option types
  const isAttributeUpgradeOption = (label: string) => label.includes("角色属性+1")
  const isHPUpgradeOption = (label: string) => label.includes("生命槽")
  const isStressUpgradeOption = (label: string) => label.includes("压力槽")
  const isExperienceUpgradeOption = (label: string) => label.includes("经历获得额外")
  const isDomainCardOption = (label: string) => label.includes("领域卡加入卡组")
  const isDodgeUpgradeOption = (label: string) => label.includes("闪避值")
  const isProficiencyUpgradeOption = (label: string) => label.includes("熟练度+1")
  const isSubclassUpgradeOption = (label: string) => label.includes("升级你的子职业")

  // Helper function to determine if an option needs an edit button
  const needsEditButton = (label: string) => {
    return (
      // isAttributeUpgradeOption(label) ||    // 属性升级现在通过点击复选框打开气泡
      // isHPUpgradeOption(label) ||           // 直接勾选/取消勾选即可 +1/-1
      // isStressUpgradeOption(label) ||       // 直接勾选/取消勾选即可 +1/-1
      // isExperienceUpgradeOption(label) ||   // 经历升级现在通过点击复选框打开气泡
      isDomainCardOption(label) ||             // 点击按钮直接打开 modal
      // isDodgeUpgradeOption(label) ||        // 闪避值现在通过点击复选框打开气泡
      // isProficiencyUpgradeOption(label) ||  // 直接勾选/取消勾选即可 +1/-1
      isSubclassUpgradeOption(label)           // 点击按钮直接打开 modal
    )
  }

  // Helper function to determine if button should directly open modal (no popover)
  const shouldDirectlyOpenModal = (label: string) => {
    return isDomainCardOption(label) || isSubclassUpgradeOption(label)
  }

  // Handle direct modal opening for domain/subclass cards
  const handleDirectModalOpen = (option: any) => {
    const label = option.label

    if (isDomainCardOption(label)) {
      // Domain card logic - same as in DomainCardSelector
      const cards = formData.cards || []
      let emptySlotIndex = -1

      for (let i = 5; i < 20; i++) {
        const card = cards[i]
        if (!card || (!card.name && (!card.type || card.type === "unknown"))) {
          emptySlotIndex = i
          break
        }
      }

      if (emptySlotIndex === -1) {
        // Use showFadeNotification - need to import it
        alert("没有空余卡位") // Temporary, will be replaced
        return
      }

      // Calculate smart level filtering
      const tierLevelCaps: Record<number, number> = { 1: 4, 2: 7, 3: 10 }
      const levelCap = tierLevelCaps[tier] || 10
      const currentLevel = parseInt(formData.level) || 0
      const targetLevel = currentLevel > 0 ? Math.min(currentLevel, levelCap) : levelCap
      const levelFilter = Array.from({ length: targetLevel }, (_, i) => String(i + 1))

      onOpenCardModal?.(emptySlotIndex, levelFilter)
    }

    if (isSubclassUpgradeOption(label)) {
      // Subclass card logic - same as in SubclassCardSelector
      const cards = formData.cards || []
      let emptySlotIndex = -1

      for (let i = 5; i < 20; i++) {
        const card = cards[i]
        if (!card || (!card.name && (!card.type || card.type === "unknown"))) {
          emptySlotIndex = i
          break
        }
      }

      if (emptySlotIndex === -1) {
        alert("没有空余卡位") // Temporary
        return
      }

      // Get current profession from profession card at index 0
      let currentProfession: string | undefined = undefined
      const professionCard = cards[0]
      const isCardEmpty = !professionCard || (!professionCard.name && (!professionCard.type || professionCard.type === "unknown"))

      if (!isCardEmpty && professionCard.type === "profession") {
        currentProfession = professionCard.class
      }

      onOpenSubclassModal?.(emptySlotIndex, currentProfession)
    }
  }

  // Render the appropriate editor based on option type
  const renderEditor = (option: any, index: number, checkKeyOrBoxIndex: number | string) => {
    if (isAttributeUpgradeOption(option.label)) {
      // 如果传入的是字符串，就是完整的 checkKey；否则是 boxIndex，需要构造
      const checkKey = typeof checkKeyOrBoxIndex === 'string'
        ? checkKeyOrBoxIndex
        : `${tierKey}-${index}-${checkKeyOrBoxIndex}`

      return (
        <AttributeUpgradeEditor
          checkKey={checkKey}
          optionIndex={index}
          toggleUpgradeCheckbox={toggleUpgradeCheckbox}
          onClose={() => setOpenPopoverIndex(null)}
        />
      )
    }

    if (isHPUpgradeOption(option.label)) {
      return <HPMaxEditor onClose={() => setOpenPopoverIndex(null)} />
    }

    if (isStressUpgradeOption(option.label)) {
      return <StressMaxEditor onClose={() => setOpenPopoverIndex(null)} />
    }

    if (isExperienceUpgradeOption(option.label)) {
      const checkKey = typeof checkKeyOrBoxIndex === 'string'
        ? checkKeyOrBoxIndex
        : `${tierKey}-${index}-${checkKeyOrBoxIndex}`

      return (
        <ExperienceValuesEditor
          checkKey={checkKey}
          optionIndex={index}
          toggleUpgradeCheckbox={toggleUpgradeCheckbox}
          onClose={() => setOpenPopoverIndex(null)}
        />
      )
    }

    if (isDomainCardOption(option.label)) {
      return (
        <DomainCardSelector
          formData={formData}
          tier={tier}
          onCardChange={onCardChange!}
          onClose={() => setOpenPopoverIndex(null)}
          onOpenModal={(slotIndex, levels) => {
            setOpenPopoverIndex(null)
            onOpenCardModal?.(slotIndex, levels)
          }}
        />
      )
    }

    if (isDodgeUpgradeOption(option.label)) {
      const checkKey = typeof checkKeyOrBoxIndex === 'string'
        ? checkKeyOrBoxIndex
        : `${tierKey}-${index}-${checkKeyOrBoxIndex}`

      return (
        <EvasionEditor
          checkKey={checkKey}
          optionIndex={index}
          toggleUpgradeCheckbox={toggleUpgradeCheckbox}
          onClose={() => setOpenPopoverIndex(null)}
        />
      )
    }

    if (isProficiencyUpgradeOption(option.label)) {
      return <ProficiencyEditor onClose={() => setOpenPopoverIndex(null)} />
    }

    if (isSubclassUpgradeOption(option.label)) {
      return (
        <SubclassCardSelector
          formData={formData}
          onCardChange={onCardChange!}
          onClose={() => setOpenPopoverIndex(null)}
          onOpenModal={(slotIndex, profession) => {
            setOpenPopoverIndex(null)
            onOpenSubclassModal?.(slotIndex, profession)
          }}
        />
      )
    }

    return null
  }

  return (
    <div className="border border-gray-300 rounded-md shadow-sm">
      <div className="bg-gray-800 text-white p-1 text-center font-bold !text-sm rounded-t-md">{title}</div>
      <div className="bg-gray-600 text-white p-1 !text-xs">{description}</div>
      <div className="p-1">
        <p className="!text-xs mb-2">
          {tier === 1
            ? <>更新你的等级，从下方的升级列表中选择并标记<strong>两个</strong>选项。</>
            : <>更新你的等级，从下方的升级列表或更低级的列表中选择并标记<strong>两个</strong>选项。</>}
        </p>

        <div className="space-y-1">
          {getUpgradeOptions(tier).map((option, index) => {
            const isAttrUpgrade = isAttributeUpgradeOption(option.label)
            const isExpUpgrade = isExperienceUpgradeOption(option.label)
            const isEvasionUpgrade = isDodgeUpgradeOption(option.label)
            const needsPopover = isAttrUpgrade || isExpUpgrade || isEvasionUpgrade
            return (
              <div key={`${tierKey}-${index}`} className="flex items-start !text-[10px] leading-[1.6]">
              {/* 属性升级 / 经历升级 / 闪避值升级：包裹 Popover 以便定位 */}
              {needsPopover ? (
                <Popover
                  open={openPopoverIndex !== null && openPopoverIndex.startsWith(`${tierKey}-${index}-`)}
                  onOpenChange={(open) => {
                    if (!open) {
                      setOpenPopoverIndex(null)
                    }
                  }}
                >
                  <PopoverAnchor asChild>
                    <span className={`flex flex-shrink-0 items-center justify-end mt-px ${option.doubleBox && option.boxCount === 2 ? '' : 'gap-px'}`} style={{ minWidth: '3.2em' }}>
                      {Array(option.boxCount).fill(null).map((_, i) => {
                  const checkKey = option.doubleBox ? `${tierKey}-${index}` : `${tierKey}-${index}-${i}`
                  return (
                    <div
                      key={i}
                      data-testid={`checkbox-${checkKey}`}
                      className={`w-3 h-3 cursor-pointer ${option.doubleBox && option.boxCount === 2
                        ? `${i === 0
                          ? 'border-l-2 border-t-2 border-b-2 border-r border-gray-800'
                          : 'border-r-2 border-t-2 border-b-2 border-l border-gray-800'
                        } ${isUpgradeChecked(checkKey, index)
                            ? "bg-gray-800"
                            : "bg-white"
                        }`
                        : option.doubleBox
                          ? `border-2 border-gray-800 ${isUpgradeChecked(checkKey, index)
                            ? "bg-gray-800"
                            : "bg-white"
                          }`
                          : `border border-gray-800 ${isUpgradeChecked(checkKey, index)
                            ? "bg-gray-800"
                            : "bg-white"
                          }`
                      }`}
                      onClick={() => {
                        // 属性升级 / 经历升级 / 闪避值升级选项：特殊处理
                        if (isAttributeUpgradeOption(option.label) || isExperienceUpgradeOption(option.label) || isDodgeUpgradeOption(option.label)) {
                          const isChecked = isUpgradeChecked(checkKey, index)
                          if (!isChecked) {
                            // 空白复选框 → 打开气泡编辑器
                            setOpenPopoverIndex(checkKey)
                          } else {
                            // 已高亮复选框 → 触发回滚
                            handleUpgradeCheck(checkKey, index)
                          }
                        } else {
                          // 其他选项：保持原有逻辑
                          handleUpgradeCheck(checkKey, index)
                        }
                      }}
                    ></div>
                  )
                })}
                    </span>
                  </PopoverAnchor>
                  <PopoverContent
                    className="w-auto p-1.5 bg-white border border-gray-300 rounded shadow-lg"
                    side="top"
                    align="start"
                    sideOffset={5}
                  >
                    {openPopoverIndex && renderEditor(option, index, openPopoverIndex)}
                  </PopoverContent>
                </Popover>
              ) : (
                <span className={`flex flex-shrink-0 items-center justify-end mt-px ${option.doubleBox && option.boxCount === 2 ? '' : 'gap-px'}`} style={{ minWidth: '3.2em' }}>
                  {Array(option.boxCount).fill(null).map((_, i) => {
                    const checkKey = option.doubleBox ? `${tierKey}-${index}` : `${tierKey}-${index}-${i}`
                    return (
                      <div
                        key={i}
                        data-testid={`checkbox-${checkKey}`}
                        className={`w-3 h-3 cursor-pointer ${option.doubleBox && option.boxCount === 2
                          ? `${i === 0
                            ? 'border-l-2 border-t-2 border-b-2 border-r border-gray-800'
                            : 'border-r-2 border-t-2 border-b-2 border-l border-gray-800'
                          } ${isUpgradeChecked(checkKey, index)
                              ? "bg-gray-800"
                              : "bg-white"
                          }`
                          : option.doubleBox
                            ? `border-2 border-gray-800 ${isUpgradeChecked(checkKey, index)
                              ? "bg-gray-800"
                              : "bg-white"
                            }`
                            : `border border-gray-800 ${isUpgradeChecked(checkKey, index)
                              ? "bg-gray-800"
                              : "bg-white"
                            }`
                        }`}
                        onClick={() => {
                          // 其他选项：保持原有逻辑
                          handleUpgradeCheck(checkKey, index)
                        }}
                      ></div>
                    )
                  })}
                </span>
              )}
              <div className="flex-1 ml-2">
                <span className="text-gray-800 dark:text-gray-200 mr-1">{option.label}</span>
                {/* 其他需要编辑按钮的选项 */}
                {needsEditButton(option.label) && (
                  shouldDirectlyOpenModal(option.label) ? (
                    // Direct modal open button (no popover)
                    <button
                      onClick={() => handleDirectModalOpen(option)}
                      className="inline-flex items-center justify-center p-0.5 hover:bg-gray-100 rounded transition-colors print:hidden"
                      title="选择卡牌"
                    >
                      <Edit className="w-2.5 h-2.5 text-gray-600" />
                    </button>
                  ) : (
                    // Popover button for other options
                    <Popover
                      open={openPopoverIndex === `${tierKey}-${index}`}
                      onOpenChange={(open) => {
                        if (open) {
                          setOpenPopoverIndex(`${tierKey}-${index}`)
                        } else {
                          setOpenPopoverIndex(null)
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <button
                          className="inline-flex items-center justify-center p-0.5 hover:bg-gray-100 rounded transition-colors print:hidden"
                          title="编辑"
                        >
                          <Edit className="w-2.5 h-2.5 text-gray-600" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-1.5 bg-white border border-gray-300 rounded shadow-lg"
                        side="right"
                        align="start"
                        sideOffset={5}
                      >
                        {renderEditor(option, index, 0)}
                      </PopoverContent>
                    </Popover>
                  )
                )}
              </div>
              </div>
            )
          })}
        </div>

        <div className="mt-3 !text-xs">
          {tier === 1 && (
            <>
              <span className="text-gray-800 dark:text-gray-200 mr-1">
                将伤害阈值+1，选择一张不高于你当前等级(上限4级)的领域卡加入卡组。
              </span>
              <button
                onClick={() => handleDirectModalOpen({ label: "领域卡加入卡组" })}
                className="inline-flex items-center justify-center p-0.5 hover:bg-gray-100 rounded transition-colors print:hidden"
                title="选择领域卡"
              >
                <Edit className="w-2.5 h-2.5 text-gray-600" />
              </button>
            </>
          )}
          {tier === 2 && (
            <>
              <span className="text-gray-800 dark:text-gray-200 mr-1">
                将伤害阈值+1，选择一张不高于你当前等级(上限7级)的领域卡加入卡组。
              </span>
              <button
                onClick={() => handleDirectModalOpen({ label: "领域卡加入卡组" })}
                className="inline-flex items-center justify-center p-0.5 hover:bg-gray-100 rounded transition-colors print:hidden"
                title="选择领域卡"
              >
                <Edit className="w-2.5 h-2.5 text-gray-600" />
              </button>
            </>
          )}
          {tier === 3 && (
            <>
              <span className="text-gray-800 dark:text-gray-200 mr-1">
                将伤害阈值+1，选择一张不高于你当前等级(上限10级)的领域卡加入卡组。
              </span>
              <button
                onClick={() => handleDirectModalOpen({ label: "领域卡加入卡组" })}
                className="inline-flex items-center justify-center p-0.5 hover:bg-gray-100 rounded transition-colors print:hidden"
                title="选择领域卡"
              >
                <Edit className="w-2.5 h-2.5 text-gray-600" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
