"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { StandardCard } from "@/data/card/card-types"
import { ALL_STANDARD_CARDS } from "@/data/card"

export default function CardManagerPage() {
  // 状态
  const [library] = useState<StandardCard[]>(ALL_STANDARD_CARDS)
  const [currentDeck, setCurrentDeck] = useState<StandardCard[]>([])
  const [deckName, setDeckName] = useState("默认卡组")
  const [deckNames, setDeckNames] = useState<string[]>(["默认卡组"])
  const [selectedCard, setSelectedCard] = useState<StandardCard | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isCardInDeck, setIsCardInDeck] = useState(false)
  const [hoveredCard, setHoveredCard] = useState<StandardCard | null>(null)
  const [isAltPressed, setIsAltPressed] = useState(false)
  const cardRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())

  // 保存当前卡组到内存
  const saveDeckHandler = () => {
    // 仅在内存中保存，不再使用localStorage
    if (!deckNames.includes(deckName)) {
      setDeckNames([...deckNames, deckName])
    }
  }

  // 加载卡组
  const loadDeckHandler = (name: string) => {
    setDeckName(name)
    // 在实际应用中，这里会从存储中加载卡组
    // 但现在我们只是切换名称
  }

  // 创建新卡组
  const createNewDeck = () => {
    const newName = `新卡组 ${deckNames.length + 1}`
    setDeckName(newName)
    setCurrentDeck([])
  }

  // 删除当前卡组
  const deleteCurrentDeck = () => {
    if (confirm(`确定要删除卡组 "${deckName}" 吗？`)) {
      // 更新卡组名称列表
      const updatedNames = deckNames.filter((name) => name !== deckName)
      setDeckNames(updatedNames)

      // 如果还有其他卡组，加载第一个
      if (updatedNames.length > 0) {
        setDeckName(updatedNames[0])
        setCurrentDeck([])
      } else {
        // 否则创建一个新的空卡组
        setDeckName("默认卡组")
        setCurrentDeck([])
      }
    }
  }

  // 打开卡牌详情
  const openCardDetail = (card: StandardCard, inDeck: boolean) => {
    setSelectedCard(card)
    setIsCardInDeck(inDeck)
    setIsDetailModalOpen(true)
  }

  // 添加卡牌到卡组
  const addCardToDeck = () => {
    if (selectedCard) {
      setCurrentDeck([...currentDeck, selectedCard])
      setIsDetailModalOpen(false)
    }
  }

  // 从卡组移除卡牌
  const removeCardFromDeck = () => {
    if (selectedCard) {
      const index = currentDeck.findIndex((card) => card.id === selectedCard.id)
      if (index !== -1) {
        const newDeck = [...currentDeck]
        newDeck.splice(index, 1)
        setCurrentDeck(newDeck)
      }
      setIsDetailModalOpen(false)
    }
  }

  // 计算悬浮窗位置
  const getPreviewPosition = (cardId: string) => {
    const cardRef = cardRefs.current.get(cardId)
    if (!cardRef) return {}

    const rect = cardRef.getBoundingClientRect()
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
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">卡牌管理器</h1>

      <Tabs defaultValue="deck" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="deck">卡组管理</TabsTrigger>
          <TabsTrigger value="library">卡牌库</TabsTrigger>
        </TabsList>

        <TabsContent value="deck" className="space-y-4">
          {/* 卡组管理 */}
          <div className="flex items-end gap-4 mb-4">
            <div className="flex-1">
              <Label htmlFor="deck-name">卡组名称</Label>
              <Input id="deck-name" value={deckName} onChange={(e) => setDeckName(e.target.value)} />
            </div>
            <Button onClick={saveDeckHandler}>保存卡组</Button>
            <Button variant="outline" onClick={createNewDeck}>
              新建卡组
            </Button>
            <Button variant="destructive" onClick={deleteCurrentDeck}>
              删除卡组
            </Button>
          </div>

          {/* 卡组选择器 */}
          {deckNames.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {deckNames.map((name) => (
                <Button
                  key={name}
                  variant={name === deckName ? "default" : "outline"}
                  size="sm"
                  onClick={() => loadDeckHandler(name)}
                >
                  {name}
                </Button>
              ))}
            </div>
          )}

          {/* 当前卡组 */}
          <h2 className="text-lg font-bold mb-2">当前卡组 ({currentDeck.length}张卡牌)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {currentDeck.length > 0 ? (
              currentDeck.map((card, index) => (
                <div
                  key={`${card.id}-${index}`}
                  ref={(el) => { cardRefs.current.set(`${card.id}-${index}`, el); }}
                  className="relative cursor-pointer"
                  onClick={() => openCardDetail(card, true)}
                  onMouseEnter={() => setHoveredCard(card)}
                  onMouseLeave={() => {
                    setHoveredCard(null)
                    setIsAltPressed(false)
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <div className="rounded-md p-1 border border-gray-300 hover:border-gray-500 transition-colors h-16">
                    {/* 卡牌标题 */}
                    <div className="text-sm font-medium">{card.name || "未命名卡牌"}</div>

                    {/* 分隔线 */}
                    <div className="h-px bg-gray-300 w-full my-0.5"></div>

                    {/* 卡牌底部信息 */}
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span className="truncate max-w-[40%]">{card.cardSelectDisplay.item1 || "——"}</span>
                      <span>{card.cardSelectDisplay.item2 || "——"}</span>
                      <span>{card.cardSelectDisplay.item3 || "——"}</span>
                    </div>

                    {/* 卡牌类型标签 */}
                    <div className="absolute -top-4 left-0 right-0 text-center">
                      <span
                        className={`text-[10px] font-medium px-1 py-0 rounded-t-sm border border-b-0 ${
                          card.type.includes("ancestry")
                            ? "bg-green-100 border-green-300"
                            : card.type.includes("attack")
                              ? "bg-red-100 border-red-300"
                              : card.type.includes("defense")
                                ? "bg-blue-100 border-blue-300"
                                : card.type.includes("community")
                                  ? "bg-teal-100 border-teal-300"
                                  : card.type.includes("profession")
                                    ? "bg-yellow-100 border-yellow-300"
                                    : "bg-gray-100 border-gray-300"
                        }`}
                      >
                        {card.type.replace(/卡$/, "").charAt(0).toUpperCase() + card.type.replace(/卡$/, "").slice(1)}
                      </span>
                    </div>
                  </div>

                  {/* 悬停预览 */}
                  {hoveredCard?.id === card.id && (
                    <div
                      className="absolute bg-white border border-gray-300 rounded-md shadow-lg"
                      style={{
                        ...getPreviewPosition(`${card.id}-${index}`),
                        width: isAltPressed ? "400px" : "280px",
                      } as React.CSSProperties}
                    >
                      {/* 卡牌图片 */}
                      <div className={isAltPressed ? "w-full" : "w-3/4 mx-auto"}>
                        <div className="aspect-[816/1110] w-full overflow-hidden">
                          <img
                            src={
                              card.imageUrl ||
                              `/placeholder.svg?height=1110&width=816&query=fantasy card ${card.name || "card"}`
                            }
                            alt={card.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      {/* 卡牌描述 */}
                      {!isAltPressed && card.description && (
                        <div className="p-2 border-t">
                          <p className="text-xs text-gray-700">{card.description}</p>
                        </div>
                      )}

                      {/* ALT键提示 */}
                      <div className="text-[10px] text-gray-400 text-center p-1 bg-gray-50">
                        {isAltPressed ? "松开ALT键返回正常视图" : "按住ALT键查看大图"}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-gray-500">卡组为空，请从卡牌库添加卡牌</div>
            )}
          </div>
        </TabsContent>

      </Tabs>
    </div>
  )
}
