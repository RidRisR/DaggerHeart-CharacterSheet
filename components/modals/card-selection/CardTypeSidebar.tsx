"use client"

import { useState, useMemo } from "react"
import { CardType, CardCategory, getCardTypesByCategory, ALL_CARD_TYPES } from "@/card/card-types"
import { getCardTypeName } from "@/card"
import { cn } from "@/lib/utils"

interface CardTypeSidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

/**
 * 卡牌类型侧边栏组件
 *
 * 功能：
 * - 显示标准卡牌和扩展卡牌两个分组
 * - 支持分组折叠/展开
 * - 高亮当前选中的卡牌类型
 */
export function CardTypeSidebar({ activeTab, onTabChange }: CardTypeSidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState(
    new Set(['standard', 'extended'])
  )

  // 按类别分组的卡牌类型
  const cardTypesByCategory = useMemo(() => {
    // 标准卡牌的期望顺序
    const desiredOrder = [
      CardType.Domain,      // 领域
      CardType.Profession,  // 职业
      CardType.Subclass,    // 子职业
      CardType.Ancestry,    // 种族
      CardType.Community,   // 社群
    ]

    let standard = getCardTypesByCategory(CardCategory.Standard)
    const extended = getCardTypesByCategory(CardCategory.Extended)

    // 对 standard 数组进行排序
    standard.sort((a, b) => {
      const indexA = desiredOrder.indexOf(a as CardType)
      const indexB = desiredOrder.indexOf(b as CardType)

      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB
      }
      if (indexA !== -1) return -1
      if (indexB !== -1) return 1
      return a.localeCompare(b)
    })

    return { standard, extended }
  }, [])

  // 切换分组展开状态
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        newSet.delete(category)
      } else {
        newSet.add(category)
      }
      return newSet
    })
  }

  return (
    <div className="flex flex-col p-2">
      {/* 标准卡牌分组 */}
      <div className="mb-2">
        <button
          onClick={() => toggleCategory('standard')}
          className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded"
        >
          <span>标准卡牌</span>
          <span className={cn(
            "transform transition-transform",
            expandedCategories.has('standard') && "rotate-90"
          )}>
            ▶
          </span>
        </button>

        {expandedCategories.has('standard') && (
          <div className="ml-2 mt-1 space-y-1">
            {cardTypesByCategory.standard.map((type) => (
              <button
                key={type}
                onClick={() => onTabChange(type)}
                className={cn(
                  "w-full text-left px-4 py-2 text-sm rounded",
                  activeTab === type
                    ? "bg-blue-100 text-blue-700 font-medium"
                    : "hover:bg-gray-100 text-gray-600"
                )}
              >
                {ALL_CARD_TYPES.get(type) || type}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 扩展卡牌分组 */}
      {cardTypesByCategory.extended.length > 0 && (
        <div className="mb-2">
          <button
            onClick={() => toggleCategory('extended')}
            className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded"
          >
            <span>扩展卡牌</span>
            <span className={cn(
              "transform transition-transform",
              expandedCategories.has('extended') && "rotate-90"
            )}>
              ▶
            </span>
          </button>

          {expandedCategories.has('extended') && (
            <div className="ml-2 mt-1 space-y-1">
              {cardTypesByCategory.extended.map((type) => (
                <button
                  key={type}
                  onClick={() => onTabChange(type)}
                  className={cn(
                    "w-full text-left px-4 py-2 text-sm rounded",
                    activeTab === type
                      ? "bg-blue-100 text-blue-700 font-medium"
                      : "hover:bg-gray-100 text-gray-600"
                  )}
                >
                  {getCardTypeName(type)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
