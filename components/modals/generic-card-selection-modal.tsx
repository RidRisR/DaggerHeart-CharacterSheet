"use client"
import { Button } from "@/components/ui/button"
import { CardType } from "@/card"; // Import CardType
import { useState, useEffect, useMemo } from "react"
import type { StandardCard } from "@/card/card-types"
import { ImageCard } from "@/components/ui/image-card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { SheetCardReference } from "@/lib/sheet-data";
import { useCardsByType } from "@/card/card-store";
import { useSheetStore } from "@/lib/sheet-store"

interface GenericCardSelectionModalProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (cardId: string, field?: string) => void
    title: string
    cardType: Exclude<CardType, CardType.Domain> // Changed to exclude CardType.Domain
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
    const { sheetData: formData } = useSheetStore()
    const [selectedClass, setSelectedClass] = useState<string>("All")

    // Use hooks to fetch cards based on card type
    const { 
        cards: baseCards, 
        loading: cardsLoading, 
        error: cardsError,
        fetchCardsByType: fetchBaseCards
    } = useCardsByType(cardType as CardType);

    // For subclass cards, we also need profession cards to determine the filter
    const { 
        cards: professionCards, 
        loading: professionLoading, 
        error: professionError,
        fetchCardsByType: fetchProfessionCards
    } = useCardsByType(CardType.Profession);

    // 当模态框打开时，触发数据加载
    useEffect(() => {
        if (isOpen) {
            fetchBaseCards();
            if (cardType === "subclass") {
                fetchProfessionCards();
            }
        }
    }, [isOpen, cardType, fetchBaseCards, fetchProfessionCards]);

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

    // Debug logging
    console.log("GenericCardSelectionModal Debug:", {
        cardType,
        isLoading,
        hasError,
        baseCardsCount: baseCards?.length || 0,
        filteredInitialCardsCount: filteredInitialCards.length,
        finalFilteredCardsCount: finalFilteredCards.length,
        selectedClass,
        availableClasses
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
            <div className="relative bg-white rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
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
                            ) : finalFilteredCards.length === 0 ? (
                                <div className="flex items-center justify-center h-32">
                                    <div className="text-center">
                                        <p className="text-gray-500 mb-2">没有找到符合条件的卡牌</p>
                                        <p className="text-sm text-gray-400">
                                            卡牌类型: {cardType}, 基础卡牌数: {baseCards?.length || 0}
                                        </p>
                                    </div>
                                </div>
                                ) : (<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                        {finalFilteredCards.map((card) => {
                                        return (
                                            <ImageCard
                                                key={card.id}
                                                card={card}
                                            onClick={() => {
                                                console.log(`Card clicked: ${card.id}, field: ${field}`);
                                                onSelect(card.id, field);
                                            }}
                                            isSelected={false}
                                        />
                                        );
                                    })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
