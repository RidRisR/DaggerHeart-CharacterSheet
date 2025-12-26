"use client"

import { useSheetStore } from "@/lib/sheet-store"
import type { MaterialCost, ScrapMaterials } from './types'
import { checkMaterialRequirements, renderMaterialCost, getMaterialCostWithAvailability } from './material-utils'

interface UpgradeItemProps {
  title: string
  cost: MaterialCost
  tier: 'basic' | 'tier2' | 'tier3' | 'tier4'
  checkboxes?: number
  scrapMaterials?: ScrapMaterials
}

export const UpgradeItem = ({
  title,
  cost,
  tier,
  checkboxes = 1,
  scrapMaterials,
}: UpgradeItemProps) => {
  const { sheetData, updateUpgrade } = useSheetStore()
  const maxCheckboxes = 3; // 最大格子数，用于对齐

  // 从 store 读取当前强化件的勾选状态
  const upgradeState = sheetData.armorTemplate?.upgrades?.[tier]?.[title]

  // 转换为 boolean 数组格式
  const checkedArray: boolean[] = Array.isArray(upgradeState)
    ? upgradeState.slice(0, checkboxes) // 确保长度匹配
    : checkboxes === 1 && typeof upgradeState === 'boolean'
    ? [upgradeState]
    : Array(checkboxes).fill(false)

  // 检查材料是否满足需求
  const materialCheck = checkMaterialRequirements(cost, scrapMaterials)
  const { insufficientMaterials } = materialCheck
  
  // 分离标题和描述
  const parts = title.split(/：|:/);
  const mainTitle = parts[0];
  const description = parts.length > 1 ? parts.slice(1).join(':').trim() : '';

  return (
    <div className="flex items-start gap-1.5 mb-0.5 text-[9pt] leading-[1.3] rounded-sm px-1 py-0.5">
      {/* 格子区，右对齐，预留最大格子宽度 */}
      <span className="flex flex-shrink-0 items-center justify-end gap-0.5 mt-px" style={{ minWidth: '2.8em' }}>
        {Array(maxCheckboxes - checkboxes).fill(0).map((_, i) => (
          <span key={`empty-${i}`} className="inline-block align-middle w-[1em] h-[1em]" />
        ))}
        {Array(checkboxes).fill(0).map((_, i) => (
          <span
            key={i}
            className={`inline-block align-middle w-[1em] h-[1em] border border-gray-800 ${checkedArray[i] ? 'bg-gray-800' : 'bg-white'} cursor-pointer transition-colors`}
            style={{ borderRadius: '2px', marginLeft: i === 0 && (maxCheckboxes - checkboxes) === 0 ? 0 : '0.08em' }}
            onClick={() => {
              const newChecked = [...checkedArray];
              newChecked[i] = !newChecked[i];

              // 如果只有一个复选框，存储为 boolean；多个则存储为 boolean[]
              const valueToStore = checkboxes === 1 ? newChecked[0] : newChecked;
              updateUpgrade(tier, title, valueToStore);
            }}
            tabIndex={0}
            role="checkbox"
            aria-checked={checkedArray[i]}
          ></span>
        ))}
      </span>
      {/* 标题、描述和花费信息 */}
      <div className="flex-1">
        <div>
          <span className="font-bold text-gray-800 mr-1">{mainTitle}</span>
          {description && <span className="text-gray-700">{description}</span>}
        </div>
        <div 
          className="text-[10px] text-gray-500 leading-tight export-cost-container"
          data-static-cost={renderMaterialCost(cost)}
        >
          {/* 非打印模式：显示嵌入可用性信息的成本 */}
          <div className="print:hidden">
            {getMaterialCostWithAvailability(cost, scrapMaterials).map((part, index, array) => (
              <span key={index}>
                <span className={part.isSufficient ? "text-green-600" : ""}>
                  {part.text}
                </span>
                {index < array.length - 1 && ', '}
              </span>
            ))}
          </div>
          
          {/* 打印模式：只显示基本需求 */}
          <div className="hidden print:block">
            {renderMaterialCost(cost)}
          </div>
        </div>
      </div>
    </div>
  );
};