"use client"
import { Button } from "@/components/ui/button"
import { CardType } from "@/card"; // Import CardType
import { useState, useEffect, useMemo } from "react"
import type { StandardCard } from "@/card/card-types"
import { SelectableCard } from "@/components/ui/selectable-card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { SheetCardReference } from "@/lib/sheet-data";
import { useCardsByType } from "@/hooks/use-cards"

// Extend SafeFormData to include missing properties
interface SafeFormData {
    gold: any[]
    experience: string[]
    hope: any[]
    hpMax: number
    hp: any[]
    stressMax: number
    stress: any[]
    armorBoxes: any[]
    armorMax: number
    companionExperience: string[]
    companionExperienceValue: string[]
    companionStress: any[]
    cards: StandardCard[]
    agility: { checked: boolean; value: string }
    strength: { checked: boolean; value: string }
    finesse: { checked: boolean; value: string }
    professionRef?: SheetCardReference;
    // Add other properties as needed
}

interface GenericCardSelectionModalProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (cardId: string, field?: string) => void
    title: string
    cardType: Exclude<CardType, CardType.Domain> // Changed to exclude CardType.Domain
    field?: string // Optional field for ancestry
    levelFilter?: number // Optional level filter for ancestry
    formData: SafeFormData // Use the defined type for safeFormData
}

export function GenericCardSelectionModal({
    isOpen,
    onClose,
    onSelect,
    title,
    cardType,
    field,
    levelFilter,
    formData,
}: GenericCardSelectionModalProps) {
    const [selectedClass, setSelectedClass] = useState<string>("All")

    // Use hooks to fetch cards based on card type
    const { 
        cards: baseCards, 
        loading: cardsLoading, 
        error: cardsError 
    } = useCardsByType(cardType as CardType, {
        enabled: isOpen
    });

    // For subclass cards, we also need profession cards to determine the filter
    const { 
        cards: professionCards, 
        loading: professionLoading, 
        error: professionError 
    } = useCardsByType(CardType.Profession, {
        enabled: isOpen && cardType === "subclass"
    });

    // Calculate filtered cards based on card type and level filter
    const filteredInitialCards = useMemo(() => {
        if (!baseCards) return [];

        let initialCards = baseCards;

        if (cardType === "subclass") {
            // Find the name of the selected profession card
            const selectedProfessionCard = professionCards?.find(pCard => pCard.id === formData.professionRef?.id);
            const professionName = selectedProfessionCard?.name;

            // Filter subclass cards: must be level 1 and match the determined professionName
            initialCards = baseCards.filter(
                (card): card is StandardCard =>
                    card.level === 1 && card.class === professionName
            );
        } else {
            // For other card types, apply levelFilter if it exists
            if (levelFilter) {
                initialCards = baseCards.filter(card => card.level === levelFilter);
            }
        }

        return initialCards;
    }, [baseCards, professionCards, cardType, levelFilter, formData.professionRef?.id]);

    // Calculate available classes for the filter dropdown
    const availableClasses = useMemo(() => {
        const uniqueClasses = Array.from(
            new Set(filteredInitialCards.flatMap((card) => card.class || []).filter((cls) => cls)),
        );
        return ["All", ...uniqueClasses];
    }, [filteredInitialCards]);

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

    if (!isOpen) return null

    // Calculate final filtered cards based on class selection
    const finalFilteredCards = filteredInitialCards.filter(
        (card) => selectedClass === "All" || (card.class && card.class.includes(selectedClass)),
    )

    // Show loading state
    const isLoading = cardsLoading || (cardType === "subclass" && professionLoading);
    const hasError = cardsError || (cardType === "subclass" && professionError);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
            <div className="relative bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Select value={selectedClass} onValueChange={setSelectedClass} disabled={isLoading}>
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
                            disabled={isLoading}
                        >
                            清除选择
                        </Button>
                    </div>
                    <h2 className="text-xl font-bold">{title}</h2>
                </div>
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-32">
                                <p className="text-gray-500">加载卡牌中...</p>
                            </div>
                        ) : hasError ? (
                            <div className="flex items-center justify-center h-32">
                                <div className="text-center">
                                    <p className="text-red-500 mb-2">加载失败</p>
                                    <p className="text-sm text-gray-500">
                                        {cardsError || professionError || "未知错误"}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {finalFilteredCards.map((card) => (
                                    <SelectableCard
                                        key={card.id}
                                        card={card}
                                        onClick={() => onSelect(card.id, field)}
                                        isSelected={false}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
