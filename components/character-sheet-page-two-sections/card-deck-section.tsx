"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { getCardTypeName, convertToStandardCard } from "@/data/card"
import { createEmptyCard, isEmptyCard, specialCardPositions, StandardCard } from "@/data/card/card-types"
import { CardSelectionModal } from "@/components/modals/card-selection-modal"
import { saveFocusedCardIds, loadFocusedCardIds } from "@/lib/storage" // Import storage functions
import { SelectableCard } from "@/components/ui/selectable-card"
import type { FormData } from "@/lib/form-data"

interface CardDeckSectionProps {
  formData: FormData
  onCardChange: (index: number, card: StandardCard) => void
}

export function CardDeckSection({ formData, onCardChange }: CardDeckSectionProps) {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)
  const [selectedCards, setSelectedCards] = useState<number[]>([])
  const [isAltPressed, setIsAltPressed] = useState(false)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const [cardSelectionModalOpen, setCardSelectionModalOpen] = useState(false)
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null)

  // 确保 formData 和 formData.cards 存在
  const cards: StandardCard[] =
    formData?.cards ||
    Array(20).fill(createEmptyCard())

  // Initialize selected cards from localStorage or default to first four
  useEffect(() => {
    const loadedFocusedCardIds = loadFocusedCardIds()
    const initialSelectedIndices = cards.map((card: StandardCard, index: number) => {
      // Ensure card and card.id are valid before using them
      return card && card.id && loadedFocusedCardIds.includes(card.id) ? index : -1
    }).filter((index: number) => index !== -1)

    if (initialSelectedIndices.length > 0) {
      setSelectedCards(initialSelectedIndices)
    }
  }, [cards]) // Rerun when cards data changes

  // Save selected card IDs to localStorage whenever selectedCards changes
  useEffect(() => {
    const idsToSave = selectedCards.map((index: number) => cards[index]?.id).filter(id => id != null) as string[]
    saveFocusedCardIds(idsToSave)
  }, [selectedCards, cards])

  // 监听Alt键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Alt") {
        setIsAltPressed(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Alt") {
        setIsAltPressed(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [])

  // 检查是否是特殊卡位（前四个位置）
  const isSpecialSlot = (index: number): boolean => {
    return index < 5; // 更新逻辑支持前五个位置
  }

  // 获取特殊卡位的标签
  const getSpecialSlotLabel = (index: number): string => {
    switch (index) {
      case 0:
        return "职业卡"
      case 1:
        return "子职业卡"
      case 2:
        return "血统卡一"
      case 3:
        return "血统卡二"
      case 4:
        return "社群卡" // 添加子职业卡标签
      default:
        return "普通卡"
    }
  }

  // 获取卡牌类型的边框颜色
  const getBorderColor = (type?: string, isSpecial = false) => {
    if (isSpecial) return "border-yellow-400"
    return "border-gray-300"
  }

  // 处理卡牌右键点击事件
  const handleCardRightClick = (index: number, e: React.MouseEvent) => {
    e.preventDefault() // 阻止默认右键菜单

    // 特殊卡位不允许取消选中
    // if (isSpecialSlot(index)) return

    // 确保 selectedCards 存在
    setSelectedCards((prev) => {
      if (!prev) return [index]

      if (prev.includes(index)) {
        return prev.filter((i) => i !== index)
      } else {
        return [...prev, index]
      }
    })
  }

  // 处理卡牌点击事件
  const handleCardClick = (index: number) => {
    // 特殊卡位不允许修改
    if (isSpecialSlot(index)) return

    // 对于普通卡牌，打开卡牌选择模态框
    setSelectedCardIndex(index)
    setCardSelectionModalOpen(true)
  }

  // 处理卡牌选择
  const handleCardSelect = (card: StandardCard) => {
    if (selectedCardIndex !== null && onCardChange) {
      onCardChange(selectedCardIndex, card)
      setCardSelectionModalOpen(false)
      setSelectedCardIndex(null)
    }
  }

  // 计算悬浮窗位置
  const getPreviewPosition = (index: number): React.CSSProperties => {
    if (!cardRefs.current[index]) return {}

    const card = cardRefs.current[index]
    if (!card) return {}

    const rect = card.getBoundingClientRect()
    const isRightSide = rect.left > window.innerWidth / 2

    return {
      position: "fixed",
      top: `${rect.top}px`,
      left: isRightSide ? "auto" : `${rect.right + 10}px`,
      right: isRightSide ? `${window.innerWidth - rect.left + 10}px` : "auto",
      maxHeight: "80vh",
      overflowY: "auto",
      zIndex: 1000,
    }
  }

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <div className="h-px bg-gray-800 flex-grow"></div>
        <h3 className="text-sm font-bold text-center mx-2">卡组</h3>
        <div className="h-px bg-gray-800 flex-grow"></div>
      </div>

      <div className="grid grid-cols-4 gap-1">
        {cards &&
          Array.isArray(cards) &&
          cards.map((card: any, index: number) => {
            // 确保卡牌对象存在
            if (!card) {
              card = createEmptyCard()
            }

            const isSpecial = index < 5 // 确保前四张卡都被识别为特殊卡
            const isSelected = selectedCards.includes(index)

            // 安全地转换为标准格式
            let standardCard

            try {
              if (isEmptyCard(card)) {
                // 为空卡牌添加默认类型
                const defaultType = isSpecial
                  ? specialCardPositions[index as keyof typeof specialCardPositions]?.type || "unknown"
                  : "unknown"
                standardCard = createEmptyCard(defaultType)
              } else {
                standardCard = convertToStandardCard(card)
              }
            } catch (error) {
              console.error(`处理卡牌 ${index} 时出错:`, error)
              console.error(`问题卡牌数据:`, card)
              // 为错误卡牌添加默认类型
              const defaultType = isSpecial
                ? specialCardPositions[index as keyof typeof specialCardPositions]?.type || "unknown"
                : "unknown"
              standardCard = createEmptyCard(defaultType)
            }

            return (
              <div
                key={`card-${index}`}
                ref={(el) => { cardRefs.current[index] = el }}
                className={`relative cursor-pointer transition-colors rounded-md p-1 h-16 ${
                  isSelected ? "border-3" : "border"
                  } ${getBorderColor(standardCard?.type, isSpecial)}`}
                onClick={() => handleCardClick(index)}
                onContextMenu={(e) => handleCardRightClick(index, e)}
                onMouseEnter={() => card?.name && setHoveredCard(index)}
                onMouseLeave={() => {
                  setHoveredCard(null)
                  setIsAltPressed(false)
                }}
              >
                {/* 卡牌标题 */}
                {card?.name && <div className="text-sm font-medium">{standardCard?.name || card.name}</div>}

                {/* 分隔线 */}
                <div className="h-px bg-gray-300 w-full my-0.5"></div>

                {/* 卡牌底部信息 */}
                {card?.name && (
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span className="truncate max-w-[33%]">
                      {standardCard?.cardSelectDisplay?.item1 || ""}
                    </span>
                    <span className="truncate max-w-[33%]">{standardCard?.cardSelectDisplay?.item2 || ""}</span>
                    <span className="truncate max-w-[33%]">{standardCard?.cardSelectDisplay?.item3 || ""}</span>
                  </div>
                )}

                {/* 特殊卡位标签 */}
                {isSpecialSlot(index) && (
                  <div className="absolute -top-4 left-0 right-0 text-center">
                    <span className="text-[10px] font-medium bg-yellow-100 px-1 py-0 rounded-t-sm border border-yellow-300 border-b-0">
                      {getSpecialSlotLabel(index)}
                    </span>
                  </div>
                )}

                {/* 卡牌类型标签 */}
                {!isSpecialSlot(index) && card?.name && standardCard?.type && (
                  <div className="absolute -top-4 left-0 right-0 text-center">
                    <span
                      className={`text-[10px] font-medium px-1 py-0 rounded-t-sm border border-b-0 ${
                        standardCard.type.includes("ancestry")
                        ? "bg-gray-100 border-gray-300"
                        : standardCard.type.includes("community")
                          ? "bg-teal-100 border-teal-300"
                          : standardCard.type.includes("profession")
                            ? "bg-blue-100 border-blue-300"
                            : standardCard.type.includes("subclass")
                              ? "bg-purple-100 border-purple-300"
                              : "bg-red-100 border-red-300"
                      }`}
                    >
                      {getCardTypeName(standardCard.type)}
                    </span>
                  </div>
                )}

                {/* Hover preview: 替换为 SelectableCard */}
                {hoveredCard === index && card?.name && (
                  <div
                    className="absolute z-50"
                    style={getPreviewPosition(index)}
                  >
                    <SelectableCard
                      card={standardCard}
                      onClick={() => { }}
                      isSelected={isSelected}
                    />
                  </div>
                )}
              </div>
            )
          })}
      </div>

      {/* 卡牌选择模态框 */}
      {selectedCardIndex !== null && (
        <CardSelectionModal
          isOpen={cardSelectionModalOpen}
          onClose={() => setCardSelectionModalOpen(false)}
          onSelect={handleCardSelect}
          selectedCardIndex={selectedCardIndex}
        />
      )}

      {/* 添加自定义边框宽度样式 */}
      <style jsx global>{`
        .border-3 {
          border-width: 3px;
        }
      `}</style>
    </div>
  )
}
