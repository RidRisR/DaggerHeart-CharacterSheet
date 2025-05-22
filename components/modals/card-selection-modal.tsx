"use client"

import { useState, useEffect, useRef } from "react"
import {
  ALL_CARD_TYPES,
  SPECIAL_CARD_POSITIONS,
  ALL_STANDARD_CARDS,
  CARD_CLASS_OPTIONS_BY_TYPE,
  LEVEL_OPTIONS,
  isSpecialCardPosition,
  getAllowedCardTypeForPosition,
  getCardTypeColor,
} from "@/data/card"
import type { StandardCard } from "@/data/card/card-types"
import { createEmptyCard } from "@/data/card/card-types"

interface CardSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (card: any) => void
  selectedCardIndex: number
}

export function CardSelectionModal({ isOpen, onClose, onSelect, selectedCardIndex }: CardSelectionModalProps) {
  // 根据卡牌位置确定可用的卡牌类型
  const allowedCardType = getAllowedCardTypeForPosition(selectedCardIndex)
  const isSpecialPos = isSpecialCardPosition(selectedCardIndex)

  // 无论是什么位置，都显示所有卡牌类型，除非是特殊位置
  const availableCardTypes = isSpecialPos
    ? ALL_CARD_TYPES.filter((type) => type.id === allowedCardType)
    : ALL_CARD_TYPES

  // 状态
  const [activeTab, setActiveTab] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [classFilter, setClassFilter] = useState("all")
  const [levelFilter, setLevelFilter] = useState("all")
  const [filteredCards, setFilteredCards] = useState<StandardCard[]>([])
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [isAltPressed, setIsAltPressed] = useState(false)
  const cardRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())

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

  // 初始化默认标签
  useEffect(() => {
    if (availableCardTypes.length > 0) {
      setActiveTab(availableCardTypes[0].id)
    }
  }, [availableCardTypes])

  // 当模态框打开时，根据位置设置默认标签
  useEffect(() => {
    if (isOpen && isSpecialPos && allowedCardType) {
      setActiveTab(allowedCardType)
    } else if (isOpen && availableCardTypes.length > 0) {
      setActiveTab(availableCardTypes[0].id)
    }
  }, [isOpen, isSpecialPos, allowedCardType, availableCardTypes])

  // 当切换标签时重置过滤器
  useEffect(() => {
    setClassFilter("all")
    setLevelFilter("all")
    setSearchTerm("")
  }, [activeTab])

  // 过滤卡牌
  useEffect(() => {
    if (!activeTab) return

    try {
      console.log("[CardSelectionModal] 开始过滤卡牌，当前标签:", activeTab)
      console.log("[CardSelectionModal] 所有标准卡牌数量:", ALL_STANDARD_CARDS.length)

      // 检查卡牌ID是否唯一
      const cardIds = new Set<string>()
      const duplicateIds: string[] = []
      const cardsWithoutId: any[] = []

      ALL_STANDARD_CARDS.forEach((card, index) => {
        if (!card.id) {
          console.warn(`[CardSelectionModal] 发现没有ID的卡牌，索引: ${index}`, card)
          cardsWithoutId.push({ index, card })
        } else if (cardIds.has(card.id)) {
          console.warn(`[CardSelectionModal] 发现重复的卡牌ID: ${card.id}`, card)
          duplicateIds.push(card.id)
        } else {
          cardIds.add(card.id)
        }
      })

      if (duplicateIds.length > 0) {
        console.warn("[CardSelectionModal] 重复的卡牌ID列表:", duplicateIds)
      }
      if (cardsWithoutId.length > 0) {
        console.warn("[CardSelectionModal] 没有ID的卡牌列表:", cardsWithoutId)
      }

      // 按类型过滤
      let filtered = ALL_STANDARD_CARDS.filter((card) => {
        // 确保卡牌有type字段
        if (!card.type) {
          console.warn("[CardSelectionModal] 卡牌缺少type字段:", card)
          card.type = "unknown"
        }

        // 如果是特殊位置，只显示允许的卡牌类型
        if (isSpecialPos) {
          return card.type.replace(/卡$/, "") === allowedCardType
        }

        // 否则按当前选中的标签过滤
        return card.type.replace(/卡$/, "") === activeTab
      })

      console.log(`[CardSelectionModal] 按类型过滤后的卡牌数量: ${filtered.length}`)

      // 按搜索词过滤
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        filtered = filtered.filter(
          (card) =>
            (card.name && card.name.toLowerCase().includes(term)) ||
            (card.description && card.description.toLowerCase().includes(term)) ||
            (card.primaryAttribute && card.primaryAttribute.toLowerCase().includes(term)),
        )
        console.log(`[CardSelectionModal] 按搜索词过滤后的卡牌数量: ${filtered.length}`)
      }

      // 按类别过滤
      if (classFilter !== "all") {
        filtered = filtered.filter((card) => {
          // 检查class字段是否匹配
          if (card.class === classFilter) return true

          // 检查attributes中的主职业字段是否匹配
          if (card.attributes && card.attributes.主职业 === classFilter) return true

          return false
        })
        console.log(`[CardSelectionModal] 按类别过滤后的卡牌数量: ${filtered.length}`)
      }

      // 按等级过滤
      if (levelFilter !== "all") {
        filtered = filtered.filter((card) => {
          // 检查level字段
          if (card.level !== undefined) {
            return card.level.toString() === levelFilter
          }

          // 检查attributes中的等级字段
          if (card.attributes && card.attributes.等级 !== undefined) {
            return card.attributes.等级.toString() === levelFilter
          }

          return false
        })
        console.log(`[CardSelectionModal] 按等级过滤后的卡牌数量: ${filtered.length}`)
      }

      // 检查过滤后的卡牌
      filtered.forEach((card, index) => {
        console.log(`[CardSelectionModal] 过滤后的卡牌 #${index}:`, {
          id: card.id,
          name: card.name,
          type: card.type,
          class: card.class,
          primaryAttribute: card.primaryAttribute,
          secondaryAttribute: card.secondaryAttribute,
          level: card.level,
        })
      })

      setFilteredCards(filtered)
    } catch (error) {
      console.error("[CardSelectionModal] 过滤卡牌时出错:", error)
      setFilteredCards([])
    }
  }, [activeTab, searchTerm, classFilter, levelFilter, isSpecialPos, allowedCardType])

  // 处理卡牌选择
  const handleSelectCard = (card: StandardCard) => {
    try {
      console.log("[CardSelectionModal] 选择卡牌:", card)

      // 确保卡牌有type字段
      if (!card.type) {
        card.type = isSpecialPos ? allowedCardType : activeTab
      }

      onSelect(card)
      onClose()
    } catch (error) {
      console.error("[CardSelectionModal] 选择卡牌时出错:", error)
    }
  }

  // 处理清除选择
  const handleClearSelection = () => {
    // 创建一个空卡牌，但设置正确的类型
    const emptyCard = createEmptyCard(isSpecialPos ? allowedCardType : "unknown")
    onSelect(emptyCard)
    onClose()
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

  if (!isOpen) return null

  // 获取当前卡牌类型的类别选项
  const classOptions =
    CARD_CLASS_OPTIONS_BY_TYPE[activeTab as keyof typeof CARD_CLASS_OPTIONS_BY_TYPE] ||
    [{ value: "all", label: "全部" }]

  const positionTitle = isSpecialPos
    ? `选择${SPECIAL_CARD_POSITIONS[selectedCardIndex as keyof typeof SPECIAL_CARD_POSITIONS] || "卡牌"}`
    : `选择卡牌 #${selectedCardIndex + 1}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold">{positionTitle}</h2>
            <button
              onClick={handleClearSelection}
              className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
            >
              清除选择
            </button>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧卡牌类型选择 */}
          <div className="w-48 border-r border-gray-200 bg-gray-50 overflow-y-auto">
            <div className="flex flex-col p-2">
              {availableCardTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setActiveTab(type.id)}
                  className={`text-left px-4 py-2 rounded ${
                    activeTab === type.id ? "bg-gray-200" : "hover:bg-gray-100"
                  }`}
                >
                  {type.name}
                </button>
              ))}
            </div>
          </div>

          {/* 主内容区域 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 过滤栏 */}
            <div className="p-4 border-b border-gray-200 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">类别:</span>
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1"
                >
                  {classOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">等级:</span>
                <select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1"
                >
                  {LEVEL_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <input
                  type="text"
                  placeholder="搜索卡牌..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-1"
                />
              </div>
            </div>

            {/* 卡牌网格 */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredCards.length > 0 ? (
                  filteredCards.map((card, index) => {
                    // 检查卡牌是否有ID
                    if (!card.id) {
                      console.warn(`[CardSelectionModal] 渲染时发现卡牌没有ID，索引: ${index}`, card)
                      // 为没有ID的卡牌生成临时ID
                      card.id = `temp-${index}-${Math.random().toString(36).substring(2, 11)}`
                    }

                    console.log(`[CardSelectionModal] 渲染卡牌 #${index}:`, {
                      id: card.id,
                      name: card.name,
                      key: card.id,
                    })

                    return (
                      <div
                        key={card.id}
                        ref={(el) => cardRefs.current.set(card.id, el)}
                        className="relative cursor-pointer"
                        onClick={() => handleSelectCard(card)}
                        onMouseEnter={() => setHoveredCard(card.id)}
                        onMouseLeave={() => {
                          setHoveredCard(null)
                          setIsAltPressed(false)
                        }}
                      >
                        <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                          {/* 卡牌图片区域 */}
                          <div className="bg-white p-2 h-48 flex flex-col">
                            <div className="flex items-center mb-2">
                              <img
                                src={
                                  card.imageUrl ||
                                  `/placeholder.svg?height=40&width=40&query=icon for ${card.name || "card"}`
                                }
                                alt=""
                                className="w-6 h-6 mr-1"
                              />
                              <span className="text-sm font-medium">{card.name || "未命名卡牌"}</span>
                            </div>
                            <div className="text-xs text-gray-600 overflow-hidden line-clamp-5">
                              {card.description || "无描述"}
                            </div>
                          </div>

                          {/* 卡牌底部信息 */}
                          <div
                            className="p-2 text-white"
                            style={{
                              backgroundColor: getCardTypeColor(card.type.replace(/卡$/, "")) || "#4b5563",
                            }}
                          >
                            <div className="text-sm font-medium">{card.name || "未命名卡牌"}</div>
                            <div className="flex justify-between items-center text-xs opacity-90 mt-1">
                              <span className="truncate max-w-[25%]">
                                {card.class || card.attributes?.主职业 || "——"}
                              </span>
                              <span className="truncate max-w-[25%]">
                                {card.primaryAttribute || card.attributes?.子职业 || "——"}
                              </span>
                              <span className="truncate max-w-[25%]">{card.secondaryAttribute || "——"}</span>
                              <span>{card.level || card.attributes?.等级 || "——"}</span>
                            </div>
                          </div>
                        </div>

                        {/* 悬停预览 */}
                        {hoveredCard === card.id && (
                          <div
                            className="absolute bg-white border border-gray-300 rounded-md shadow-lg"
                            style={{
                              ...getPreviewPosition(card.id),
                              width: isAltPressed ? "400px" : "280px",
                            }}
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
                    )
                  })
                ) : (
                  <div className="col-span-full flex justify-center items-center h-40">
                    <p className="text-gray-500">没有找到符合条件的卡牌</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
