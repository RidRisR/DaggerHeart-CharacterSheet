"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { StandardCard, isEmptyCard } from "@/card/card-types"
import { ImageCard } from "@/components/ui/image-card"
import { SimpleImageCard } from "@/components/ui/simple-image-card"
import { AddCardPlaceholder } from "@/components/ui/add-card-placeholder"
import { isVariantCard } from "@/card/card-types"

interface CardDrawerProps {
  cards: Array<StandardCard>
  inventoryCards: Array<StandardCard>
  isOpen?: boolean
  onClose?: () => void
  onDeleteCard?: (cardIndex: number, isInventory: boolean) => void
  onMoveCard?: (cardIndex: number, fromInventory: boolean, toInventory: boolean) => void
  onAddCard?: (index: number, isInventory: boolean) => void
  isModalOpen?: boolean // 新增：是否有模态框打开
}

type MainDeckType = "focused" | "inventory"
type TypeFilterType = "all" | "profession" | "background" | "domain" | "variant"

export function CardDrawer({ cards, inventoryCards, isOpen: externalIsOpen, onClose, onDeleteCard, onMoveCard, onAddCard, isModalOpen }: CardDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const finalIsOpen = externalIsOpen !== undefined ? externalIsOpen : isOpen

  // 新状态：主卡组选择 + 类型筛选
  const [mainDeck, setMainDeck] = useState<MainDeckType>('focused')
  const [typeFilter, setTypeFilter] = useState<TypeFilterType>('all')

  const handleClose = () => {
    setIsClosing(true)
    setHoveredCard(null) // 清除详情卡牌
    setTimeout(() => {
      setIsClosing(false)
      if (onClose) {
        onClose()
      } else {
        setIsOpen(false)
      }
    }, 300) // 匹配动画持续时间
  }
  // 移除旧的 activeTab 状态，已被 mainDeck 和 typeFilter 替代
  const [hoveredCard, setHoveredCard] = useState<StandardCard | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  // 新逻辑：根据 mainDeck 和 typeFilter 获取卡牌
  // 步骤1: 根据 mainDeck 获取源数据
  const sourceCards = mainDeck === 'focused' ? cards : inventoryCards

  // 步骤2: 过滤有效卡牌
  const validCards = sourceCards.filter((card) => card && card.name)

  // 步骤3: 根据 typeFilter 筛选卡牌
  const getFilteredCards = () => {
    if (typeFilter === 'all') {
      return validCards
    }

    switch (typeFilter) {
      case 'profession':
        return validCards.filter((card) => card.type === "profession" || card.type === "subclass")
      case 'background':
        return validCards.filter((card) => card.type === "ancestry" || card.type === "community")
      case 'domain':
        return validCards.filter((card) => card.type === "domain")
      case 'variant':
        return validCards.filter((card) => isVariantCard(card))
      default:
        return validCards
    }
  }

  const currentCards = getFilteredCards()

  // 步骤4: 计算可用的筛选标签（只显示有卡牌的类型）
  const availableFilters = [
    { key: 'all' as const, label: '全部', count: validCards.length, alwaysShow: true },
    {
      key: 'profession' as const,
      label: '职业',
      count: validCards.filter(c => c.type === 'profession' || c.type === 'subclass').length,
      show: validCards.some(c => c.type === 'profession' || c.type === 'subclass')
    },
    {
      key: 'background' as const,
      label: '背景',
      count: validCards.filter(c => c.type === 'ancestry' || c.type === 'community').length,
      show: validCards.some(c => c.type === 'ancestry' || c.type === 'community')
    },
    {
      key: 'domain' as const,
      label: '领域',
      count: validCards.filter(c => c.type === 'domain').length,
      show: validCards.some(c => c.type === 'domain')
    },
    {
      key: 'variant' as const,
      label: '扩展',
      count: validCards.filter(c => isVariantCard(c)).length,
      show: validCards.some(c => isVariantCard(c))
    }
  ].filter(f => f.alwaysShow || f.show)

  // 检测移动设备
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window)
    }

    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)

    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  // 当抽屉关闭时清除详情卡牌
  useEffect(() => {
    if (!finalIsOpen) {
      setHoveredCard(null)
    }
  }, [finalIsOpen])

  // 当模态框打开时清除详情卡牌预览
  useEffect(() => {
    if (isModalOpen) {
      setHoveredCard(null)
    }
  }, [isModalOpen])

  // 当卡牌列表更新时，检查 hoveredCard 是否仍然有效
  useEffect(() => {
    if (hoveredCard) {
      // 检查 hoveredCard 是否仍在当前显示的卡牌列表中
      const cardStillExists = currentCards.some(card =>
        card.id === hoveredCard.id && card.name === hoveredCard.name
      );

      if (!cardStillExists) {
        setHoveredCard(null);  // 清空已被删除的卡牌预览
      }
    }
  }, [cards, inventoryCards, hoveredCard, currentCards])

  // 当切换主卡组时，检查当前 typeFilter 是否仍然有效
  useEffect(() => {
    const filterStillValid = availableFilters.some(f => f.key === typeFilter)
    if (!filterStillValid) {
      setTypeFilter('all') // 如果当前筛选不可用，切换到"全部"
    }
  }, [mainDeck, availableFilters, typeFilter])


  const handleCardHover = (card: StandardCard | null) => {
    if (!isMobile) {
      setHoveredCard(card)
    }
  }

  const handleCardClick = (card: StandardCard) => {
    if (isMobile) {
      setHoveredCard(hoveredCard === card ? null : card)
    }
  }

  // 计算下一个空位的 index
  const getNextEmptySlot = (cardsList: StandardCard[], isInventoryTab: boolean): number => {
    const startIndex = isInventoryTab ? 0 : 5; // 聚焦卡组从第6个开始（跳过特殊卡位），库存从第1个开始
    for (let i = startIndex; i < 20; i++) {
      if (isEmptyCard(cardsList[i])) {
        return i;
      }
    }
    return -1; // 没有空位
  }

  // 处理添加卡牌点击
  const handleAddCardClick = () => {
    const isInventory = mainDeck === 'inventory';
    const targetCards = isInventory ? inventoryCards : cards;
    const nextEmptyIndex = getNextEmptySlot(targetCards, isInventory);

    if (onAddCard) {
      onAddCard(nextEmptyIndex, isInventory);
    }
  }

  return (
    <>

      {/* 底部抽屉 */}
      {(finalIsOpen || isClosing) && (
        <div className="fixed inset-0 z-50 flex items-end">
          {/* 背景遮罩 */}
          <div
            className={`fixed inset-0 bg-black transition-opacity duration-300 ${isClosing ? 'bg-opacity-0' : 'bg-opacity-50'
              }`}
            onClick={handleClose}
          />

          {/* 抽屉内容 */}
          <div
            className={`card-drawer-content fixed bottom-0 left-0 right-0 bg-white w-full min-h-[35vh] rounded-t-lg shadow-xl flex flex-col transition-transform duration-300 ease-out ${isClosing ? 'translate-y-full' : 'translate-y-0'
              }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 新导航：单行布局 - 主卡组固定 + 筛选滚动（移除拖拽手柄，增大按钮） */}
            <div className="flex items-center border-b border-gray-200 flex-shrink-0">
              {/* 左侧：固定的主卡组选择（不滚动） */}
              <div className="flex-shrink-0 flex gap-3 px-4 py-3 border-r border-gray-200">
                <button
                  onClick={() => setMainDeck('focused')}
                  className={`
                    flex-shrink-0 rounded-lg font-bold transition-all duration-200 transform active:scale-95
                    ${isMobile ? 'px-6 py-3 text-lg' : 'px-5 py-2.5 text-base'}
                    ${mainDeck === 'focused'
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  {isMobile ? '聚焦' : '聚焦卡组'}
                  <Badge variant="secondary" className="ml-2">
                    {cards.filter(c => c && c.name).length}
                  </Badge>
                </button>

                <button
                  onClick={() => setMainDeck('inventory')}
                  className={`
                    flex-shrink-0 rounded-lg font-bold transition-all duration-200 transform active:scale-95
                    ${isMobile ? 'px-6 py-3 text-lg' : 'px-5 py-2.5 text-base'}
                    ${mainDeck === 'inventory'
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  {isMobile ? '库存' : '库存卡组'}
                  <Badge variant="secondary" className="ml-2">
                    {inventoryCards.filter(c => c && c.name).length}
                  </Badge>
                </button>
              </div>

              {/* 右侧：可滚动的类型筛选标签 */}
              <div className="flex-1 overflow-x-auto px-4 py-3 scrollbar-thin scrollbar-thumb-gray-300">
                <div className="flex gap-2">
                  {availableFilters.map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => setTypeFilter(filter.key)}
                      className={`
                        flex-shrink-0 rounded-full font-medium transition-all duration-200 transform hover:scale-105 active:scale-95
                        ${isMobile ? 'px-5 py-2.5 text-base' : 'px-4 py-2 text-sm'}
                        ${typeFilter === filter.key
                          ? 'bg-blue-100 text-blue-700 border-2 border-blue-400'
                          : 'bg-gray-50 text-gray-600 border border-gray-300 hover:bg-gray-100'
                        }
                      `}
                    >
                      {filter.label}
                      {filter.count > 0 && (
                        <span className="ml-1.5 opacity-75">({filter.count})</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 卡牌展示区 */}
            <div className="flex-1 overflow-hidden min-h-0">
              <div className="h-full overflow-x-auto overflow-y-hidden px-4 py-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                <div className="flex gap-3 h-full items-start animate-in slide-in-from-right duration-300" style={{ touchAction: 'pan-x' }}>
                  {currentCards.map((card, index) => {
                    // 找到卡牌在原数组中的真实索引
                    const isInventory = mainDeck === 'inventory'
                    const realIndex = isInventory
                      ? inventoryCards.findIndex(c => c === card)
                      : cards.findIndex(c => c === card)
                      
                    // 检查是否是特殊卡位（聚焦卡组的前5个位置）
                    const isSpecialSlot = !isInventory && realIndex < 5

                      return (
                        <div
                          key={`${card.type}-${card.name}-${index}`}
                          className={`flex-shrink-0 w-72 animate-in fade-in duration-300 relative group ${
                            isSpecialSlot ? 'border-2 border-yellow-400 rounded-lg' : ''
                          }`}
                          style={{ animationDelay: `${index * 50}ms` }}
                          onMouseEnter={() => handleCardHover(card)}
                          onMouseLeave={() => handleCardHover(null)}
                          onClick={() => handleCardClick(card)}
                        >
                          {/* 浮动切换按钮 */}
                          {onMoveCard && realIndex !== -1 && !isSpecialSlot && (
                            <button
                              className={`absolute top-2 left-2 z-[70] bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center font-bold opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg ${isMobile ? 'w-12 h-12 text-sm' : 'w-6 h-6 text-xs'
                                }`}
                              onClick={(e) => {
                                e.stopPropagation()
                                onMoveCard(realIndex, isInventory, !isInventory)
                              }}
                              title={isInventory ? "移动到聚焦卡组" : "移动到库存卡组"}
                            >
                              ⇄
                            </button>
                          )}
                          {/* 浮动删除按钮 */}
                          {onDeleteCard && realIndex !== -1 && !isSpecialSlot && (
                            <button
                              className={`absolute top-2 right-2 z-[70] bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center font-bold opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg ${isMobile ? 'w-12 h-12 text-sm' : 'w-6 h-6 text-xs'
                                }`}
                              onClick={(e) => {
                                e.stopPropagation()
                                onDeleteCard(realIndex, isInventory)
                              }}
                              title="删除卡牌"
                            >
                              ×
                            </button>
                          )}
                          {/* 特殊卡位标签 */}
                          {isSpecialSlot && (
                            <div className="absolute -top-1 left-2 z-[60]">
                              <span className="text-[10px] font-medium bg-yellow-100 px-1 py-0.5 rounded text-yellow-700 border border-yellow-300 shadow-sm">
                                特殊卡位
                              </span>
                            </div>
                          )}
                          <div className="transform transition-all duration-200 hover:scale-105 hover:shadow-lg">
                            <SimpleImageCard
                              card={card}
                              onClick={() => { }}
                              isSelected={false}
                              priority={index < 5} // 前5张卡牌优先加载
                            />
                          </div>
                        </div>
                      )
                    })}

                    {/* 添加卡牌占位符 */}
                    {onAddCard && (
                      <AddCardPlaceholder
                        onClick={handleAddCardClick}
                        disabled={getNextEmptySlot(
                          mainDeck === 'inventory' ? inventoryCards : cards,
                          mainDeck === 'inventory'
                        ) === -1}
                        isMobile={isMobile}
                      />
                    )}
                  </div>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* 悬浮卡片预览 */}
      {hoveredCard && (
        <div
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[60]"
          style={{ pointerEvents: isMobile ? 'auto' : 'none' }}
          onClick={isMobile ? () => setHoveredCard(null) : undefined}
        >
          <div className="w-80 max-w-[90vw] transform scale-110 animate-in zoom-in-95 fade-in duration-200">
            <ImageCard
              card={hoveredCard}
              onClick={() => { }} // 预览时不可点击
              isSelected={false}
              showSource={true}
              priority={true}
            />
          </div>
        </div>
      )}
    </>
  )
}