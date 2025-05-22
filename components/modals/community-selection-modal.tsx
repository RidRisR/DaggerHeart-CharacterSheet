"use client"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { ALL_STANDARD_CARDS } from "@/data/card"
import { useState, useEffect } from "react"
import type { StandardCard } from "@/data/card/card-types"
import { SelectableCard } from "@/components/ui/selectable-card"

interface CommunityModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (communityId: string) => void
  title: string
}

export function CommunitySelectionModal({ isOpen, onClose, onSelect, title }: CommunityModalProps) {
  const [communityCards, setCommunityCards] = useState<StandardCard[]>([])

  useEffect(() => {
    const cards = ALL_STANDARD_CARDS.filter(
      (card): card is StandardCard => card.type === "community",
    )
    setCommunityCards(cards)
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-4xl p-4 max-h-[90vh] flex flex-col">
        <div className="mb-4 border-b border-gray-200 pb-2 flex justify-between items-center">
          <h2 className="text-xl font-bold">{title}</h2>
          <Button
            variant="destructive"
            onClick={() => onSelect("none")}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            清除选择
          </Button>
        </div>
        <ScrollArea className="h-[70vh] pr-4 flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {communityCards.map((card) => (
              <SelectableCard key={card.id} card={card} onClick={() => onSelect(card.id)} />
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
