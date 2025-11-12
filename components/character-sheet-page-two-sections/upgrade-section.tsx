"use client"
import { useState } from "react"
import type { SheetData } from "@/lib/sheet-data"
import { Popover, PopoverTrigger, PopoverContent, PopoverArrow } from "@/components/ui/popover"
import { HPMaxEditor } from "@/components/upgrade-popover/hp-max-editor"
import { StressMaxEditor } from "@/components/upgrade-popover/stress-max-editor"
import { Info } from "lucide-react"

interface UpgradeSectionProps {
  tier: number
  title: string
  description: string
  formData: SheetData
  isUpgradeChecked: (tier: string, index: number) => boolean
  handleUpgradeCheck: (tier: string, index: number) => void
  getUpgradeOptions: (tier: number) => any[] // Removed profession from parameters
}

export function UpgradeSection({
  tier,
  title,
  description,
  formData,
  isUpgradeChecked,
  handleUpgradeCheck,
  getUpgradeOptions,
}: UpgradeSectionProps) {
  const tierKey = `tier${tier}`
  const [openPopovers, setOpenPopovers] = useState<Record<string, boolean>>({})

  // 检查是否是"永久增加一个生命槽"选项
  const isHPUpgradeOption = (label: string) => {
    return label.includes("永久增加一个生命槽")
  }

  // 检查是否是"永久增加一个压力槽"选项
  const isStressUpgradeOption = (label: string) => {
    return label.includes("永久增加一个压力槽")
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
            const showPopover = showHPPopover || showStressPopover

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

                            // 检查当前是否已勾选
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
    </div>
  )
}
