"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { StandardCard } from "@/card/card-types"
import { ImageCard } from "@/components/ui/image-card"
import { SimpleImageCard } from "@/components/ui/simple-image-card"
import { isVariantCard } from "@/card/card-types"

interface CardDrawerProps {
  cards: Array<StandardCard>
  inventoryCards: Array<StandardCard>
  isOpen?: boolean
  onClose?: () => void
  onDeleteCard?: (cardIndex: number, isInventory: boolean) => void
  onMoveCard?: (cardIndex: number, fromInventory: boolean, toInventory: boolean) => void
}

type TabType = "focused" | "profession" | "background" | "domain" | "variant" | "inventory"

export function CardDrawer({ cards, inventoryCards, isOpen: externalIsOpen, onClose, onDeleteCard, onMoveCard }: CardDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const finalIsOpen = externalIsOpen !== undefined ? externalIsOpen : isOpen
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
  const [activeTab, setActiveTab] = useState<TabType>("focused")
  const [hoveredCard, setHoveredCard] = useState<StandardCard | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  // 卡牌分类
  const [focusedCards, setFocusedCards] = useState<typeof cards>([])
  const [professionCards, setProfessionCards] = useState<typeof cards>([])
  const [backgroundCards, setBackgroundCards] = useState<typeof cards>([])
  const [domainCards, setDomainCards] = useState<typeof cards>([])
  const [variantCards, setVariantCards] = useState<typeof cards>([])
  const [inventoryOnlyCards, setInventoryOnlyCards] = useState<typeof inventoryCards>([])

  // 更新卡牌分类
  useEffect(() => {
    const validCards = cards.filter((card) => card && card.name)
    setProfessionCards(validCards.filter((card) => card.type === "profession" || card.type === "subclass"))
    setBackgroundCards(validCards.filter((card) => card.type === "ancestry" || card.type === "community"))
    setDomainCards(validCards.filter((card) => card.type === "domain"))
    setVariantCards(validCards.filter((card) => isVariantCard(card)))
    setFocusedCards(validCards) // 聚焦卡组为所有主卡组

    const validInventoryCards = inventoryCards.filter((card) => card && card.name)
    setInventoryOnlyCards(validInventoryCards)
  }, [cards, inventoryCards])

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

  // 获取当前标签页的卡牌
  const getCurrentCards = () => {
    switch (activeTab) {
      case "focused": return focusedCards
      case "profession": return professionCards
      case "background": return backgroundCards
      case "domain": return domainCards
      case "variant": return variantCards
      case "inventory": return inventoryOnlyCards
      default: return []
    }
  }

  // 计算标签页卡牌数量
  const getTabCount = (tab: TabType) => {
    switch (tab) {
      case "focused": return focusedCards.length
      case "profession": return professionCards.length
      case "background": return backgroundCards.length
      case "domain": return domainCards.length
      case "variant": return variantCards.length
      case "inventory": return inventoryOnlyCards.length
      default: return 0
    }
  }

  const currentCards = getCurrentCards()

  // 标签页配置
  const tabs = [
    { key: "focused" as const, label: "聚焦", count: getTabCount("focused") },
    { key: "profession" as const, label: "职业", count: getTabCount("profession") },
    { key: "background" as const, label: "背景", count: getTabCount("background") },
    { key: "domain" as const, label: "领域", count: getTabCount("domain") },
    { key: "variant" as const, label: "扩展", count: getTabCount("variant") },
    { key: "inventory" as const, label: "库存", count: getTabCount("inventory") },
  ]


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
            className={`card-drawer-content fixed bottom-0 left-0 right-0 bg-white w-full h-[35vh] min-h-[35vh] rounded-t-lg shadow-xl flex flex-col transition-transform duration-300 ease-out ${isClosing ? 'translate-y-full' : 'translate-y-0'
              }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 顶部拖拽手柄 */}
            <div className="flex items-center justify-center py-2 border-b border-gray-200">
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            </div>

            {/* 标签页导航 */}
            <div className="px-4 py-1.5 border-b border-gray-200 flex-shrink-0">
              <div className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-shrink-0 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                      isMobile ? 'px-4 py-2 text-base' : 'px-3 py-1.5 text-sm'
                    } ${activeTab === tab.key
                      ? "bg-blue-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm"
                      }`}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <Badge variant="secondary" className="ml-1.5 text-xs animate-in fade-in duration-300">
                        {tab.count}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 卡牌展示区 */}
            <div className="flex-1 overflow-hidden min-h-0">
              {currentCards.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500 animate-in fade-in duration-500">
                  <div className="text-center">
                    <div className="text-2xl mb-2 animate-bounce">📭</div>
                    <div>暂无卡牌</div>
                  </div>
                </div>
              ) : (
                <div className="h-full overflow-x-auto overflow-y-hidden px-4 py-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                  <div className="flex gap-3 h-full items-start animate-in slide-in-from-right duration-300" style={{ touchAction: 'pan-x' }}>
                    {currentCards.map((card, index) => {
                      // 找到卡牌在原数组中的真实索引
                      const isInventoryTab = activeTab === "inventory"
                      const realIndex = isInventoryTab
                        ? inventoryCards.findIndex(c => c === card)
                        : cards.findIndex(c => c === card)
                      
                      // 检查是否是特殊卡位（聚焦卡组的前5个位置）
                      const isSpecialSlot = !isInventoryTab && realIndex < 5

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
                                onMoveCard(realIndex, isInventoryTab, !isInventoryTab)
                              }}
                              title={isInventoryTab ? "移动到聚焦卡组" : "移动到库存卡组"}
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
                                onDeleteCard(realIndex, isInventoryTab)
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
                  </div>
                </div>
              )}
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