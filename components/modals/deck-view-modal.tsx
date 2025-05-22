"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { X, Plus, Trash2, GripVertical, Lock } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CardSelectionModal } from "@/components/modals/card-selection-modal"
import { UnifiedCardDisplay } from "@/components/unified-card-display"
import type { StandardCard } from "@/data/card/card-types"
import { isSpecialCardPosition, specialCardPositions, createEmptyCard, isEmptyCard } from "@/data/card/card-types"
import { convertToStandardCard } from "@/data/card"

interface DeckViewModalProps {
  isOpen: boolean
  onClose: () => void
  cards: any[]
  onCardChange: (index: number, card: any) => void
  onCardRemove: (index: number) => void
  onCardsReorder: (newCards: any[]) => void
}

export function DeckViewModal({
  isOpen,
  onClose,
  cards,
  onCardChange,
  onCardRemove,
  onCardsReorder,
}: DeckViewModalProps) {
  const [cardSelectionModalOpen, setCardSelectionModalOpen] = useState(false)
  const [selectedCardIndex, setSelectedCardIndex] = useState(0)
  const [previewCardIndex, setPreviewCardIndex] = useState<number | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const [activeTab, setActiveTab] = useState("view")
  const [searchTerm, setSearchTerm] = useState("")
  const [libraryCards, setLibraryCards] = useState<StandardCard[]>([])
  const [importText, setImportText] = useState("") // Declare importText variable

  // 安全地转换卡牌
  const standardCards = cards.map((card, index) => {
    try {
      console.log(`Processing card at index ${index}:`, card)
      if (isEmptyCard(card)) {
        // 为空卡牌添加默认类型
        const defaultType = isSpecialCardPosition(index)
          ? specialCardPositions[index as keyof typeof specialCardPositions]?.type || "unknown"
          : "unknown"
        console.log(`Creating empty card with type: ${defaultType}`)
        return createEmptyCard(defaultType)
      }
      const result = convertToStandardCard(card)
      return result
    } catch (error) {
      console.error(`Error converting card at index ${index}:`, error)
      console.error(`Problematic card data:`, card)
      // 为错误卡牌添加默认类型
      const defaultType = isSpecialCardPosition(index)
        ? specialCardPositions[index as keyof typeof specialCardPositions]?.type || "unknown"
        : "unknown"
      return createEmptyCard(defaultType)
    }
  })

  // 初始化卡牌库
  useEffect(() => {
    try {
      // 初始化为空数组，不再使用示例卡牌
      setLibraryCards([])
    } catch (error) {
      console.error("Error initializing card library:", error)
      setLibraryCards([])
    }
  }, [])

  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "auto"
    }
    return () => {
      document.body.style.overflow = "auto"
    }
  }, [isOpen])

  // Close preview when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (previewCardIndex !== null) {
        const previewElement = document.getElementById("card-preview")
        const cardElement = cardRefs.current[previewCardIndex]

        if (
          previewElement &&
          !previewElement.contains(event.target as Node) &&
          cardElement &&
          !cardElement.contains(event.target as Node)
        ) {
          setPreviewCardIndex(null)
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [previewCardIndex])

  const handleAddCard = (index: number) => {
    // 不允许添加前四张特殊卡牌
    if (index < 4) return

    setSelectedCardIndex(index)
    setCardSelectionModalOpen(true)
  }

  const handleCardSelect = (card: any) => {
    // 不允许修改前四张特殊卡牌
    if (selectedCardIndex < 4) return

    // 确保卡牌有type字段
    if (card && !card.type) {
      card.type = "unknown"
    }

    onCardChange(selectedCardIndex, card)
    setCardSelectionModalOpen(false)
  }

  const handleCardClick = (index: number) => {
    if (cards[index]?.name) {
      setPreviewCardIndex(previewCardIndex === index ? null : index)
    } else if (index >= 4) {
      // 只有非特殊卡牌的空位才能点击添加
      handleAddCard(index)
    }
  }

  // 检查是否是特殊卡位（前四个位置）
  const isSpecialSlot = (index: number): boolean => {
    return index < 4
  }

  // 获取特殊卡位的标签
  const getSpecialSlotLabel = (index: number): string => {
    switch (index) {
      case 0:
        return "职业卡"
      case 1:
        return "血统卡 1"
      case 2:
        return "血统卡 2"
      case 3:
        return "社区卡"
      default:
        return ""
    }
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    // 特殊卡位不允许拖动
    if (isSpecialSlot(index)) {
      e.preventDefault()
      return
    }

    if (!cards[index]?.name) return // Don't allow dragging empty slots
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
    // Set a ghost image
    const dragImage = new Image()
    dragImage.src = cards[index].imageUrl || `/placeholder.svg?height=100&width=73&query=card`
    e.dataTransfer.setDragImage(dragImage, 50, 50)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault()
    // 特殊卡位不允许放置其他卡牌
    if (isSpecialSlot(index)) {
      return
    }

    if (draggedIndex === null || draggedIndex === index) return
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault()
    // 特殊卡位不允许放置其他卡牌
    if (isSpecialSlot(index)) {
      return
    }

    if (draggedIndex === null || draggedIndex === index) return

    // Create a new array with the reordered cards
    const newCards = [...cards]
    const draggedCard = newCards[draggedIndex]

    // Remove the dragged card from its original position
    newCards.splice(draggedIndex, 1)

    // Insert the dragged card at the new position
    newCards.splice(index, 0, draggedCard)

    // Update the state
    onCardsReorder(newCards)

    // Reset drag state
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  // Calculate preview position
  const getPreviewPosition = (index: number) => {
    if (previewCardIndex === null) return {}

    const cardElement = cardRefs.current[index]
    if (!cardElement || !modalRef.current) return {}

    const cardRect = cardElement.getBoundingClientRect()
    const modalRect = modalRef.current.getBoundingClientRect()

    // Position to the right if there's enough space, otherwise below
    const rightSpace = modalRect.right - cardRect.right
    const bottomSpace = modalRect.bottom - cardRect.bottom

    if (rightSpace >= 350) {
      // Position to the right
      return {
        left: `${cardRect.right - modalRect.left + 16}px`,
        top: `${cardRect.top - modalRect.top}px`,
      }
    } else if (bottomSpace >= 400) {
      // Position below
      return {
        left: `${cardRect.left - modalRect.left}px`,
        top: `${cardRect.bottom - modalRect.top + 16}px`,
      }
    } else {
      // Position in center if no good space
      return {
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
      }
    }
  }

  const handleImport = () => {
    try {
      const importedData = JSON.parse(importText)

      // 检查是否是数组
      if (Array.isArray(importedData)) {
        // 转换为标准格式
        const standardCards = importedData
          .map((card) => {
            try {
              // 确保导入的卡牌有type字段
              if (!card.type) {
                card.type = "unknown"
              }
              return convertToStandardCard(card)
            } catch (error) {
              console.error("Error converting imported card:", error)
              return null
            }
          })
          .filter(Boolean) as StandardCard[]

        // 更新卡组
        const newCards = [...cards]
        standardCards.forEach((card, index) => {
          if (index < newCards.length) {
            newCards[index] = card
          }
        })

        onCardsReorder(newCards)
        setImportText("")
        setActiveTab("view")
      } else if (typeof importedData === "object") {
        // 单张卡牌
        try {
          // 确保导入的卡牌有type字段
          if (!importedData.type) {
            importedData.type = "unknown"
          }
          const standardCard = convertToStandardCard(importedData)

          if (selectedCardIndex !== null) {
            onCardChange(selectedCardIndex, standardCard)
          } else {
            // 找到第一个空位
            const emptyIndex = cards.findIndex((card) => !card || !card.name)
            if (emptyIndex !== -1) {
              onCardChange(emptyIndex, standardCard)
            }
          }

          setImportText("")
          setActiveTab("view")
        } catch (error) {
          console.error("Error processing single card import:", error)
        }
      } else {
        console.error("无效的卡牌数据格式")
      }
    } catch (error) {
      console.error("导入失败：" + (error as Error).message)
    }
  }

  const handleExport = () => {
    try {
      // 过滤掉空卡牌
      const validCards = cards.filter((card) => card && card.name)

      // 转换为标准格式
      const standardCards = validCards
        .map((card) => {
          try {
            return convertToStandardCard(card)
          } catch (error) {
            console.error("Error converting card for export:", error)
            return null
          }
        })
        .filter(Boolean)

      // 转换为JSON
      const json = JSON.stringify(standardCards, null, 2)

      // 创建下载链接
      const blob = new Blob([json], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "card-deck.json"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Export failed:", error)
    }
  }

  const addFromLibrary = (libraryCard: StandardCard) => {
    try {
      // 找到第一个空位
      const emptyIndex = cards.findIndex((card) => !card || !card.name)
      if (emptyIndex !== -1) {
        onCardChange(emptyIndex, libraryCard)
      }
    } catch (error) {
      console.error("Error adding card from library:", error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div
        ref={modalRef}
        className="relative bg-white rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] flex flex-col"
        style={{ height: "90vh" }}
      >
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold">卡组管理</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <ScrollArea className="flex-1 overflow-y-auto" style={{ height: "calc(90vh - 8rem)" }}>
          <div className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {standardCards.map((card, index) => {
                const isSpecial = isSpecialCardPosition(index)
                const specialInfo = isSpecial ? specialCardPositions[index as keyof typeof specialCardPositions] : null

                return (
                  <div
                    key={`deck-card-${index}`}
                    ref={(el) => { cardRefs.current[index] = el }}
                    className={`relative ${
                      dragOverIndex === index && !isSpecialSlot(index)
                        ? "border-2 border-dashed border-blue-500 rounded-lg"
                        : ""
                    } ${isSpecial ? "border-2 border-yellow-400 bg-yellow-50" : ""}`}
                    draggable={!!card.name && !isSpecialSlot(index)}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                  >
                    {isSpecial && (
                      <div className="absolute -top-6 left-0 right-0 text-center">
                        <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded-t-md border border-gray-300 border-b-0">
                          {specialInfo?.name || "特殊卡牌"}
                        </span>
                        <span className="text-xs">🔒</span>
                      </div>
                    )}
                    {card.name ? (
                      // 已有卡牌
                      <div
                        className={`relative aspect-[816/1110] rounded-lg overflow-hidden border ${
                          previewCardIndex === index
                            ? "border-blue-500 shadow-md"
                            : isSpecialSlot(index)
                              ? "border-yellow-300"
                              : "border-gray-200"
                        } shadow-sm group cursor-pointer`}
                        onClick={() => handleCardClick(index)}
                      >
                        <img
                          src={
                            card.imageUrl ||
                            `/placeholder.svg?height=1110&width=816&query=fantasy card ${card.name || "card"}`
                          }
                          alt={card.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-2">
                          <p className="text-sm font-medium truncate">{card.name}</p>
                          <div className="flex justify-between text-xs text-gray-300 mt-1">
                            <span>{card.type ? card.type : "未知"}</span>
                            <span>{card.level ? `等级 ${card.level}` : "——"}</span>
                          </div>
                        </div>

                        {/* 拖动手柄 - 只在非特殊卡位显示 */}
                        {!isSpecialSlot(index) && (
                          <div
                            className="absolute top-2 left-2 bg-black bg-opacity-50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-move"
                            onMouseDown={(e) => e.stopPropagation()} // Prevent card click when dragging
                          >
                            <GripVertical size={16} />
                          </div>
                        )}

                        {/* 锁定图标 - 只在特殊卡位显示 */}
                        {isSpecialSlot(index) && (
                          <div className="absolute top-2 left-2 bg-yellow-500 bg-opacity-70 text-white p-1 rounded-full">
                            <Lock size={16} />
                          </div>
                        )}

                        {/* 删除按钮 - 只在非特殊卡位显示 */}
                        {!isSpecialSlot(index) && (
                          <button
                            className="absolute bottom-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation()
                              onCardRemove(index)
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ) : (
                      // 空卡位
                      <div
                        className={`aspect-[816/1110] rounded-lg border-2 border-dashed ${
                          isSpecialSlot(index)
                            ? "border-yellow-300 bg-yellow-50"
                            : "border-gray-300 bg-gray-50 hover:bg-gray-100 cursor-pointer"
                        } flex items-center justify-center transition-colors`}
                        onClick={() => !isSpecialSlot(index) && handleAddCard(index)}
                      >
                        <div className="flex flex-col items-center text-gray-500">
                          {isSpecialSlot(index) ? (
                            <>
                              <Lock size={24} className="text-yellow-500" />
                              <p className="mt-2 text-sm text-center">
                                {getSpecialSlotLabel(index)}
                                <br />
                                <span className="text-xs">在第一页选择</span>
                              </p>
                            </>
                          ) : (
                            <>
                              <Plus size={32} />
                              <p className="mt-2 text-sm">添加卡牌</p>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            卡组上限: <span className="font-medium">{cards.filter((card) => card?.name).length}/20</span> 张卡牌
          </p>
          <p className="text-xs text-gray-500 mt-1">
            前四张特殊卡牌（职业卡、血统卡1、血统卡2、社区卡）会随着第一页的选择自动更新，不能在此处编辑。
          </p>
        </div>

        {/* 卡牌预览 - 只在点击时显示 */}
        {previewCardIndex !== null && standardCards[previewCardIndex]?.name && (
          <div
            id="card-preview"
            className="absolute z-20 w-[350px] bg-white border border-gray-300 rounded-md shadow-xl"
            style={getPreviewPosition(previewCardIndex)}
          >
            <button
              className="absolute top-2 right-2 z-30 bg-gray-800 bg-opacity-70 text-white p-1 rounded-full"
              onClick={(e) => {
                e.stopPropagation()
                setPreviewCardIndex(null)
              }}
            >
              <X size={16} />
            </button>

            <UnifiedCardDisplay card={standardCards[previewCardIndex]} showPreview={true} />
          </div>
        )}

        <CardSelectionModal
          isOpen={cardSelectionModalOpen}
          onClose={() => setCardSelectionModalOpen(false)}
          onSelect={handleCardSelect}
          selectedCardIndex={selectedCardIndex}
        />
      </div>
    </div>
  )
}
