"use client"
import React, { useMemo } from "react"
import { CardType, isEmptyCard, StandardCard } from "@/card/card-types"
import { useSheetStore } from '@/lib/sheet-store';
import { CardContent } from "@/components/ui/card-content"

// 卡组打印区域组件
interface CardDeckPrintSectionProps {
    cards: StandardCard[];
    title: string;
    deckType: 'focused' | 'inventory';
}

const CardDeckPrintSection: React.FC<CardDeckPrintSectionProps> = ({
    cards,
    title,
    deckType
}) => {
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
            <div className="print-deck-header mb-6">
                <h2 className="text-xl font-bold text-center">{title}</h2>
                <div className="text-sm text-gray-600 text-center mt-1">
                    共 {cards.length} 张卡牌
                </div>
            </div>

            {/* 卡牌网格 - 3列布局，让浏览器自动分页 */}
            <div className="print-card-grid">
                {cardRows.map((row, rowIndex) => (
                    <div
                        key={`row-${rowIndex}`}
                        className="card-row grid grid-cols-3 gap-4 mb-4"
                    >
                        {row.map((card, cardIndex) => (
                            <div
                                key={card.id || `${rowIndex}-${cardIndex}`}
                                className="card-item border rounded p-3 bg-white flex flex-col gap-1"
                            >
                                <CardContent card={card} />
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

// 打印专用页面，专门展示库存卡组
const CharacterSheetPageFive: React.FC = () => {
    const { sheetData: formData } = useSheetStore();

    // 获取库存卡组的有效卡牌
    const inventoryCards = useMemo(() => {
        return (formData?.inventory_cards || []).filter((card: StandardCard) => !isEmptyCard(card));
    }, [formData?.inventory_cards]);

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
                    deckType="inventory"
                />
            </div>
        </div>
    )
}

export default CharacterSheetPageFive
