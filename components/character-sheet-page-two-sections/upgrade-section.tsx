"use client"
import { useState } from "react"
import type { SheetData } from "@/lib/sheet-data"
import type { StandardCard } from "@/card/card-types"
import { Popover, PopoverTrigger, PopoverContent, PopoverArrow } from "@/components/ui/popover"
import { HPMaxEditor } from "@/components/upgrade-popover/hp-max-editor"
import { StressMaxEditor } from "@/components/upgrade-popover/stress-max-editor"
import { ExperienceValuesEditor } from "@/components/upgrade-popover/experience-values-editor"
import { AttributeUpgradeEditor } from "@/components/upgrade-popover/attribute-upgrade-editor"
import { DodgeEditor } from "@/components/upgrade-popover/dodge-editor"
import { DomainCardSelector } from "@/components/upgrade-popover/domain-card-selector"
import { CardSelectionModal } from "@/components/modals/card-selection-modal"
import { Info } from "lucide-react"

interface UpgradeSectionProps {
  tier: number
  title: string
  description: string
  formData: SheetData
  isUpgradeChecked: (tier: string, index: number) => boolean
  handleUpgradeCheck: (tier: string, index: number) => void
  getUpgradeOptions: (tier: number) => any[] // Removed profession from parameters
  onCardChange: (index: number, card: StandardCard) => void
}

export function UpgradeSection({
  tier,
  title,
  description,
  formData,
  isUpgradeChecked,
  handleUpgradeCheck,
  getUpgradeOptions,
  onCardChange,
}: UpgradeSectionProps) {
  const tierKey = `tier${tier}`
  const [openPopovers, setOpenPopovers] = useState<Record<string, boolean>>({})
  const [clickedBoxIndex, setClickedBoxIndex] = useState<Record<string, number>>({})

  // Domain card modal state
  const [domainCardModalOpen, setDomainCardModalOpen] = useState(false)
  const [domainCardIndex, setDomainCardIndex] = useState<number | null>(null)
  const [domainCardActiveTab, setDomainCardActiveTab] = useState<string>("domain")
  const [domainCardSearchTerm, setDomainCardSearchTerm] = useState<string>("")
  const [domainCardSelectedClasses, setDomainCardSelectedClasses] = useState<string[]>([])
  const [domainCardSelectedLevels, setDomainCardSelectedLevels] = useState<string[]>([])

  const handleOpenDomainCardModal = (index: number, popoverKey: string) => {
    setDomainCardIndex(index)
    setDomainCardActiveTab("domain")
    setDomainCardSearchTerm("")
    setDomainCardSelectedClasses([])
    setDomainCardSelectedLevels([])
    setDomainCardModalOpen(true)
    // Close the popover when modal opens
    togglePopover(popoverKey, false)
  }

  const handleDomainCardSelect = (card: StandardCard) => {
    if (domainCardIndex !== null) {
      onCardChange(domainCardIndex, card)
      setDomainCardModalOpen(false)
      setDomainCardIndex(null)
    }
  }

  const handleCloseDomainCardModal = () => {
    setDomainCardModalOpen(false)
    setDomainCardIndex(null)
  }

  // 检查是否是"永久增加一个生命槽"选项
  const isHPUpgradeOption = (label: string) => {
    return label.includes("永久增加一个生命槽")
  }

  // 检查是否是"永久增加一个压力槽"选项
  const isStressUpgradeOption = (label: string) => {
    return label.includes("永久增加一个压力槽")
  }

  // 检查是否是"选择两项经历获得额外+1"选项
  const isExperienceUpgradeOption = (label: string) => {
    return label.includes("选择两项经历获得额外+1")
  }

  // 检查是否是"两项未升级的角色属性+1"选项
  const isAttributeUpgradeOption = (label: string) => {
    return label.includes("两项未升级的角色属性+1")
  }

  // 检查是否是"获得闪避值+1"选项
  const isDodgeUpgradeOption = (label: string) => {
    return label.includes("获得闪避值+1")
  }

  // 检查是否是"选择领域卡"选项
  const isDomainCardOption = (label: string) => {
    return label.includes("领域卡加入卡组")
  }

  const togglePopover = (key: string, open: boolean) => {
    setOpenPopovers(prev => ({ ...prev, [key]: open }))
  }

  return (
    <div className="border border-gray-300 rounded-md shadow-sm">
      <div className="bg-gray-800 text-white p-1 text-center font-bold !text-sm rounded-t-md">{title}</div>
      <div className="bg-gray-600 text-white p-1 !text-xs">{description}</div>
      <div className="p-1">
        <p className="!text-xs mb-2">
          {tier === 1
            ? "更新你的等级，从下方的升级列表中选择并标记两个选项。"
            : "更新你的等级，从下方的升级列表或更低级的列表中选择并标记两个选项。"}
        </p>

        <div className="space-y-1">
          {getUpgradeOptions(tier).map((option, index) => {
            const popoverKey = `${tierKey}-${index}`
            const showHPPopover = isHPUpgradeOption(option.label)
            const showStressPopover = isStressUpgradeOption(option.label)
            const showExperiencePopover = isExperienceUpgradeOption(option.label)
            const showAttributePopover = isAttributeUpgradeOption(option.label)
            const showDodgePopover = isDodgeUpgradeOption(option.label)
            const showDomainCardPopover = isDomainCardOption(option.label)
            const showPopover = showHPPopover || showStressPopover || showExperiencePopover || showAttributePopover || showDodgePopover || showDomainCardPopover

            return (
            <div key={popoverKey} className="flex items-start !text-[10px] leading-[1.6]">
              {showPopover ? (
                // 对于 HP 升级选项，使用 Popover 包裹 checkbox
                <Popover open={openPopovers[popoverKey]} onOpenChange={(open) => togglePopover(popoverKey, open)}>
                  <PopoverTrigger asChild>
                    <span className={`flex flex-shrink-0 items-center justify-end mt-px ${option.doubleBox && option.boxCount === 2 ? '' : 'gap-px'}`} style={{ minWidth: '3.2em' }}>
                      {Array(option.boxCount).fill(null).map((_, i) => (
                        <div
                          key={i}
                          className={`w-3 h-3 cursor-pointer ${option.doubleBox && option.boxCount === 2
                            ? `${i === 0
                              ? 'border-l-2 border-t-2 border-b-2 border-r border-gray-800'
                              : 'border-r-2 border-t-2 border-b-2 border-l border-gray-800'
                            } ${isUpgradeChecked(`${tierKey}-${index}`, index)
                                ? "bg-gray-800"
                                : "bg-white"
                            }`
                            : option.doubleBox
                              ? `border-2 border-gray-800 ${isUpgradeChecked(`${tierKey}-${index}`, index)
                                ? "bg-gray-800"
                                : "bg-white"
                              }`
                              : `border border-gray-800 ${isUpgradeChecked(`${tierKey}-${index}-${i}`, index)
                                ? "bg-gray-800"
                                : "bg-white"
                              }`
                          }`}
                          onClick={(e) => {
                            e.stopPropagation()

                            // 对于属性升级选项，特殊处理（延迟勾选）
                            if (showAttributePopover) {
                              const checkKey = `${tierKey}-${index}-${i}`
                              const isCurrentlyChecked = isUpgradeChecked(checkKey, index)

                              if (isCurrentlyChecked) {
                                // 已勾选：取消勾选并关闭气泡
                                handleUpgradeCheck(checkKey, index)
                                togglePopover(popoverKey, false)
                              } else {
                                // 未勾选：记录索引并打开气泡（不勾选）
                                setClickedBoxIndex(prev => ({ ...prev, [popoverKey]: i }))
                                togglePopover(popoverKey, true)
                              }
                            } else {
                              // 对于其他升级选项，保持原逻辑
                              const checkKey = option.doubleBox ? `${tierKey}-${index}` : `${tierKey}-${index}-${i}`
                              const isCurrentlyChecked = isUpgradeChecked(checkKey, index)

                              // 处理勾选逻辑
                              if (option.doubleBox) {
                                handleUpgradeCheck(`${tierKey}-${index}`, index);
                              } else {
                                handleUpgradeCheck(`${tierKey}-${index}-${i}`, index);
                              }

                              // 如果原来未勾选，现在勾选了，打开气泡
                              // 如果原来已勾选，现在取消了，关闭气泡
                              if (!isCurrentlyChecked) {
                                togglePopover(popoverKey, true)
                              } else {
                                togglePopover(popoverKey, false)
                              }
                            }
                          }}
                        ></div>
                      ))}
                    </span>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto"
                    side="top"
                    align="start"
                    sideOffset={8}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <PopoverArrow className="fill-white" />
                    {showHPPopover && <HPMaxEditor onClose={() => togglePopover(popoverKey, false)} />}
                    {showStressPopover && <StressMaxEditor onClose={() => togglePopover(popoverKey, false)} />}
                    {showExperiencePopover && <ExperienceValuesEditor onClose={() => togglePopover(popoverKey, false)} />}
                    {showAttributePopover && (
                      <AttributeUpgradeEditor
                        onClose={() => togglePopover(popoverKey, false)}
                        tier={tierKey}
                        optionIndex={index}
                        boxIndex={clickedBoxIndex[popoverKey]}
                        handleUpgradeCheck={handleUpgradeCheck}
                      />
                    )}
                    {showDodgePopover && (
                      <DodgeEditor
                        onClose={() => togglePopover(popoverKey, false)}
                        tier={tierKey}
                        optionIndex={index}
                        boxIndex={clickedBoxIndex[popoverKey]}
                        handleUpgradeCheck={handleUpgradeCheck}
                      />
                    )}
                    {showDomainCardPopover && (
                      <DomainCardSelector
                        formData={formData}
                        onCardChange={onCardChange}
                        onClose={() => togglePopover(popoverKey, false)}
                        onOpenModal={(index) => handleOpenDomainCardModal(index, popoverKey)}
                      />
                    )}
                  </PopoverContent>
                </Popover>
              ) : (
                // 对于其他选项，使用原来的逻辑
                <span className={`flex flex-shrink-0 items-center justify-end mt-px ${option.doubleBox && option.boxCount === 2 ? '' : 'gap-px'}`} style={{ minWidth: '3.2em' }}>
                  {Array(option.boxCount).fill(null).map((_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 cursor-pointer ${option.doubleBox && option.boxCount === 2
                        ? `${i === 0
                          ? 'border-l-2 border-t-2 border-b-2 border-r border-gray-800'
                          : 'border-r-2 border-t-2 border-b-2 border-l border-gray-800'
                        } ${isUpgradeChecked(`${tierKey}-${index}`, index)
                            ? "bg-gray-800"
                            : "bg-white"
                        }`
                        : option.doubleBox
                          ? `border-2 border-gray-800 ${isUpgradeChecked(`${tierKey}-${index}`, index)
                            ? "bg-gray-800"
                            : "bg-white"
                          }`
                          : `border border-gray-800 ${isUpgradeChecked(`${tierKey}-${index}-${i}`, index)
                            ? "bg-gray-800"
                            : "bg-white"
                          }`
                      }`}
                      onClick={() => {
                        if (option.doubleBox) {
                          handleUpgradeCheck(`${tierKey}-${index}`, index);
                        } else {
                          handleUpgradeCheck(`${tierKey}-${index}-${i}`, index);
                        }
                      }}
                    ></div>
                  ))}
                </span>
              )}
              <div className="flex-1 ml-2">
                <span className="text-gray-800 dark:text-gray-200 mr-1">{option.label}</span>
              </div>
            </div>
          )})}
        </div>

        <div className="mt-3 !text-xs">
          {tier === 1 && (
            <>
              将伤害阈值+1，选择一张不高于你当前等级(上限4级)的领域卡加入卡组。
            </>
          )}
          {tier === 2 && (
            <>
              将伤害阈值+1，选择一张不高于你当前等级(上限7级)的领域卡加入卡组。
            </>
          )}
          {tier === 3 && (
            <>
              将伤害阈值+1，选择一张不高于你当前等级(上限10级)的领域卡加入卡组。
            </>
          )}
        </div>
      </div>

      {/* Domain Card Selection Modal - Rendered outside Popover */}
      {domainCardIndex !== null && (
        <CardSelectionModal
          isOpen={domainCardModalOpen}
          onClose={handleCloseDomainCardModal}
          onSelect={handleDomainCardSelect}
          selectedCardIndex={domainCardIndex}
          activeTab={domainCardActiveTab}
          setActiveTab={setDomainCardActiveTab}
          searchTerm={domainCardSearchTerm}
          setSearchTerm={setDomainCardSearchTerm}
          selectedClasses={domainCardSelectedClasses}
          setSelectedClasses={setDomainCardSelectedClasses}
          selectedLevels={domainCardSelectedLevels}
          setSelectedLevels={setDomainCardSelectedLevels}
        />
      )}
    </div>
  )
}
