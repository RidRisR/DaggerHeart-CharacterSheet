"use client"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ALL_STANDARD_CARDS } from "@/data/card"
import { getCardTypeColor } from "@/data/card/card-ui-config"
import { useState, useEffect } from "react"

interface ProfessionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (professionId: string) => void
  title: string
}

export function ProfessionSelectionModal({ isOpen, onClose, onSelect, title }: ProfessionModalProps) {
  const [professionCards, setProfessionCards] = useState<any[]>([])

  useEffect(() => {
    // 过滤出职业卡牌
    const cards = ALL_STANDARD_CARDS.filter(
      (card) => card.type === "profession",
    ).map((card) => ({
      id: card.id || card.name.toLowerCase().replace(/\s+/g, "-"),
      name: card.name,
      description: card.description || "",
      imageUrl: card.imageUrl || `/placeholder.svg?height=1110&width=816&query=fantasy profession card ${card.name}`,
    }))

    setProfessionCards(cards)
  }, [])

  if (!isOpen) return null

  // 计算卡牌宽度，保持816:1110的比例
  const aspectRatio = 816 / 1110 // 约为 0.735

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-4xl p-4">
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
        <ScrollArea className="h-[70vh] pr-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {professionCards.map((profession) => (
              <div
                key={profession.id}
                className="rounded-lg overflow-hidden shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => onSelect(profession.id)}
              >
                <div className="bg-white h-40 flex items-center justify-center">
                  {profession.imageUrl ? (
                    <img
                      src={profession.imageUrl || "/placeholder.svg"}
                      alt={profession.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-gray-400">
                      <Plus size={24} />
                    </div>
                  )}
                </div>
                <div className={`p-2 text-white ${getCardTypeColor("profession")}`}>
                  <div className="font-medium">{profession.name}</div>
                  <div className="flex justify-between items-center">
                    <span>profession</span>
                    <div className="flex gap-2">
                      <span>—</span>
                      <span>—</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
