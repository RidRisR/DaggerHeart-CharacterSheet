"use client"
import React, { useMemo, useState, useEffect, useCallback } from "react"
import { isEmptyCard, StandardCard } from "@/card/card-types"
import { PrintImageCard } from "@/components/ui/print-image-card"
import { CardContent } from "@/components/ui/card-content"
import { useTextModeStore } from "@/lib/text-mode-store"
import { usePrintContext } from "@/contexts/print-context"
import { useSheetStore } from "@/lib/sheet-store"

// 卡组打印区域组件
interface CardDeckPrintSectionProps {
    cards: StandardCard[];
    title: string;
    onAllImagesLoaded?: () => void;
}

const CardDeckPrintSection: React.FC<CardDeckPrintSectionProps> = ({
    cards,
    title,
    onAllImagesLoaded
}) => {
    const { isTextMode } = useTextModeStore()
    const [loadedImages, setLoadedImages] = useState(new Set<string>())

    useEffect(() => {
        if (isTextMode) {
            // 文字模式下不需要等待图片加载，直接标记完成
            onAllImagesLoaded?.()
        } else if (loadedImages.size === cards.length && cards.length > 0) {
            onAllImagesLoaded?.()
        }
    }, [loadedImages.size, cards.length, onAllImagesLoaded, isTextMode])

    // 重置加载状态当卡片数量改变时
    useEffect(() => {
        setLoadedImages(new Set<string>())
    }, [cards.length])

    const handleImageLoad = (cardId: string) => {
        setLoadedImages(prev => new Set(prev).add(cardId))
    }
    // 按行分组，每行3张
    const cardRows = useMemo(() => {
        const rows: StandardCard[][] = [];
        for (let i = 0; i < cards.length; i += 3) {
            rows.push(cards.slice(i, i + 3));
        }
        return rows;
    }, [cards]);

    if (cards.length === 0) {
        return null; // 空卡组不渲染任何内容
    }

    return (
        <div className="print-deck-section">
            {/* 卡组标题 - 横向分隔线式 */}
            <div className="print-deck-header flex items-center justify-center">
                <div className="flex-1 h-px bg-gray-400"></div>
                <h2 className="px-3 text-sm font-medium text-gray-700">{title}</h2>
                <div className="flex-1 h-px bg-gray-400"></div>
            </div>

            {/* 卡牌网格 - 和以前一样的方法 */}
            <div className="print-card-grid">
                {cardRows.map((row, rowIndex) => (
                    <div
                        key={`row-${rowIndex}`}
                        className={`grid grid-cols-3 gap-1 mb-1 ${isTextMode ? 'card-row-text' : 'card-row'}`}
                    >
                        {row.map((card, cardIndex) => {
                            const uniqueKey = `${rowIndex}-${cardIndex}`;
                            return (
                                <div
                                    key={uniqueKey}
                                    className={isTextMode ? "card-item-text" : "card-item"}
                                >
                                    {isTextMode ? (
                                        <div className="border rounded p-2 bg-white text-xs h-full flex flex-col">
                                            <CardContent card={card} />
                                        </div>
                                    ) : (
                                        <PrintImageCard
                                            card={card}
                                            onImageLoad={() => handleImageLoad(uniqueKey)}
                                        />
                                    )}
                                </div>
                            );
                        })}

                        {/* 填充空白格子（如果一行不足3张） */}
                        {Array.from({ length: 3 - row.length }).map((_, emptyIndex) => (
                            <div key={`empty-${rowIndex}-${emptyIndex}`} className="card-placeholder"></div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

// 通用卡牌打印页面组件接口
interface CardPrintPageProps {
    pageId: string;
    title: string;
    cards: StandardCard[];
    className?: string;
}

// 通用卡牌打印页面组件
export const CharacterSheetCardPrintPage: React.FC<CardPrintPageProps> = ({
    pageId,
    title,
    cards,
    className = ""
}) => {
    const { registerPageImages, onPageImagesLoaded } = usePrintContext();
    const { isTextMode } = useTextModeStore();

    // 过滤空卡牌
    const validCards = useMemo(() => {
        return cards.filter((card: StandardCard) => !isEmptyCard(card));
    }, [cards]);

    // 创建稳定的回调函数
    const handleAllImagesLoaded = useCallback(() => {
        onPageImagesLoaded(pageId)
    }, [onPageImagesLoaded, pageId])

    // 注册页面图片数量
    useEffect(() => {
        // 文字模式下注册0张图片，图片模式下注册实际数量
        const imageCount = isTextMode ? 0 : validCards.length
        registerPageImages(pageId, imageCount)
    }, [validCards.length, registerPageImages, isTextMode, pageId])

    // 如果没有有效卡牌，不渲染页面
    if (validCards.length === 0) {
        return null;
    }

    return (
        <div className="w-full max-w-[210mm] mx-auto">
            <div className={`a4-page bg-white text-gray-800 shadow-lg print:shadow-none rounded-md ${className}`} style={{ width: "210mm" }}>
                <CardDeckPrintSection
                    cards={validCards}
                    title={title}
                    onAllImagesLoaded={handleAllImagesLoaded}
                />
            </div>
        </div>
    )
}

// 具体的页面组件
export const CharacterSheetPageFour: React.FC = () => {
    const { sheetData: formData } = useSheetStore();

    // 获取聚焦卡组的卡牌，并跳过序号为0的那张
    const focusedCards = useMemo(() => {
        const allCards = formData?.cards || [];
        return allCards.slice(1); // 去掉序号0的卡牌
    }, [formData?.cards]);

    return (
        <CharacterSheetCardPrintPage
            pageId="page-four"
            title="聚焦卡组"
            cards={focusedCards}
            className="character-sheet-page-four"
        />
    )
}

export const CharacterSheetPageFive: React.FC = () => {
    const { sheetData: formData } = useSheetStore();

    // 获取库存卡组的卡牌
    const inventoryCards = useMemo(() => {
        return formData?.inventory_cards || [];
    }, [formData?.inventory_cards]);

    return (
        <CharacterSheetCardPrintPage
            pageId="page-five"
            title="库存卡组"
            cards={inventoryCards}
            className="character-sheet-page-five"
        />
    )
}

export default CharacterSheetCardPrintPage