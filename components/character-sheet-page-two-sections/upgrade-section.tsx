"use client"

interface UpgradeSectionProps {
  tier: number
  title: string
  description: string
  formData: any
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
            ? "Choose two available options from the list below and mark them."
            : "Choose two from the list below or any unmarked from the previous tier and mark them."}
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

        <div className="mt-1 text-[9px]">
          {tier === 1 && (
            <>
              Then increase your Severe Damage Threshold by +2 and choose a new Domain Deck card at your Level or lower.
            </>
          )}
          {tier === 2 && (
            <>
              Increase your Damage Thresholds: Major by +1 and Severe by +3. Then choose a new Domain Deck card at your
              Level or lower.
            </>
          )}
          {tier === 3 && (
            <>
              Increase your Damage Thresholds: Major by +2 and Severe by +4. Then choose a new Domain Deck card at your
              Level or lower.
            </>
          )}
        </div>
      </div>
    </div>
  )
}
