"use client"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { ALL_STANDARD_CARDS } from "@/data/card"
import { useState, useEffect } from "react"
import type { StandardCard } from "@/data/card/card-types"
import { SelectableCard } from "@/components/ui/selectable-card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface AncestryModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (ancestryId: string, field: string) => void
  title: string
  field: string
}

export function AncestrySelectionModal({ isOpen, onClose, onSelect, title, field }: AncestryModalProps) {
  const [ancestryCards, setAncestryCards] = useState<StandardCard[]>([])
  const [selectedClass, setSelectedClass] = useState<string>("All")
  const [availableClasses, setAvailableClasses] = useState<string[]>(["All"])

  useEffect(() => {
    const cards = ALL_STANDARD_CARDS.filter(
      (card): card is StandardCard => card.type === "ancestry",
    )
    setAncestryCards(cards)
    const uniqueClasses = Array.from(new Set(cards.flatMap(card => card.class || []).filter(cls => cls))) // Filter out empty/undefined classes
    setAvailableClasses(["All", ...uniqueClasses])
  }, [])

  if (!isOpen) return null

  const filteredCards = ancestryCards.filter(card =>
    selectedClass === "All" || (card.class && card.class.includes(selectedClass))
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-4xl p-4 max-h-[90vh] flex flex-col">
        <div className="mb-4 border-b border-gray-200 pb-2 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Select
              value={selectedClass}
              onValueChange={setSelectedClass}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="筛选职业类别" />
              </SelectTrigger>
              <SelectContent>
                {availableClasses.map((cls) => (
                  <SelectItem key={cls} value={cls}>
                    {cls === "All" ? "全部类别" : cls}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="destructive"
              onClick={() => onSelect("none", field)}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              清除选择
            </Button>
          </div>
          <h2 className="text-xl font-bold">{title}</h2>
        </div>
        <ScrollArea className="h-[70vh] pr-4 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCards.map((card) => (
              <SelectableCard key={card.id} card={card} onClick={() => onSelect(card.id, field)} />
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
