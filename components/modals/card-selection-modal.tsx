"use client"

import { useState, useEffect } from "react"
import {
  ALL_CARD_TYPES,
  SPECIAL_CARD_POSITIONS,
  ALL_STANDARD_CARDS,
  CARD_CLASS_OPTIONS_BY_TYPE,
  LEVEL_OPTIONS,
  isSpecialCardPosition,
  getAllowedCardTypeForPosition,
} from "@/data/card"
import type { StandardCard } from "@/data/card/card-types"
import { createEmptyCard } from "@/data/card/card-types"
import { SelectableCard } from "@/components/ui/selectable-card"

interface CardSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (card: any) => void
  selectedCardIndex: number
}

export function CardSelectionModal({ isOpen, onClose, onSelect, selectedCardIndex }: CardSelectionModalProps) {
  const allowedCardType = getAllowedCardTypeForPosition(String(selectedCardIndex))
  const isSpecialPos = isSpecialCardPosition(String(selectedCardIndex))

  const availableCardTypes = isSpecialPos
    ? ALL_CARD_TYPES.filter((type) => type.id === allowedCardType)
    : ALL_CARD_TYPES

  const [activeTab, setActiveTab] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [classFilter, setClassFilter] = useState("all")
  const [levelFilter, setLevelFilter] = useState("all")
  const [filteredCards, setFilteredCards] = useState<StandardCard[]>([])

  useEffect(() => {
    if (availableCardTypes.length > 0) {
      setActiveTab(availableCardTypes[0].id)
    }
  }, [availableCardTypes])

  useEffect(() => {
    if (isOpen && isSpecialPos && allowedCardType) {
      setActiveTab(allowedCardType)
    } else if (isOpen && availableCardTypes.length > 0) {
      setActiveTab(availableCardTypes[0].id)
    }
  }, [isOpen, isSpecialPos, allowedCardType, availableCardTypes])

  useEffect(() => {
    setClassFilter("all")
    setLevelFilter("all")
    setSearchTerm("")
  }, [activeTab])

  useEffect(() => {
    if (!activeTab) return

    try {
      let filtered = ALL_STANDARD_CARDS.filter((card) => {
        if (!card.type) {
          card.type = "unknown"
        }

        if (isSpecialPos) {
          return card.type.replace(/卡$/, "") === allowedCardType
        }

        return card.type.replace(/卡$/, "") === activeTab
      })

      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        filtered = filtered.filter(
          (card) =>
            (card.name && card.name.toLowerCase().includes(term)) ||
            (card.description && card.description.toLowerCase().includes(term)) ||
            (card.primaryAttribute && card.primaryAttribute.toLowerCase().includes(term)),
        )
      }

      if (classFilter !== "all") {
        filtered = filtered.filter((card) => {
          if (card.class === classFilter) return true
          if (card.attributes && card.attributes.主职业 === classFilter) return true
          return false
        })
      }

      if (levelFilter !== "all") {
        filtered = filtered.filter((card) => {
          if (card.level !== undefined) {
            return card.level.toString() === levelFilter
          }

          if (card.attributes && card.attributes.等级 !== undefined) {
            return card.attributes.等级.toString() === levelFilter
          }

          return false
        })
      }

      setFilteredCards(filtered)
    } catch (error) {
      console.error("[CardSelectionModal] 过滤卡牌时出错:", error)
      setFilteredCards([])
    }
  }, [activeTab, searchTerm, classFilter, levelFilter, isSpecialPos, allowedCardType])

  const handleSelectCard = (selectedCard: StandardCard) => {
    try {
      if (!selectedCard.type) {
        selectedCard.type = isSpecialPos ? allowedCardType : activeTab
      }

      onSelect(selectedCard)
      onClose()
    } catch (error) {
      console.error("[CardSelectionModal] 选择卡牌时出错:", error)
    }
  }

  const handleClearSelection = () => {
    const emptyCard = createEmptyCard(isSpecialPos ? allowedCardType : "unknown")
    onSelect(emptyCard)
    onClose()
  }

  if (!isOpen) return null

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

        <div className="flex-1 flex overflow-hidden">
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

          <div className="flex-1 flex flex-col overflow-hidden">
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

            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredCards.length > 0 ? (
                  filteredCards.map((cardData, index) => {
                    if (!cardData.id) {
                      cardData.id = `temp-${index}-${Math.random().toString(36).substring(2, 11)}`
                    }

                    return (
                      <SelectableCard
                        key={cardData.id}
                        card={cardData}
                        onClick={() => handleSelectCard(cardData)}
                      />
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
