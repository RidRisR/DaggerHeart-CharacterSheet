"use client"

import { Button } from "@/components/ui/button"
import { UnifiedCardDisplay } from "@/components/unified-card-display"
import type { StandardCard } from "@/data/card/card-types"

interface CardDetailModalProps {
  isOpen: boolean
  onClose: () => void
  card: StandardCard | null
  onAddToDeck?: () => void
  onRemoveFromDeck?: () => void
  inDeck?: boolean
}

export function CardDetailModal({
  isOpen,
  onClose,
  card,
  onAddToDeck,
  onRemoveFromDeck,
  inDeck = false,
}: CardDetailModalProps) {
  if (!isOpen || !card) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold">卡牌详情</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="p-4">
          <UnifiedCardDisplay card={card} showPreview={false} />
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          {inDeck ? (
            <Button variant="destructive" onClick={onRemoveFromDeck}>
              从卡组移除
            </Button>
          ) : (
            <Button onClick={onAddToDeck}>添加到卡组</Button>
          )}
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
    </div>
  )
}
