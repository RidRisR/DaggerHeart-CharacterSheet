"use client"

import { X } from "lucide-react"
import { isEmptyCard, type StandardCard } from "@/card/card-types"
import { showFadeNotification } from "@/components/ui/fade-notification"
import type { SheetData } from "@/lib/sheet-data"

interface DomainCardSelectorProps {
  formData: SheetData
  onCardChange: (index: number, card: StandardCard) => void
  onClose?: () => void
  onOpenModal?: (index: number) => void
}

export function DomainCardSelector({ formData, onCardChange, onClose, onOpenModal }: DomainCardSelectorProps) {
  const handleSelectCard = () => {
    // Find first empty non-special slot (slots 5-19)
    const cards = formData.cards || []
    let emptySlotIndex = -1

    for (let i = 5; i < 20; i++) {
      if (isEmptyCard(cards[i])) {
        emptySlotIndex = i
        break
      }
    }

    if (emptySlotIndex === -1) {
      showFadeNotification("没有空余卡位", "error")
      return
    }

    // Notify parent to open modal
    onOpenModal?.(emptySlotIndex)
  }

  return (
    <div className="w-32">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-gray-700">领域卡</span>
        <button
          onClick={onClose}
          className="p-0.5 hover:bg-gray-100 rounded transition-colors"
          title="关闭"
        >
          <X className="w-3 h-3 text-gray-500" />
        </button>
      </div>

      <button
        onClick={handleSelectCard}
        className="w-full px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors font-medium"
      >
        选择领域卡
      </button>
    </div>
  )
}
