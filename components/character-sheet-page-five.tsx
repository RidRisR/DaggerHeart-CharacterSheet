"use client"
import React, { useMemo, useState, useEffect, useCallback } from "react"
import { isEmptyCard, StandardCard } from "@/card/card-types"
import { useSheetStore } from '@/lib/sheet-store';
import { PrintImageCard } from "@/components/ui/print-image-card"
import { CardContent } from "@/components/ui/card-content"
import { useTextModeStore } from "@/lib/text-mode-store"
import { usePrintContext } from "@/contexts/print-context"

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
            {/* 卡组标题 */}
            <div className="print-deck-header mb-4">
                <h2 className="text-xl font-bold text-center">{title}</h2>
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

// 打印专用页面，专门展示库存卡组
const CharacterSheetPageFive: React.FC = () => {
    const { sheetData: formData } = useSheetStore();
    const { registerPageImages, onPageImagesLoaded } = usePrintContext();
    const { isTextMode } = useTextModeStore();

    // 获取库存卡组的有效卡牌
    const inventoryCards = useMemo(() => {
        return (formData?.inventory_cards || []).filter((card: StandardCard) => !isEmptyCard(card));
    }, [formData?.inventory_cards]);

    // 创建稳定的回调函数
    const handleAllImagesLoaded = useCallback(() => {
        onPageImagesLoaded('page-five')
    }, [onPageImagesLoaded])

    // 注册页面图片数量
    useEffect(() => {
        // 文字模式下注册0张图片，图片模式下注册实际数量
        const imageCount = isTextMode ? 0 : inventoryCards.length
        registerPageImages('page-five', imageCount)
    }, [inventoryCards.length, registerPageImages, isTextMode])

    // 如果库存卡组是空的，不渲染第五页
    if (inventoryCards.length === 0) {
        return null;
    }

    return (
        <div className="w-full max-w-[210mm] mx-auto">
            <div className="character-sheet-page-five a4-page bg-white text-gray-800 shadow-lg print:shadow-none rounded-md" style={{ width: "210mm" }}>
                <CardDeckPrintSection
                    cards={inventoryCards}
                    title="库存卡组"
                    onAllImagesLoaded={handleAllImagesLoaded}
                />
            </div>
        </div>
    )
}

export default CharacterSheetPageFive
