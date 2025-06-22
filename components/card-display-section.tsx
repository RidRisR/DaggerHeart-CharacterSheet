"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react"
import { useState, useEffect } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { CardType, StandardCard } from "@/card/card-types"
import { getCardTypeName } from "@/card"
import { isVariantCard, getVariantRealType } from "@/card/card-types"
import ReactMarkdown from "react-markdown"
import React, { useRef } from "react"

interface CardDisplaySectionProps {
  cards: Array<StandardCard>
  inventoryCards: Array<StandardCard>
  // 注释：移除了 focusedCardIds prop，聚焦功能已由双卡组系统取代
}

// 可排序的卡牌组件
function SortableCard({
  card,
  index,
  isExpanded,
  toggleCard,
  getBadgeVariant,
}: {
  card: CardDisplaySectionProps["cards"][0]
  index: number
  isExpanded: boolean
  toggleCard: (cardId: string) => void
    getBadgeVariant: (type: string) => "default" | "secondary" | "outline" | "destructive" | null | undefined
}) {
  const cardId = `${card.type}-${card.name}-${index}`

  // Enhanced card type name display for variants
  const displayTypeName = (() => {
    if (isVariantCard(card)) {
      const realType = getVariantRealType(card);
      if (realType) {
        return getCardTypeName(realType);
      }
    }
    return getCardTypeName(card.type);
  })();

  // 新增：获取item1~item4
  const displayItem1 = card.cardSelectDisplay?.item1 || "";
  const displayItem2 = card.cardSelectDisplay?.item2 || "";
  const displayItem3 = card.cardSelectDisplay?.item3 || "";
  const displayItem4 = card.cardSelectDisplay?.item4 || "";

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cardId,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className={`${isDragging ? "opacity-50 bg-gray-100" : ""}`}>
      <Collapsible open={isExpanded} className="border rounded-md bg-white overflow-hidden">
        <CollapsibleTrigger
          onClick={() => toggleCard(cardId)}
          className="w-full p-2 flex justify-between items-center hover:bg-gray-50 transition-colors"
        >
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2">
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
              >
                <GripVertical className="h-4 w-4 text-gray-400" />
              </div>
              <h4 className="text-sm font-medium text-left">{card.name}</h4>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getBadgeVariant(card.type)} className="text-xs">
                {displayTypeName || "未知"}
              </Badge>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {/* item信息行：仅在展开时显示 */}
          {(displayItem1 || displayItem2 || displayItem3 || displayItem4) && (
            <div className="flex flex-row gap-2 text-xs font-mono mb-2 px-4 pt-2 pb-1 border-b border-dashed border-gray-200">
              {displayItem1 && <div className="px-2 py-0.5 rounded bg-gray-100 border border-gray-300 text-gray-800 font-semibold shadow-sm">{displayItem1}</div>}
              {displayItem2 && <div className="px-2 py-0.5 rounded bg-gray-100 border border-gray-300 text-gray-800 font-semibold shadow-sm">{displayItem2}</div>}
              {displayItem3 && <div className="px-2 py-0.5 rounded bg-gray-100 border border-gray-300 text-gray-800 font-semibold shadow-sm">{displayItem3}</div>}
              {displayItem4 && <div className="px-2 py-0.5 rounded bg-gray-100 border border-gray-300 text-gray-800 font-semibold shadow-sm">{displayItem4}</div>}
            </div>
          )}
          {card.description && (
            <div className="px-2 pb-2 pt-1 text-xs text-gray-600 border-t border-gray-100">
              <ReactMarkdown
                skipHtml
                components={{
                  ul: ({ children }) => <ul className="list-disc pl-4 mb-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-4 mb-1">{children}</ol>,
                  li: ({ children }) => <li className="mb-0.5 last:mb-0">{children}</li>,
                }}
              >
                {card.description}
              </ReactMarkdown>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// 状态提升：用useRef持久化containerHeight和expandedCards
export function CardDisplaySection({ cards, inventoryCards }: CardDisplaySectionProps) {
  // 用useRef持久化高度和展开状态
  const containerHeightRef = useRef<number>(400)
  const expandedCardsRef = useRef<Record<string, boolean>>({})
  // 触发rerender的state
  const [, forceUpdate] = useState(0)

  // 存储当前显示的卡牌列表
  const [allCards, setAllCards] = useState(cards.filter((card) => card && card.name))
  const [professionCards, setProfessionCards] = useState<typeof cards>([])
  const [backgroundCards, setBackgroundCards] = useState<typeof cards>([])
  const [domainCards, setDomainCards] = useState<typeof cards>([])
  const [variantCards, setVariantCards] = useState<typeof cards>([])
  const [focusedCards, setFocusedCards] = useState<typeof cards>([])
  const [inventoryOnlyCards, setInventoryOnlyCards] = useState<typeof inventoryCards>([])

  // 当前选中的标签，默认选择聚焦
  const [activeTab, setActiveTab] = useState("focused")

  // 注释：移除了异步加载聚焦卡牌的逻辑，由双卡组系统取代

  // 更新卡牌分类
  useEffect(() => {
    const validCards = cards.filter((card) => card && card.name)
    setAllCards(validCards)
    setProfessionCards(validCards.filter((card) => card.type === "profession" || card.type === "subclass"))
    setBackgroundCards(validCards.filter((card) => card.type === "ancestry" || card.type === "community"))
    setDomainCards(validCards.filter((card) => card.type === "domain"))
    setVariantCards(validCards.filter((card) => isVariantCard(card)))

    // 设置聚焦卡组（从cards中获取）
    setFocusedCards(validCards)

    // 设置库存卡组
    const validInventoryCards = inventoryCards.filter((card) => card && card.name)
    setInventoryOnlyCards(validInventoryCards)
  }, [cards, inventoryCards])

  // 监听 focusedCardsChanged 事件 - 移除，因为现在使用props传递
  // useEffect(() => {
  //   const handleFocusedCardsChange = () => {
  //     if (!cardsLoading && allStandardCards.length > 0) {
  //       loadAndSetFocusedCards();
  //     }
  //   };

  //   window.addEventListener('focusedCardsChanged', handleFocusedCardsChange);
  //   return () => {
  //     window.removeEventListener('focusedCardsChanged', handleFocusedCardsChange);
  //   };
  // }, [loadAndSetFocusedCards, cardsLoading, allStandardCards.length])

  // 切换卡片展开状态
  const toggleCard = (cardId: string) => {
    expandedCardsRef.current[cardId] = !expandedCardsRef.current[cardId]
    forceUpdate(x => x + 1)
  }

  // 获取卡牌类型的徽章颜色
  const getBadgeVariant = (
    type: string,
  ): "default" | "secondary" | "outline" | "destructive" | null | undefined => {
    switch (type.toLowerCase()) {
      case "profession":
        return "default"
      case "ancestry":
        return "secondary"
      case "community":
        return "secondary"
      case "domain":
        return "destructive"
      case "variant":
        return "outline" // 扩展卡牌使用 outline 样式，区别于领域卡的 destructive
      default:
        return "secondary" // 其他未知类型使用 secondary
    }
  }

  // 设置拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // 处理拖拽结束事件
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      switch (activeTab) {
        case "all":
          setAllCards((cards) => {
            const oldIndex = cards.findIndex((card) => `${card.type}-${card.name}-${cards.indexOf(card)}` === active.id)
            const newIndex = cards.findIndex((card) => `${card.type}-${card.name}-${cards.indexOf(card)}` === over.id)
            return arrayMove(cards, oldIndex, newIndex)
          })
          break
        case "profession":
          setProfessionCards((cards) => {
            const oldIndex = cards.findIndex((card) => `${card.type}-${card.name}-${cards.indexOf(card)}` === active.id)
            const newIndex = cards.findIndex((card) => `${card.type}-${card.name}-${cards.indexOf(card)}` === over.id)
            return arrayMove(cards, oldIndex, newIndex)
          })
          break
        case "background":
          setBackgroundCards((cards) => {
            const oldIndex = cards.findIndex((card) => `${card.type}-${card.name}-${cards.indexOf(card)}` === active.id)
            const newIndex = cards.findIndex((card) => `${card.type}-${card.name}-${cards.indexOf(card)}` === over.id)
            return arrayMove(cards, oldIndex, newIndex)
          })
          break
        case "domain":
          setDomainCards((cards) => {
            const oldIndex = cards.findIndex((card) => `${card.type}-${card.name}-${cards.indexOf(card)}` === active.id)
            const newIndex = cards.findIndex((card) => `${card.type}-${card.name}-${cards.indexOf(card)}` === over.id)
            return arrayMove(cards, oldIndex, newIndex)
          })
          break
        case "variant":
          setVariantCards((cards) => {
            const oldIndex = cards.findIndex((card) => `${card.type}-${card.name}-${cards.indexOf(card)}` === active.id)
            const newIndex = cards.findIndex((card) => `${card.type}-${card.name}-${cards.indexOf(card)}` === over.id)
            return arrayMove(cards, oldIndex, newIndex)
          })
          break
        // 注释：移除了 focused case，由双卡组系统取代
      }
    }
  }

  // 处理高度变化
  const handleHeightChange = (height: number) => {
    const constrainedHeight = Math.max(200, Math.min(800, height))
    containerHeightRef.current = constrainedHeight
    forceUpdate(x => x + 1)
  }

  // 渲染卡牌列表
  const renderCardList = (cardList: typeof cards) => {
    if (cardList.length === 0) {
      return <p className="text-center text-gray-500 py-4">没有选择卡牌</p>
    }
    const scrollHeight = containerHeightRef.current - 80
    return (
      <ScrollArea className={`h-[${scrollHeight}px]`} style={{ height: scrollHeight }}>
        <div className="space-y-2 p-1">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={cardList.map((card, index) => `${card.type}-${card.name}-${index}`)}
              strategy={verticalListSortingStrategy}
            >
              {cardList.map((card, index) => {
                const cardId = `${card.type}-${card.name}-${index}`
                const isExpanded = expandedCardsRef.current[cardId] || false
                return (
                  <SortableCard
                    key={cardId}
                    card={card}
                    index={index}
                    isExpanded={isExpanded}
                    toggleCard={toggleCard}
                    getBadgeVariant={getBadgeVariant}
                  />
                )
              })}
            </SortableContext>
          </DndContext>
        </div>
      </ScrollArea>
    )
  }

  // 更新容器高度（只在首次mount时自动调整）
  useEffect(() => {
    if (containerHeightRef.current !== 400) return // 只在初始时自动调整
    const headerHeight = 80
    const cardHeight = 50
    const padding = 20
    let numCards = 0
    switch (activeTab) {
      case "all":
        numCards = allCards.length
        break
      case "profession":
        numCards = professionCards.length
        break
      case "background":
        numCards = backgroundCards.length
        break
      case "domain":
        numCards = domainCards.length
        break
      case "variant":
        numCards = variantCards.length
        break
      // 注释：移除了 focused case，由双卡组系统取代
      default:
        numCards = allCards.length
    }
    const contentHeight = numCards * cardHeight + padding
    const newHeight = Math.min(Math.max(contentHeight + headerHeight, 200), 600)
    containerHeightRef.current = newHeight
    forceUpdate(x => x + 1)
  }, [])

  return (
    <div className="border rounded-lg bg-gray-50 shadow-sm flex flex-col" style={{ height: containerHeightRef.current }}>
      <div className="p-2 flex-grow overflow-hidden">
        <Tabs defaultValue="focused" className="w-full h-full flex flex-col" onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-6 mb-2">
            <TabsTrigger value="focused" className="text-s">聚焦</TabsTrigger>
            <TabsTrigger value="profession" className="text-s">职业</TabsTrigger>
            <TabsTrigger value="background" className="text-s">背景</TabsTrigger>
            <TabsTrigger value="domain" className="text-s">领域</TabsTrigger>
            <TabsTrigger value="variant" className="text-s">扩展</TabsTrigger>
            <TabsTrigger value="inventory" className="text-s">库存</TabsTrigger>
          </TabsList>
          <div className="flex-grow overflow-hidden">
            <TabsContent value="focused" className="h-full m-0">
              {focusedCards.length > 0 ? (
                renderCardList(focusedCards)
              ) : (
                  <p className="text-center text-gray-500 py-4">聚焦卡组暂无卡牌</p>
              )}
            </TabsContent>
            <TabsContent value="profession" className="h-full m-0">
              {renderCardList(professionCards)}
            </TabsContent>
            <TabsContent value="background" className="h-full m-0">
              {renderCardList(backgroundCards)}
            </TabsContent>
            <TabsContent value="domain" className="h-full m-0">
              {renderCardList(domainCards)}
            </TabsContent>
            <TabsContent value="variant" className="h-full m-0">
              {renderCardList(variantCards)}
            </TabsContent>
            <TabsContent value="inventory" className="h-full m-0">
              {inventoryOnlyCards.length > 0 ? (
                renderCardList(inventoryOnlyCards)
              ) : (
                <p className="text-center text-gray-500 py-4">库存卡组暂无卡牌</p>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>
      {/* 底部调整大小的手柄 */}
      <div
        className="h-2 bg-gray-200 hover:bg-gray-300 cursor-ns-resize flex items-center justify-center border-t border-gray-300"
        onMouseDown={(e) => {
          e.preventDefault()
          const startY = e.clientY
          const startHeight = containerHeightRef.current
          const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaY = moveEvent.clientY - startY
            handleHeightChange(startHeight + deltaY)
          }
          const handleMouseUp = () => {
            document.removeEventListener("mousemove", handleMouseMove)
            document.removeEventListener("mouseup", handleMouseUp)
          }
          document.addEventListener("mousemove", handleMouseMove)
          document.addEventListener("mouseup", handleMouseUp)
        }}
      >
        <div className="w-16 h-1 bg-gray-400 rounded-full"></div>
      </div>
    </div>
  )
}
