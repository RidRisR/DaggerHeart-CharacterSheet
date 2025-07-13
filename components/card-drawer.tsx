"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StandardCard } from "@/card/card-types"
import { ImageCard } from "@/components/ui/image-card"
import { isVariantCard } from "@/card/card-types"
import { ChevronUp, ChevronDown } from "lucide-react"

interface CardDrawerProps {
  cards: Array<StandardCard>
  inventoryCards: Array<StandardCard>
}

type TabType = "focused" | "profession" | "background" | "domain" | "variant" | "inventory"

export function CardDrawer({ cards, inventoryCards }: CardDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>("focused")
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)

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
  const totalCards = focusedCards.length + inventoryOnlyCards.length

  // 标签页配置
  const tabs = [
    { key: "focused" as const, label: "聚焦", count: getTabCount("focused") },
    { key: "profession" as const, label: "职业", count: getTabCount("profession") },
    { key: "background" as const, label: "背景", count: getTabCount("background") },
    { key: "domain" as const, label: "领域", count: getTabCount("domain") },
    { key: "variant" as const, label: "扩展", count: getTabCount("variant") },
    { key: "inventory" as const, label: "库存", count: getTabCount("inventory") },
  ]

  const handleCardClick = (cardId: string) => {
    setSelectedCardId(selectedCardId === cardId ? null : cardId)
  }

  return (
    <>
      {/* 悬浮触发按钮 - 桌面端 */}
      <div className="fixed bottom-4 left-4 z-40 md:block hidden">
        <Button
          onClick={() => setIsOpen(true)}
          className="bg-gray-800 hover:bg-gray-700 active:scale-95 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105"
          title="查看卡牌"
        >
          <div className="text-center">
            <div className="text-lg animate-pulse">🎴</div>
            <div className="text-xs font-mono">{totalCards}</div>
          </div>
        </Button>
      </div>

      {/* 底部状态栏 - 移动端触发器 */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="w-full bg-gray-100 border-t border-gray-300 py-3 px-4 flex items-center justify-center gap-2 text-gray-700 hover:bg-gray-200 active:bg-gray-300 transition-all duration-200 active:scale-[0.99]"
        >
          <span className="animate-pulse">🎴</span>
          <span className="font-medium">我的卡牌 ({totalCards})</span>
          <ChevronUp className="w-4 h-4 animate-bounce" />
        </button>
      </div>

      {/* 底部抽屉 */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end">
          {/* 背景遮罩 */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50 animate-in fade-in duration-300"
            onClick={() => setIsOpen(false)}
          />

          {/* 抽屉内容 */}
          <div 
            className="card-drawer-content relative bg-white w-full h-[70vh] md:h-[60vh] rounded-t-lg shadow-xl flex flex-col animate-in slide-in-from-bottom duration-300 ease-out"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 顶部拖拽手柄 */}
            <div className="flex items-center justify-center py-3 border-b border-gray-200">
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            </div>

            {/* 头部 */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">我的卡牌</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>

            {/* 标签页导航 */}
            <div className="px-4 py-2 border-b border-gray-200">
              <div className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                      activeTab === tab.key
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
            <div className="flex-1 overflow-hidden">
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
                    {currentCards.map((card, index) => (
                      <div 
                        key={`${card.type}-${card.name}-${index}`} 
                        className="flex-shrink-0 w-32 animate-in fade-in duration-300"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="transform transition-all duration-200 hover:scale-105 hover:shadow-lg">
                          <ImageCard
                            card={card}
                            onClick={handleCardClick}
                            isSelected={selectedCardId === card.id}
                            showSource={false}
                            priority={index < 5} // 前5张卡牌优先加载
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}