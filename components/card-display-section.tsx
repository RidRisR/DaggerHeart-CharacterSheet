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
import { StandardCard } from "@/data/card/card-types"

interface CardDisplaySectionProps {
  cards: Array<StandardCard>
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
                {card.type || "未知"}
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
          {card.description && (
            <div className="px-2 pb-2 pt-1 text-xs text-gray-600 border-t border-gray-100">{card.description}</div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

export function CardDisplaySection({ cards }: CardDisplaySectionProps) {
  // 跟踪每张卡片的展开状态
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({})

  // 跟踪容器高度
  const [containerHeight, setContainerHeight] = useState(400)

  // 存储当前显示的卡牌列表
  const [allCards, setAllCards] = useState(cards.filter((card) => card && card.name))
  const [professionCards, setProfessionCards] = useState<typeof cards>([])
  const [backgroundCards, setBackgroundCards] = useState<typeof cards>([]) // 合并血统和社区卡牌
  const [domainCards, setDomainCards] = useState<typeof cards>([]) // 添加领域卡牌列表

  // 当前选中的标签
  const [activeTab, setActiveTab] = useState("all")

  // 更新卡牌分类
  useEffect(() => {
    const validCards = cards.filter((card) => card && card.name)
    setAllCards(validCards)
    setProfessionCards(validCards.filter((card) => card.type === "profession" || card.type === "subclass"))

    // 合并血统和社区卡牌为背景卡牌
    setBackgroundCards(validCards.filter((card) => card.type === "ancestry" || card.type === "community"))
    setDomainCards(validCards.filter((card) => card.type === "domain")) // 过滤领域卡牌
  }, [cards])

  // 切换卡片展开状态
  const toggleCard = (cardId: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }))
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
        return "outline"
      // "domain" 没有专属颜色，选择一个已支持的类型
      case "domain":
        return "destructive"
      default:
        return "outline"
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
      // 根据当前活动的标签页来更新对应的卡牌列表
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
        case "background": // 更新背景卡牌的排序
          setBackgroundCards((cards) => {
            const oldIndex = cards.findIndex((card) => `${card.type}-${card.name}-${cards.indexOf(card)}` === active.id)
            const newIndex = cards.findIndex((card) => `${card.type}-${card.name}-${cards.indexOf(card)}` === over.id)
            return arrayMove(cards, oldIndex, newIndex)
          })
          break
        case "domain": // 添加领域卡牌的排序处理
          setDomainCards((cards) => {
            const oldIndex = cards.findIndex((card) => `${card.type}-${card.name}-${cards.indexOf(card)}` === active.id)
            const newIndex = cards.findIndex((card) => `${card.type}-${card.name}-${cards.indexOf(card)}` === over.id)
            return arrayMove(cards, oldIndex, newIndex)
          })
          break
      }
    }
  }

  // 处理高度变化
  const handleHeightChange = (height: number) => {
    // 限制高度在200px到800px之间
    const constrainedHeight = Math.max(200, Math.min(800, height))
    setContainerHeight(constrainedHeight)
  }

  // 渲染卡牌列表
  const renderCardList = (cardList: typeof cards) => {
    if (cardList.length === 0) {
      return <p className="text-center text-gray-500 py-4">没有选择卡牌</p>
    }

    // 计算滚动区域高度，留出空间给标签和边距
    const scrollHeight = containerHeight - 80

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
                const isExpanded = expandedCards[cardId] || false

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

  return (
    <div className="border rounded-lg bg-gray-50 shadow-sm flex flex-col" style={{ height: containerHeight }}>
      <div className="p-2 flex-grow overflow-hidden">
        <Tabs defaultValue="all" className="w-full h-full flex flex-col" onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-6 mb-2">
            {" "}
            {/* 增加一列以容纳领域标签 */}
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="profession">职业</TabsTrigger>
            <TabsTrigger value="background">背景</TabsTrigger>
            <TabsTrigger value="domain">领域</TabsTrigger> {/* 添加领域标签 */}
          </TabsList>

          <div className="flex-grow overflow-hidden">
            <TabsContent value="all" className="h-full m-0">
              {allCards.length > 0 ? (
                renderCardList(allCards)
              ) : (
                <p className="text-center text-gray-500 py-4">尚未选择任何卡牌</p>
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
          </div>
        </Tabs>
      </div>

      {/* 底部调整大小的手柄 */}
      <div
        className="h-2 bg-gray-200 hover:bg-gray-300 cursor-ns-resize flex items-center justify-center border-t border-gray-300"
        onMouseDown={(e) => {
          e.preventDefault()

          const startY = e.clientY
          const startHeight = containerHeight

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
