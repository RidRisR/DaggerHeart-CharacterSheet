"use client"
import type { SheetData } from "@/lib/sheet-data"

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
              <div className="flex-1 ml-2">
                <span className="text-gray-800 dark:text-gray-200 mr-1">{option.label}</span>
              </div>
            </div>
          ))}
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
