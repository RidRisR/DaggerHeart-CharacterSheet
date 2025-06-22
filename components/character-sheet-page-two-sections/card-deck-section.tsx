"use client"

import type React from "react"
import { useState, useEffect, useRef, memo } from "react"
import { getCardTypeName, convertToStandardCard } from "@/card"
import { CardType, createEmptyCard, StandardCard } from "@/card/card-types"
import { isVariantCard, getVariantRealType } from "@/card/card-types"
import { CardSelectionModal } from "@/components/modals/card-selection-modal"
import { SelectableCard } from "@/components/ui/selectable-card"
import type { SheetData } from "@/lib/sheet-data"
import type { CSSProperties, MouseEvent } from "react";

interface CardDeckSectionProps {
  formData: SheetData
  onCardChange: (index: number, card: StandardCard) => void
  // 移除：onFocusedCardsChange 功能由双卡组系统取代
  cardModalActiveTab: string;
  setCardModalActiveTab: React.Dispatch<React.SetStateAction<string>>;
  cardModalSearchTerm: string;
  setCardModalSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  cardModalSelectedClasses: string[];
  setCardModalSelectedClasses: React.Dispatch<React.SetStateAction<string[]>>;
  cardModalSelectedLevels: string[];
  setCardModalSelectedLevels: React.Dispatch<React.SetStateAction<string[]>>;
}

// Utility function for border color
const getBorderColor = (type?: string, isSpecial = false): string => {
  if (isSpecial) return "border-yellow-400";
  return "border-gray-300";
};

// Utility function for special slot label
const getSpecialSlotLabel = (index: number): string => {
  switch (index) {
    case 0:
      return "职业卡";
    case 1:
      return "子职业卡";
    case 2:
      return "血统卡一";
    case 3:
      return "血统卡二";
    case 4:
      return "社群卡";
    default:
      return "普通卡";
  }
};

interface CardProps {
  card: StandardCard;
  index: number;
  isSelected: boolean;
  isSpecial: boolean;
  onCardClick: (index: number) => void;
  onCardRightClick: (index: number, e: MouseEvent<HTMLDivElement>) => void;
  onHover: (index: number | null) => void;
  getPreviewPosition: (index: number) => CSSProperties;
  hoveredCard: number | null;
}

function Card({
  card,
  index,
  isSelected,
  isSpecial,
  onCardClick,
  onCardRightClick,
  onHover,
  getPreviewPosition,
  hoveredCard,
}: CardProps) {
  const standardCard = convertToStandardCard(card);

  // Enhanced card type name display for variants
  const displayTypeName = (() => {
    if (standardCard && isVariantCard(standardCard)) {
      const realType = getVariantRealType(standardCard);
      if (realType) {
        return getCardTypeName(realType);
      }
    }
    return standardCard ? getCardTypeName(standardCard.type) : "";
  })();

  return (
    <div
      className={`relative cursor-pointer transition-colors rounded-md p-1 h-16 ${isSelected ? "border-3" : "border"
        } ${getBorderColor(standardCard?.type, isSpecial)}`}
      onClick={() => onCardClick(index)}
      onContextMenu={(e) => onCardRightClick(index, e)}
      onMouseEnter={() => card?.name && onHover(index)}
      onMouseLeave={() => onHover(null)}
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
      {isSpecial && (
        <div className="absolute -top-4 left-0 right-0 text-center">
          <span className="text-[10px] font-medium bg-yellow-100 px-1 py-0 rounded-t-sm border border-yellow-300 border-b-0">
            {getSpecialSlotLabel(index)}
          </span>
        </div>
      )}

      {/* 卡牌类型标签 */}
      {!isSpecial && card?.name && standardCard?.type && (
        <div className="absolute -top-4 left-0 right-0 text-center">
          <span
            className={`text-[10px] font-medium px-1 py-0 rounded-t-sm border border-b-0 ${standardCard.type.includes("ancestry")
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
            {displayTypeName}
          </span>
        </div>
      )}

      {/* Hover preview */}
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
  );
}

const MemoizedCard = memo(Card);

export function CardDeckSection({
  formData,
  onCardChange,
  // 移除：onFocusedCardsChange 参数
  cardModalActiveTab,
  setCardModalActiveTab,
  cardModalSearchTerm,
  setCardModalSearchTerm,
  cardModalSelectedClasses,
  setCardModalSelectedClasses,
  cardModalSelectedLevels,
  setCardModalSelectedLevels,
}: CardDeckSectionProps) {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)
  // 移除：selectedCards 状态和聚焦逻辑
  const [isAltPressed, setIsAltPressed] = useState(false)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const [cardSelectionModalOpen, setCardSelectionModalOpen] = useState(false)
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null)
  
  // 移除：防止循环更新的ref，因为已不需要聚焦功能

  // 确保 formData 和 formData.cards 存在
  const cards: StandardCard[] =
    formData?.cards ||
    Array(20).fill(createEmptyCard())

  // 移除：所有与 selectedCards 和 focused_card_ids 相关的逻辑

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

  // 处理卡牌右键点击事件 - 预留给双卡组系统
  const handleCardRightClick = (index: number, e: React.MouseEvent) => {
    e.preventDefault() // 阻止默认右键菜单

    // TODO: 实现双卡组移动逻辑
    console.log(`右键点击卡牌 ${index}，将在双卡组系统中实现移动功能`);
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
          cards.map((card: StandardCard, index: number) => {
            if (!card) {
              card = createEmptyCard();
            }

            const isSpecial = index < 5;
            const isSelected = false; // 移除选中状态，双卡组系统不需要此功能

            return (
              <MemoizedCard
                key={`card-${index}`}
                card={card}
                index={index}
                isSelected={isSelected}
                isSpecial={isSpecial}
                onCardClick={handleCardClick}
                onCardRightClick={handleCardRightClick}
                onHover={setHoveredCard}
                getPreviewPosition={getPreviewPosition}
                hoveredCard={hoveredCard}
              />
            );
          })}
      </div>

      {/* 卡牌选择模态框 */}
      {selectedCardIndex !== null && (
        <CardSelectionModal
          isOpen={cardSelectionModalOpen}
          onClose={() => setCardSelectionModalOpen(false)}
          onSelect={handleCardSelect}
          selectedCardIndex={selectedCardIndex}
          // Pass down the lifted state and setters
          activeTab={cardModalActiveTab}
          setActiveTab={setCardModalActiveTab}
          searchTerm={cardModalSearchTerm}
          setSearchTerm={setCardModalSearchTerm}
          selectedClasses={cardModalSelectedClasses}
          setSelectedClasses={setCardModalSelectedClasses}
          selectedLevels={cardModalSelectedLevels}
          setSelectedLevels={setCardModalSelectedLevels}
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
