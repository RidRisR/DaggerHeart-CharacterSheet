"use client"

import { X } from "lucide-react"
import { isEmptyCard, type StandardCard } from "@/card/card-types"
import { showFadeNotification } from "@/components/ui/fade-notification"
import type { SheetData } from "@/lib/sheet-data"

interface SubclassCardSelectorProps {
  formData: SheetData
  onCardChange: (index: number, card: StandardCard) => void
  onClose?: () => void
  onOpenModal?: (index: number, profession?: string) => void
}

export function SubclassCardSelector({ formData, onCardChange, onClose, onOpenModal }: SubclassCardSelectorProps) {
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
      showFadeNotification({ message: "没有空余卡位", type: "error" })
      return
    }

    // Get current profession from profession card (usually at index 0)
    let currentProfession: string | undefined = undefined
    const professionCard = cards[0]
    if (professionCard && !isEmptyCard(professionCard) && professionCard.type === "profession") {
      // Use the class field from profession card
      currentProfession = professionCard.class
    }

    // Notify parent to open modal with subclass filter and profession filter
    onOpenModal?.(emptySlotIndex, currentProfession)

    // Close the popover after opening modal
    onClose?.()
  }

  return (
    <div className="w-32">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-gray-700">子职业卡</span>
        <button
          onClick={onClose}
          className="p-0.5 hover:bg-gray-100 rounded transition-colors"
          title="关闭"
        >
          <X className="w-2.5 h-2.5 text-gray-500" />
        </button>
      </div>

      <button
        onClick={handleSelectCard}
        className="w-full px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors font-medium"
      >
        选择子职业卡
      </button>
    </div>
  )
}
