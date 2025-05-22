"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DeckViewModal } from "@/components/modals/deck-view-modal"
import { loadCharacterData, saveCharacterData } from "@/lib/storage"
import { createEmptyCard } from "@/data/card/card-types"

// 默认空卡牌
const emptyCard = createEmptyCard

export function DeckViewButton() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [cards, setCards] = useState<any[]>([])

  // 打开模态框时加载卡组数据
  const openDeckViewModal = () => {
    const savedData = loadCharacterData()
    if (savedData && savedData.cards) {
      setCards(savedData.cards)
    } else {
      // 如果没有保存的卡组数据，创建20个空卡位
      setCards(
        Array(20)
          .fill(0)
          .map(() => ({ ...emptyCard })),
      )
    }
    setIsModalOpen(true)
  }

  const closeDeckViewModal = () => {
    setIsModalOpen(false)
  }

  // 处理卡牌变更
  const handleCardChange = (index: number, card: any) => {
    const newCards = [...cards]
    newCards[index] = card
    setCards(newCards)

    // 保存到localStorage
    const savedData = loadCharacterData() || {}
    saveCharacterData({
      ...savedData,
      cards: newCards,
    })
  }

  // 处理卡牌移除
  const handleCardRemove = (index: number) => {
    const newCards = [...cards]
    newCards[index] = { ...emptyCard }
    setCards(newCards)

    // 保存到localStorage
    const savedData = loadCharacterData() || {}
    saveCharacterData({
      ...savedData,
      cards: newCards,
    })
  }

  // 处理卡牌重新排序
  const handleCardsReorder = (newCards: any[]) => {
    setCards(newCards)

    // 保存到localStorage
    const savedData = loadCharacterData() || {}
    saveCharacterData({
      ...savedData,
      cards: newCards,
    })
  }

  return (
    <>
      <Button onClick={openDeckViewModal} className="fixed bottom-4 right-4 z-10 bg-gray-800 hover:bg-gray-700">
        查看卡组
      </Button>

      <DeckViewModal
        isOpen={isModalOpen}
        onClose={closeDeckViewModal}
        cards={cards}
        onCardChange={handleCardChange}
        onCardRemove={handleCardRemove}
        onCardsReorder={handleCardsReorder}
      />
    </>
  )
}
