"use client"

import type React from "react"
import { useState, useEffect, useRef, memo, useCallback } from "react"
import { getCardTypeName, convertToStandardCard } from "@/card"
import { CardType, createEmptyCard, StandardCard, isEmptyCard } from "@/card/card-types"
import { isVariantCard, getVariantRealType } from "@/card/card-types"
import { CardSelectionModal } from "@/components/modals/card-selection-modal"
import { CardHoverPreview } from "@/components/ui/card-hover-preview"
import { toast } from "@/hooks/use-toast"
import { showFadeNotification } from "@/components/ui/fade-notification"
import type { SheetData } from "@/lib/sheet-data"
import type { CSSProperties, MouseEvent } from "react"
import { usePinnedCardsStore } from "@/lib/pinned-cards-store"
import { useCardActions } from "@/lib/sheet-store"

interface CardDeckSectionProps {
  formData: SheetData
  onCardChange: (index: number, card: StandardCard) => void
  onInventoryCardChange: (index: number, card: StandardCard) => void // 新增：库存卡组修改函数
  // 移除：onCardMove 功能现在由 store 处理
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
  if (isSpecial) return "border-yellow-400"
  return "border-gray-300"
}

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
  onPinCard: (card: StandardCard) => void;
  onCardDelete: (index: number) => void;
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
  onPinCard,
  onCardDelete,
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
      className={`relative cursor-pointer transition-colors rounded-md p-1 h-16 group ${isSelected ? "border-3" : "border"
        } ${getBorderColor(standardCard?.type, isSpecial)}`}
      onClick={() => onCardClick(index)}
      onContextMenu={(e) => onCardRightClick(index, e)}
      onMouseEnter={() => {
        if (card?.name) {
          onHover(index);
        }
      }}
      onMouseLeave={() => {
        onHover(null);
      }}
    >
      {/* 卡牌标题 */}
      {card?.name && (
        <div className="group flex items-center justify-between text-sm font-medium">
          <span
            className="truncate cursor-pointer hover:text-blue-600 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              if (standardCard) {
                onPinCard(standardCard);
              }
            }}
            title="点击钉住卡牌"
          >
            {standardCard?.name || card.name}
          </span>
          <div className="flex-1"></div>
          {!isSpecial && (
            <button
              className="ml-2 text-gray-400 hover:text-red-500 transition-all duration-200 text-xs opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onCardDelete(index);
              }}
              title="删除卡牌"
            >
              ×
            </button>
          )}
        </div>
      )}

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
            className={`text-[10px] font-medium px-1 py-0 rounded-t-sm border border-b-0 ${isVariantCard(standardCard)
              ? "bg-green-100 border-green-300"
              : standardCard.type.includes("ancestry")
                ? "bg-gray-100 border-gray-300"
                : standardCard.type.includes("community")
                  ? "bg-teal-100 border-teal-300"
                  : standardCard.type.includes("profession")
                    ? "bg-blue-100 border-blue-300"
                    : standardCard.type.includes("subclass")
                      ? "bg-purple-100 border-purple-300"
                      : standardCard.type.includes("domain")
                        ? "bg-red-100 border-red-300"
                        : "bg-gray-100 border-gray-300"
              }`}
          >
            {displayTypeName}
          </span>
        </div>
      )}

      {/* Hover preview */}
      {hoveredCard === index && card?.name && (
        <div className="absolute z-50 pointer-events-none" style={getPreviewPosition(index)}>
          <CardHoverPreview card={standardCard} />
        </div>
      )}
    </div>
  )
}

const MemoizedCard = memo(Card)

export function CardDeckSection({
  formData,
  onCardChange,
  onInventoryCardChange, // 新增参数
  // 移除：onCardMove 参数，现在由 store 处理
  cardModalActiveTab,
  setCardModalActiveTab,
  cardModalSearchTerm,
  setCardModalSearchTerm,
  cardModalSelectedClasses,
  setCardModalSelectedClasses,
  cardModalSelectedLevels,
  setCardModalSelectedLevels,
}: CardDeckSectionProps) {
  // 钉住卡牌功能
  const { pinCard } = usePinnedCardsStore();
  // 卡牌操作方法
  const { deleteCard, moveCard } = useCardActions();
  // 卡组视图状态
  const [activeDeck, setActiveDeck] = useState<'focused' | 'inventory'>('focused');

  const [hoveredCard, setHoveredCard] = useState<number | null>(null)

  // 优化的hover处理函数，确保立即响应
  const handleCardHover = useCallback((cardIndex: number | null) => {
    setHoveredCard(cardIndex);
  }, []);

  // 移除：selectedCards 状态和聚焦逻辑
  const [isAltPressed, setIsAltPressed] = useState(false)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const [cardSelectionModalOpen, setCardSelectionModalOpen] = useState(false)
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null)

  // 移除：防止循环更新的ref，因为已不需要聚焦功能

  // 获取当前卡组数据的辅助函数
  const getCurrentDeckCards = (deckType: 'focused' | 'inventory'): StandardCard[] => {
    const sourceCards = deckType === 'focused' 
      ? (formData?.cards || [])
      : (formData?.inventory_cards || []);
    
    // 确保数组长度为20，不足的用空卡填充
    const result = Array(20).fill(0).map((_, index) => 
      sourceCards[index] || createEmptyCard()
    );
    
    return result;
  };

  // 确保 formData 和当前卡组存在
  const cards: StandardCard[] = getCurrentDeckCards(activeDeck);

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

  // 检查是否是特殊卡位（聚焦卡组的前五个位置）
  const isSpecialSlot = (index: number): boolean => {
    return activeDeck === 'focused' && index < 5;
  }

  // 处理卡牌右键点击事件 - 使用 store 方法
  const handleCardRightClick = (index: number, e: React.MouseEvent) => {
    e.preventDefault(); // 阻止默认右键菜单
    
    const isFromFocused = activeDeck === 'focused';
    const fromInventory = activeDeck === 'inventory';
    const toInventory = !fromInventory;
    
    const success = moveCard(index, fromInventory, toInventory);
    
    if (success) {
      showFadeNotification({
        message: `卡牌已移动到${isFromFocused ? '库存' : '聚焦'}卡组`,
        type: "success"
      });
    } else {
      // 移动失败，可能是特殊卡位保护或目标卡组已满
      if (isFromFocused && index < 5) {
        showFadeNotification({
          message: "特殊卡位不能移动到库存卡组",
          type: "error"
        });
      } else {
        showFadeNotification({
          message: `移动失败，目标卡组可能已满或卡牌为空`,
          type: "error"
        });
      }
    }
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
    if (selectedCardIndex !== null) {
      if (activeDeck === 'focused') {
        onCardChange(selectedCardIndex, card);
      } else {
        onInventoryCardChange(selectedCardIndex, card);
      }
      setCardSelectionModalOpen(false);
      setSelectedCardIndex(null);
    }
  }

  // 处理卡牌删除 - 使用 store 方法
  const handleCardDelete = (index: number) => {
    // 特殊卡位不允许删除
    if (isSpecialSlot(index)) return

    deleteCard(index, activeDeck === 'inventory');
  }

  // 计算悬浮窗位置 - 智能定位
  const getPreviewPosition = (index: number): React.CSSProperties => {
    if (!cardRefs.current[index]) return {}

    const card = cardRefs.current[index]
    if (!card) return {}

    const rect = card.getBoundingClientRect()
    const previewWidth = 520 // CardHoverPreview 的宽度
    const previewHeight = 280 // CardHoverPreview 的估计高度
    const gap = 10 // 间距

    // 计算各个方向的可用空间
    const spaceLeft = rect.left
    const spaceRight = window.innerWidth - rect.right
    const spaceTop = rect.top
    const spaceBottom = window.innerHeight - rect.bottom

    // 优先选择左右侧面，然后是上下
    let position: React.CSSProperties = {
      position: "fixed",
      zIndex: 9999, // 确保最高优先级
      maxHeight: "80vh",
      overflowY: "auto",
    }

    // 1. 优先尝试右侧
    if (spaceRight >= previewWidth + gap) {
      position.left = `${rect.right + gap}px`
      position.top = `${Math.max(0, rect.top - (previewHeight - rect.height) / 2)}px`
    }
    // 2. 其次尝试左侧
    else if (spaceLeft >= previewWidth + gap) {
      position.right = `${window.innerWidth - rect.left + gap}px`
      position.top = `${Math.max(0, rect.top - (previewHeight - rect.height) / 2)}px`
    }
    // 3. 再尝试上方
    else if (spaceTop >= previewHeight + gap) {
      position.bottom = `${window.innerHeight - rect.top + gap}px`
      position.left = `${Math.max(0, rect.left - (previewWidth - rect.width) / 2)}px`
    }
    // 4. 最后尝试下方
    else if (spaceBottom >= previewHeight + gap) {
      position.top = `${rect.bottom + gap}px`
      position.left = `${Math.max(0, rect.left - (previewWidth - rect.width) / 2)}px`
    }
    // 5. 如果都不够，选择空间最大的方向
    else {
      const maxSpace = Math.max(spaceLeft, spaceRight, spaceTop, spaceBottom)

      if (maxSpace === spaceRight) {
        position.left = `${rect.right + gap}px`
        position.top = `${Math.max(0, rect.top - (previewHeight - rect.height) / 2)}px`
      } else if (maxSpace === spaceLeft) {
        position.right = `${window.innerWidth - rect.left + gap}px`
        position.top = `${Math.max(0, rect.top - (previewHeight - rect.height) / 2)}px`
      } else if (maxSpace === spaceTop) {
        position.bottom = `${window.innerHeight - rect.top + gap}px`
        position.left = `${Math.max(0, rect.left - (previewWidth - rect.width) / 2)}px`
      } else {
        position.top = `${rect.bottom + gap}px`
        position.left = `${Math.max(0, rect.left - (previewWidth - rect.width) / 2)}px`
      }
    }

    return position
  }

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <div className="h-px bg-gray-800 flex-grow"></div>
        <h3 className="text-sm font-bold text-center mx-2">卡组</h3>
        <div className="h-px bg-gray-800 flex-grow"></div>
      </div>

      {/* 卡组切换标签和操作提示 - 打印时隐藏 */}
      <div className="flex items-center justify-between mb-4 border-b border-gray-200 print:hidden">
        <div className="flex">
          <button
            className={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${activeDeck === 'focused'
              ? 'border-blue-500 text-blue-600 bg-blue-50'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            onClick={() => setActiveDeck('focused')}
          >
            聚焦卡组 ({getCurrentDeckCards('focused').filter(card => !isEmptyCard(card)).length}/20)
          </button>
          <button
            className={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${activeDeck === 'inventory'
              ? 'border-green-500 text-green-600 bg-green-50'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            onClick={() => setActiveDeck('inventory')}
          >
            库存卡组 ({getCurrentDeckCards('inventory').filter(card => !isEmptyCard(card)).length}/20)
          </button>
        </div>

        {/* 操作提示 */}
        <div className="text-xs text-gray-500">
          💡 左键进入卡牌选择，右键移动卡牌到其他卡组
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1">
        {cards &&
          Array.isArray(cards) &&
          cards.map((card: StandardCard, index: number) => {
            if (!card) {
              card = createEmptyCard();
            }

            const isSpecial = isSpecialSlot(index);
            const isSelected = false; // 移除选中状态，双卡组系统不需要此功能

            return (
              <div
                key={`card-${activeDeck}-${index}`}
                ref={(el) => {
                  cardRefs.current[index] = el;
                }}
              >
                <MemoizedCard
                  card={card}
                  index={index}
                  isSelected={isSelected}
                  isSpecial={isSpecial}
                  onCardClick={handleCardClick}
                  onCardRightClick={handleCardRightClick}
                  onHover={handleCardHover}
                  getPreviewPosition={getPreviewPosition}
                  hoveredCard={hoveredCard}
                  onPinCard={pinCard}
                  onCardDelete={handleCardDelete}
                />
              </div>
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
