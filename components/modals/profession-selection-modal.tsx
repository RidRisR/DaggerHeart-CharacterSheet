"use client"
import { Button } from "@/components/ui/button"
import { CardType, getStandardCardsByType } from "@/data/card"
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

interface ProfessionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (professionId: string) => void
  title: string
}

export function ProfessionSelectionModal({ isOpen, onClose, onSelect, title }: ProfessionModalProps) {
  const [professionCards, setProfessionCards] = useState<StandardCard[]>([])
  const [selectedClass, setSelectedClass] = useState<string>("All")
  const [availableClasses, setAvailableClasses] = useState<string[]>(["All"])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    } else {
      document.removeEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    const cards = getStandardCardsByType(CardType.Profession)
    setProfessionCards(cards)
    const uniqueClasses = Array.from(new Set(cards.flatMap(card => card.class || []).filter(cls => cls)))
    setAvailableClasses(["All", ...uniqueClasses])
  }, [])

  if (!isOpen) return null

  const filteredCards = professionCards.filter(card =>
    selectedClass === "All" || (card.class && card.class.includes(selectedClass))
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      {/* Removed p-4 from this div */}
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Changed className for padding and consistency */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
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
              onClick={() => onSelect("none")}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              清除选择
            </Button>
          </div>
          <h2 className="text-xl font-bold">{title}</h2>
        </div>
        {/* New structure for content area */}
        <div className="flex-1 flex flex-col overflow-hidden"> {/* Outer content wrapper */}
          <div className="flex-1 overflow-y-auto p-4"> {/* Inner scrollable grid area, changed pr-4 to p-4 */}
            {/* Adjusted grid columns for wider cards to match SelectableCard's w-72 (288px) */}
            {/* Max-w-4xl (896px) for modal: 896 / 288 = ~3 cards. Gap is 1rem (16px). (288*3) + (16*2) = 864 + 32 = 896 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCards.map((card) => (
                <SelectableCard key={card.id} card={card} onClick={() => onSelect(card.id)} isSelected={false} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
