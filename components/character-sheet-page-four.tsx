"use client"
import React, { useMemo, useState, useEffect, useCallback } from "react"
import { isEmptyCard, StandardCard } from "@/card/card-types"
import { useSheetStore } from '@/lib/sheet-store';
import { PrintImageCard } from "@/components/ui/print-image-card"
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
    const [loadedImages, setLoadedImages] = useState(new Set<string>())
    
    useEffect(() => {
        if (loadedImages.size === cards.length && cards.length > 0) {
            onAllImagesLoaded?.()
        }
    }, [loadedImages.size, cards.length, onAllImagesLoaded])

    // 重置加载状态当卡片数量改变时
    useEffect(() => {
        setLoadedImages(new Set<string>())
    }, [cards.length])

    const handleImageLoad = (cardId: string) => {
        setLoadedImages(prev => new Set(prev).add(cardId))
    }
    // 按3张一行分组，让浏览器自动分页
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

            {/* 卡牌网格 - 3列布局，让浏览器自动分页 */}
            <div className="print-card-grid">
                {cardRows.map((row, rowIndex) => (
                    <div
                        key={`row-${rowIndex}`}
                        className="card-row grid grid-cols-3 gap-1 mb-1"
                    >
                        {row.map((card, cardIndex) => (
                            <div
                                key={card.id || `${rowIndex}-${cardIndex}`}
                                className="card-item"
                            >
                                <PrintImageCard 
                                    card={card} 
                                    onImageLoad={() => handleImageLoad(card.id || `${rowIndex}-${cardIndex}`)}
                                />
                            </div>
                        ))}

                        {/* 填充空白格子（如果一行不足3张） */}
                        {Array.from({ length: 3 - row.length }).map((_, emptyIndex) => (
                            <div key={`empty-${emptyIndex}`} className="card-placeholder"></div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

// 打印专用页面，专门展示聚焦卡组
const CharacterSheetPageFour: React.FC = () => {
    const { sheetData: formData } = useSheetStore();
    const { registerPageImages, onPageImagesLoaded } = usePrintContext();

    // 获取聚焦卡组的有效卡牌，并跳过序号为0的那张
    const focusedCards = useMemo(() => {
        const allFocusedCards = (formData?.cards || []).filter((card: StandardCard) => !isEmptyCard(card));
        return allFocusedCards.filter((_, index) => index !== 0); // 跳过序号为0的卡牌
    }, [formData?.cards]);

    // 创建稳定的回调函数
    const handleAllImagesLoaded = useCallback(() => {
        onPageImagesLoaded('page-four')
    }, [onPageImagesLoaded])

    // 注册页面图片数量
    useEffect(() => {
        registerPageImages('page-four', focusedCards.length)
    }, [focusedCards.length, registerPageImages])

    // 如果聚焦卡组是空的（或者只有序号为0的卡被跳过了），不渲染第四页
    if (focusedCards.length === 0) {
        return null;
    }

    return (
        <div className="w-full max-w-[210mm] mx-auto">
            <div className="character-sheet-page-four a4-page bg-white text-gray-800 shadow-lg print:shadow-none rounded-md" style={{ width: "210mm" }}>
                <CardDeckPrintSection
                    cards={focusedCards}
                    title="聚焦卡组"
                    onAllImagesLoaded={handleAllImagesLoaded}
                />
            </div>
        </div>
    )
}

export default CharacterSheetPageFour
