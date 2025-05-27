"use client"
import type { FormData } from "@/lib/form-data"

interface UpgradeSectionProps {
  tier: number
  title: string
  description: string
  formData: FormData
  isUpgradeChecked: (tier: string, index: number) => boolean
  handleUpgradeCheck: (tier: string, index: number) => void
  getUpgradeOptions: (profession: string, tier: number) => any[]
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
      <div className="bg-gray-800 text-white p-1 text-center font-bold text-sm rounded-t-md">{title}</div>
      <div className="bg-gray-600 text-white p-1 text-xs">{description}</div>
      <div className="p-1">
        <p className="text-xs mb-1">
          {tier === 1
            ? "从下方列表中选择并标记两个升级选项。"
            : "从下方列表或更低级的升级列表中选择并标记两个升级选项。"}
        </p>

        <div className="space-y-0.5">
          {getUpgradeOptions(formData.profession, tier).map((option, index) => (
            <div key={`${tierKey}-${index}`} className="flex items-start">
              {option.doubleBox ? (
                <div className="flex mr-1">
                  <div
                    className={`w-3 h-3 border border-gray-800 mr-0.5 cursor-pointer ${
                      isUpgradeChecked(tierKey, index) ? "bg-gray-800" : "bg-white"
                    }`}
                    onClick={() => handleUpgradeCheck(tierKey, index)}
                  ></div>
                  <div
                    className={`w-3 h-3 border border-gray-800 cursor-pointer ${
                      isUpgradeChecked(tierKey, index) ? "bg-gray-800" : "bg-white"
                    }`}
                    onClick={() => handleUpgradeCheck(tierKey, index)}
                  ></div>
                </div>
              ) : (
                <div
                  className={`w-3 h-3 border border-gray-800 mr-1 cursor-pointer ${
                    isUpgradeChecked(tierKey, index) ? "bg-gray-800" : "bg-white"
                  }`}
                  onClick={() => handleUpgradeCheck(tierKey, index)}
                ></div>
              )}
              <span className="text-[9px]">{option.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-1 text-xs">
          {tier === 1 && (
            <>
              更新等级，将伤害阈值+1，选择一张不高于你当前等级的领域卡加入卡组。
            </>
          )}
          {tier === 2 && (
            <>
              更新等级，将伤害阈值+1，选择一张不高于你当前等级的领域卡加入卡组。
            </>
          )}
          {tier === 3 && (
            <>
              更新等级，将伤害阈值+1，选择一张不高于你当前等级的领域卡加入卡组。
            </>
          )}
        </div>
      </div>
    </div>
  )
}
