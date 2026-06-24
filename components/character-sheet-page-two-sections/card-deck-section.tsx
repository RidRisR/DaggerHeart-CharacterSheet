"use client"

import type React from "react"
import { useState, useRef, memo, useCallback, useEffect } from "react"
import { CircleAlert, CircleHelp } from "lucide-react"
import {
  isCardUpdateAuditItem,
  type CardInstanceAuditItem,
} from "@/automation/actions/card-instance-audit"
import { getCardTypeName, convertToStandardCard } from "@/card"
import { createEmptyCard, StandardCard, isEmptyCard } from "@/card/card-types"
import { isVariantCard, getVariantRealType } from "@/card/card-types"
import { useCardStore } from "@/card/stores/unified-card-store"
import { CardSelectionModal } from "@/components/modals/card-selection-modal"
import { CardInstanceAuditDialog } from "@/components/card-instance-audit-dialog"
import {
  CardAutomationSetupMarker,
  useCardAutomationSetupPrompt,
} from "@/components/card-automation-setup"
import { CardHoverPreview } from "@/components/ui/card-hover-preview"
import { calculateFloatingPreviewPosition, getCardPreviewSize } from "@/hooks/use-card-preview"
import { useTextModeStore } from "@/lib/text-mode-store"
import { showFadeNotification } from "@/components/ui/fade-notification"
import type { SheetData } from "@/lib/sheet-data"
import type { CSSProperties, MouseEvent } from "react"
import { usePinnedCardsStore } from "@/lib/pinned-cards-store"
import { useCardActions, useSheetStore } from "@/lib/sheet-store"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { projectCardAutomationSetupRequirements } from "@/card/automation/setup-projection"

interface CardDeckSectionProps {
  formData: SheetData
}

// Utility function for border color
const getBorderColor = (isSpecial = false): string => {
  if (isSpecial) return "border-yellow-400"
  return "border-gray-300"
}

// Utility function for special slot label
const getSpecialSlotLabel = (index: number): string => {
  switch (index) {
    case 0:
      return "职业";
    case 1:
      return "子职业";
    case 2:
      return "种族一";
    case 3:
      return "种族二";
    case 4:
      return "社群";
    default:
      return "普通";
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
  hasSetupRequirements: boolean;
  onSetupClick: (instanceId: string) => void;
  isTextMode: boolean;
  isMobile: boolean;
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
  hasSetupRequirements,
  onSetupClick,
  isTextMode,
  isMobile,
}: CardProps) {
  // Optimize: avoid unnecessary conversion if already StandardCard
  const standardCard = card && typeof card === 'object' && 'type' in card && 'name' in card 
    ? card as StandardCard 
    : convertToStandardCard(card);

  // Enhanced card type name display for variants
  const displayTypeName = (() => {
    if (standardCard && isVariantCard(standardCard)) {
      const realType = getVariantRealType(standardCard);
      if (realType) {
        return getCardTypeName(realType);
      }
    }

    if (standardCard) {
      const typeName = getCardTypeName(standardCard.type);
      // 如果是领域卡且有等级信息，添加等级显示
      if (standardCard.type.includes("domain") && standardCard.level) {
        return `${typeName} Lv.${standardCard.level}`;
      }
      return typeName;
    }

    return "";
  })();

  return (
    <div
      className={`relative cursor-pointer transition-colors rounded-md p-1 h-16 group ${isSelected ? "border-3" : "border"
        } ${getBorderColor(isSpecial)}`}
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
        <div className="group flex items-center justify-between !text-sm font-medium">
          <span
            className={`truncate ${!isMobile ? 'cursor-pointer hover:text-blue-600 transition-colors' : ''}`}
            onClick={(e) => {
              if (!isMobile) {
                e.stopPropagation();
                if (standardCard) {
                  onPinCard(standardCard);
                }
              }
            }}
            title={!isMobile ? "点击钉住卡牌" : undefined}
          >
            {standardCard?.name || card.name}
          </span>
          <div className="flex-1"></div>
          {hasSetupRequirements && standardCard?.instanceId && (
            <CardAutomationSetupMarker
              cardName={standardCard.name}
              onClick={() => onSetupClick(standardCard.instanceId!)}
            />
          )}
          {!isSpecial && (
            <button
              className="ml-2 text-gray-400 hover:text-red-500 transition-all duration-200 !text-sm opacity-0 group-hover:opacity-100"
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
        <div className="flex justify-between items-center !text-xs text-gray-500">
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
          <CardHoverPreview card={standardCard} isTextMode={isTextMode} />
        </div>
      )}
    </div>
  )
}

const MemoizedCard = memo(Card)

export function CardDeckSection({
  formData,
}: CardDeckSectionProps) {
  // 钉住卡牌功能
  const { pinCard } = usePinnedCardsStore();
  // 卡牌操作方法
  const { deleteCard, moveCard } = useCardActions();
  const selectCardForSlot = useSheetStore(state => state.selectCardForSlot)
  const setCardAbilityChoiceValuesForInstance = useSheetStore(state => state.setCardAbilityChoiceValuesForInstance)
  const auditCardInstancesOnLoad = useSheetStore(state => state.auditCardInstancesOnLoad)
  const overwriteCardInstancesFromAudit = useSheetStore(state => state.overwriteCardInstancesFromAudit)
  const sheetLoadRevision = useSheetStore(state => state.sheetLoadRevision)
  const runtimeInitialized = useCardStore(state => state.initialized)
  const runtimeLoading = useCardStore(state => state.loading)
  const getRuntimeCardById = useCardStore(state => state.getCardById)
  // 文字模式状态
  const { isTextMode } = useTextModeStore();
  // 移动端检测
  const isMobile = useIsMobile();
  // 卡组视图状态
  const [activeDeck, setActiveDeck] = useState<'focused' | 'inventory'>('focused');

  const [hoveredCard, setHoveredCard] = useState<number | null>(null)
  const [auditItems, setAuditItems] = useState<CardInstanceAuditItem[]>([])
  const [auditDialogOpen, setAuditDialogOpen] = useState(false)
  const lastAuditedSheetLoadRevisionRef = useRef<number | null>(null)
  const setupPrompt = useCardAutomationSetupPrompt({
    sheetData: formData,
    onSaveAbility: setCardAbilityChoiceValuesForInstance,
  })

  const refreshCardAudit = useCallback(() => {
    if (!runtimeInitialized || runtimeLoading) {
      setAuditItems([])
      return []
    }

    const report = auditCardInstancesOnLoad((templateId) => getRuntimeCardById(templateId) ?? undefined)
    const updateItems = report.items.filter(isCardUpdateAuditItem)
    setAuditItems(updateItems)
    return updateItems
  }, [auditCardInstancesOnLoad, getRuntimeCardById, runtimeInitialized, runtimeLoading])

  useEffect(() => {
    if (
      !runtimeInitialized ||
      runtimeLoading ||
      lastAuditedSheetLoadRevisionRef.current === sheetLoadRevision
    ) {
      return
    }

    lastAuditedSheetLoadRevisionRef.current = sheetLoadRevision
    refreshCardAudit()
  }, [refreshCardAudit, runtimeInitialized, runtimeLoading, sheetLoadRevision])

  // 优化的hover处理函数，确保立即响应
  const handleCardHover = useCallback((cardIndex: number | null) => {
    setHoveredCard(cardIndex);
  }, []);

  // 移除：selectedCards 状态和聚焦逻辑
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const [cardSelectionModalOpen, setCardSelectionModalOpen] = useState(false)
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null)

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

  // 移除：Alt键监听逻辑，已不需要

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
      const result = selectCardForSlot({
        zone: activeDeck === 'inventory' ? "vault" : "loadout",
        index: selectedCardIndex,
        template: card,
      });
      setupPrompt.handleSelectionResult(result);
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

    return calculateFloatingPreviewPosition({
      triggerRect: card.getBoundingClientRect(),
      previewSize: getCardPreviewSize(isTextMode),
    })
  }

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <div className="h-px bg-gray-800 flex-grow"></div>
        <h3 className="!text-sm font-bold text-center mx-2 print:mb-4 flex items-center justify-center gap-1">
          <span>卡组</span>
          <button
            type="button"
            aria-label={auditItems.length > 0 ? "更新卡牌，有可更新项目" : "检查卡牌更新"}
            title={auditItems.length > 0 ? "有卡牌可以用卡包数据更新" : "检查卡牌更新"}
            onClick={() => {
              refreshCardAudit()
              setAuditDialogOpen(true)
            }}
            className={cn(
              "print:hidden inline-flex h-5 w-5 items-center justify-center rounded text-current opacity-70 transition-opacity hover:opacity-100",
              auditItems.length > 0 && "text-red-600 opacity-100 hover:text-red-700",
            )}
          >
            {auditItems.length > 0 ? (
              <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        </h3>
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
        <div className="!text-xs text-gray-500">
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
            const hasSetupRequirements = Boolean(
              card.instanceId &&
              projectCardAutomationSetupRequirements(formData, {
                cardInstanceId: card.instanceId,
              }).length > 0
            );

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
                  hasSetupRequirements={hasSetupRequirements}
                  onSetupClick={setupPrompt.openForCard}
                  isTextMode={isTextMode}
                  isMobile={isMobile}
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
          initialTab="domain"
        />
      )}

      <CardInstanceAuditDialog
        open={auditDialogOpen}
        items={auditItems}
        onConfirm={(selectedItems) => {
          const result = overwriteCardInstancesFromAudit(selectedItems)
          if (result.kind === "failure") {
            showFadeNotification({
              message: result.message,
              type: "error",
            })
            return
          }

          refreshCardAudit()
          setAuditDialogOpen(false)
        }}
        onOpenChange={setAuditDialogOpen}
      />

      {setupPrompt.dialog}

      {/* 添加自定义边框宽度样式 */}
      <style>{`
        .border-3 {
          border-width: 3px;
        }
      `}</style>
    </div>
  )
}
