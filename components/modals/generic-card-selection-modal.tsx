"use client"
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

interface GenericCardSelectionModalProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (cardId: string, field?: string) => void
    title: string
    cardType: "profession" | "ancestry" | "community"
    field?: string // Optional field for ancestry
    levelFilter?: number // Optional level filter for ancestry
}

export function GenericCardSelectionModal({
    isOpen,
    onClose,
    onSelect,
    title,
    cardType,
    field,
    levelFilter,
}: GenericCardSelectionModalProps) {
    const [cards, setCards] = useState<StandardCard[]>([])
    const [selectedClass, setSelectedClass] = useState<string>("All")
    const [availableClasses, setAvailableClasses] = useState<string[]>(["All"])

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose()
            }
        }

        if (isOpen) {
            document.addEventListener("keydown", handleKeyDown)
        } else {
            document.removeEventListener("keydown", handleKeyDown)
        }

        return () => {
            document.removeEventListener("keydown", handleKeyDown)
        }
    }, [isOpen, onClose])

    useEffect(() => {
        const filteredCards = ALL_STANDARD_CARDS.filter(
            (card): card is StandardCard => card.type === cardType && (!levelFilter || card.level === levelFilter),
        )
        setCards(filteredCards)
        const uniqueClasses = Array.from(new Set(filteredCards.flatMap((card) => card.class || []).filter((cls) => cls)))
        setAvailableClasses(["All", ...uniqueClasses])
    }, [cardType, levelFilter])

    if (!isOpen) return null

    const filteredCards = cards.filter(
        (card) => selectedClass === "All" || (card.class && card.class.includes(selectedClass)),
    )

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
            <div className="relative bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Select value={selectedClass} onValueChange={setSelectedClass}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="筛选类别" />
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
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredCards.map((card) => (
                                <SelectableCard
                                    key={card.id}
                                    card={card}
                                    onClick={() => onSelect(card.id, field)}
                                    isSelected={false}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
