"use client"
import { Button } from "@/components/ui/button"
import { CardType } from "@/card"; // Import CardType
import { useState, useEffect, useMemo } from "react"
import type { StandardCard } from "@/card/card-types"
import { ImageCard } from "@/components/ui/image-card"
import { SelectableCard } from "@/components/ui/selectable-card"
import { useTextModeStore } from "@/lib/text-mode-store"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { SheetCardReference } from "@/lib/sheet-data";
import { getStandardCardsByTypeAsync } from "@/card";
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
    const { isTextMode } = useTextModeStore()
    const [selectedClass, setSelectedClass] = useState<string>("All")
    const [selectedSource, setSelectedSource] = useState<string>("All")
    const [refreshTrigger, setRefreshTrigger] = useState(0); // 用于触发卡牌刷新动画
    const [baseCards, setBaseCards] = useState<StandardCard[]>([]);
    const [professionCards, setProfessionCards] = useState<StandardCard[]>([]);
    const [cardsLoading, setCardsLoading] = useState(true);
    const [cardsError, setCardsError] = useState<string | null>(null);

    // Load cards asynchronously when modal opens or card type changes
    useEffect(() => {
        if (!isOpen || !cardType) return;

        let isMounted = true;
        
        const loadCards = async () => {
            setCardsLoading(true);
            setCardsError(null);

            try {
                // Load base cards
                const cards = await getStandardCardsByTypeAsync(cardType as CardType);
                if (isMounted) {
                    setBaseCards(cards);
                }

                // Load profession cards if needed for subclass filtering
                if (cardType === "subclass") {
                    const profCards = await getStandardCardsByTypeAsync(CardType.Profession);
                    if (isMounted) {
                        setProfessionCards(profCards);
                    }
                }
            } catch (error) {
                if (isMounted) {
                    setCardsError(error instanceof Error ? error.message : "Failed to load cards");
                }
            } finally {
                if (isMounted) {
                    setCardsLoading(false);
                }
            }
        };

        loadCards();

        return () => {
            isMounted = false;
        };
    }, [isOpen, cardType]);

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

    // Calculate final filtered cards based on class and source selection
    const finalFilteredCards = useMemo(() => {
        return filteredInitialCards.filter((card) => {
            // Class filter
            const classMatch = selectedClass === "All" || (card.class && card.class.includes(selectedClass));

            // Source filter - StandardCard doesn't have source property, skip this filter
            let sourceMatch = true;

            return classMatch && sourceMatch;
        });
    }, [filteredInitialCards, selectedClass, selectedSource]);

    // 监听筛选结果变化，触发刷新动画
    useEffect(() => {
        setRefreshTrigger(prev => prev + 1);
    }, [finalFilteredCards]);

    // Show loading state
    const isLoading = cardsLoading;
    const hasError = cardsError;

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
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold">{title}</h2>
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
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        ✕
                    </button>
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
                                        {cardsError || "未知错误"}
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
                                ) : (
                                    <div className={`grid gap-6 ${isTextMode
                                        ? 'grid-cols-2 md:grid-cols-2 xl:grid-cols-3 justify-items-center md:justify-items-stretch'
                                        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 justify-items-center sm:justify-items-stretch'
                                        }`}>
                                        {finalFilteredCards.map((card, index) => {
                                            return isTextMode ? (
                                                <SelectableCard
                                                    key={card.id}
                                                    card={card}
                                                    onClick={() => {
                                                        console.log(`Card clicked: ${card.id}, field: ${field}`);
                                                        onSelect(card.id, field);
                                                    }}
                                                    isSelected={false}
                                                />
                                            ) : (
                                                <ImageCard
                                                    key={card.id}
                                                    card={card}
                                                    onClick={() => {
                                                        console.log(`Card clicked: ${card.id}, field: ${field}`);
                                                        onSelect(card.id, field);
                                                    }}
                                                    isSelected={false}
                                                    priority={index < 6}
                                                    refreshTrigger={refreshTrigger}
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
