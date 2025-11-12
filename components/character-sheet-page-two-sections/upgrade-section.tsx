"use client"
import { useState } from "react"
import { Edit } from "lucide-react"
import type { SheetData } from "@/lib/sheet-data"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { HPMaxEditor } from "@/components/upgrade-popover/hp-max-editor"
import { StressMaxEditor } from "@/components/upgrade-popover/stress-max-editor"
import { ExperienceValuesEditor } from "@/components/upgrade-popover/experience-values-editor"
import { AttributeUpgradeEditor } from "@/components/upgrade-popover/attribute-upgrade-editor"
import { DodgeEditor } from "@/components/upgrade-popover/dodge-editor"
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
      isAttributeUpgradeOption(label) ||
      isHPUpgradeOption(label) ||
      isStressUpgradeOption(label) ||
      isExperienceUpgradeOption(label) ||
      isDomainCardOption(label) ||
      isDodgeUpgradeOption(label) ||
      isProficiencyUpgradeOption(label) ||
      isSubclassUpgradeOption(label)
    )
  }

  // Render the appropriate editor based on option type
  const renderEditor = (option: any, index: number, boxIndex: number) => {
    if (isAttributeUpgradeOption(option.label)) {
      return (
        <AttributeUpgradeEditor
          tier={tierKey}
          optionIndex={index}
          boxIndex={boxIndex}
          handleUpgradeCheck={handleUpgradeCheck}
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
      return <ExperienceValuesEditor onClose={() => setOpenPopoverIndex(null)} />
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
      return <DodgeEditor onClose={() => setOpenPopoverIndex(null)} />
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
            ? "更新你的等级，从下方的升级列表中选择并标记两个选项。"
            : "更新你的等级，从下方的升级列表或更低级的列表中选择并标记两个选项。"}
        </p>

        <div className="space-y-1">
          {getUpgradeOptions(tier).map((option, index) => (
            <div key={`${tierKey}-${index}`} className="flex items-start !text-[10px] leading-[1.6]">
              <span className={`flex flex-shrink-0 items-center justify-end mt-px ${option.doubleBox && option.boxCount === 2 ? '' : 'gap-px'}`} style={{ minWidth: '3.2em' }}>
                {Array(option.boxCount).fill(null).map((_, i) => {
                  const checkKey = option.doubleBox ? `${tierKey}-${index}` : `${tierKey}-${index}-${i}`
                  return (
                    <div
                      key={i}
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
                      onClick={() => handleUpgradeCheck(checkKey, index)}
                    ></div>
                  )
                })}
              </span>
              <div className="flex-1 ml-2">
                <span className="text-gray-800 dark:text-gray-200 mr-1">{option.label}</span>
                {needsEditButton(option.label) && (
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
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 !text-xs">
          {tier === 1 && (
            <>
              <span className="text-gray-800 dark:text-gray-200 mr-1">
                将伤害阈值+1，选择一张不高于你当前等级(上限4级)的领域卡加入卡组。
              </span>
              <Popover
                open={openPopoverIndex === `threshold-tier${tier}`}
                onOpenChange={(open) => {
                  if (open) {
                    setOpenPopoverIndex(`threshold-tier${tier}`)
                  } else {
                    setOpenPopoverIndex(null)
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <button
                    className="inline-flex items-center justify-center p-0.5 hover:bg-gray-100 rounded transition-colors print:hidden"
                    title="选择领域卡"
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
                  <DomainCardSelector
                    formData={formData}
                    tier={tier}
                    onCardChange={onCardChange!}
                    onClose={() => setOpenPopoverIndex(null)}
                    onOpenModal={onOpenCardModal}
                  />
                </PopoverContent>
              </Popover>
            </>
          )}
          {tier === 2 && (
            <>
              <span className="text-gray-800 dark:text-gray-200 mr-1">
                将伤害阈值+1，选择一张不高于你当前等级(上限7级)的领域卡加入卡组。
              </span>
              <Popover
                open={openPopoverIndex === `threshold-tier${tier}`}
                onOpenChange={(open) => {
                  if (open) {
                    setOpenPopoverIndex(`threshold-tier${tier}`)
                  } else {
                    setOpenPopoverIndex(null)
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <button
                    className="inline-flex items-center justify-center p-0.5 hover:bg-gray-100 rounded transition-colors print:hidden"
                    title="选择领域卡"
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
                  <DomainCardSelector
                    formData={formData}
                    tier={tier}
                    onCardChange={onCardChange!}
                    onClose={() => setOpenPopoverIndex(null)}
                    onOpenModal={onOpenCardModal}
                  />
                </PopoverContent>
              </Popover>
            </>
          )}
          {tier === 3 && (
            <>
              <span className="text-gray-800 dark:text-gray-200 mr-1">
                将伤害阈值+1，选择一张不高于你当前等级(上限10级)的领域卡加入卡组。
              </span>
              <Popover
                open={openPopoverIndex === `threshold-tier${tier}`}
                onOpenChange={(open) => {
                  if (open) {
                    setOpenPopoverIndex(`threshold-tier${tier}`)
                  } else {
                    setOpenPopoverIndex(null)
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <button
                    className="inline-flex items-center justify-center p-0.5 hover:bg-gray-100 rounded transition-colors print:hidden"
                    title="选择领域卡"
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
                  <DomainCardSelector
                    formData={formData}
                    tier={tier}
                    onCardChange={onCardChange!}
                    onClose={() => setOpenPopoverIndex(null)}
                    onOpenModal={onOpenCardModal}
                  />
                </PopoverContent>
              </Popover>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
