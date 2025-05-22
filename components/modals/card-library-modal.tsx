"use client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CardLibrary } from "@/components/card-management/card-library"
import type { StandardCard } from "@/data/card/card-types"

interface CardLibraryModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectCard: (card: StandardCard | null) => void
  title?: string
}

export function CardLibraryModal({ isOpen, onClose, onSelectCard, title = "卡牌库" }: CardLibraryModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <CardLibrary
            onSelectCard={(card) => {
              onSelectCard(card)
              onClose()
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
