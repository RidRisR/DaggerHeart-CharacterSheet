"use client"

import { X } from "lucide-react"
import { isEmptyCard, type StandardCard } from "@/card/card-types"
import { showFadeNotification } from "@/components/ui/fade-notification"
import { parseToNumber } from "@/lib/number-utils"
import type { SheetData } from "@/lib/sheet-data"

interface DomainCardSelectorProps {
  formData: SheetData
  tier: number
  onCardChange: (index: number, card: StandardCard) => void
  onClose?: () => void
  onOpenModal?: (index: number, levels?: string[]) => void
}

export function DomainCardSelector({ formData, tier, onCardChange, onClose, onOpenModal }: DomainCardSelectorProps) {
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

    // Calculate smart level filtering
    const tierLevelCaps: Record<number, number> = { 1: 4, 2: 7, 3: 10 }
    const levelCap = tierLevelCaps[tier] || 10

    // Parse and validate level using shared utility
    const currentLevel = parseToNumber(formData.level, 0)

    const targetLevel = currentLevel > 0
      ? Math.min(currentLevel, levelCap)  // Has valid level: use min of current and cap
      : levelCap                           // No valid level: use cap

    // Generate level filter array ["1", "2", "3", ...]
    const levelFilter = Array.from({ length: targetLevel }, (_, i) => String(i + 1))

    // Notify parent to open modal with level filter
    onOpenModal?.(emptySlotIndex, levelFilter)
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
