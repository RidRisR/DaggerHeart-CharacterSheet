"use client"
import React, { useMemo } from "react"
import { CardType, isEmptyCard, StandardCard } from "@/card/card-types"
import { getCardTypeName } from "@/card/card-ui-config"
import ReactMarkdown from "react-markdown"
import type { SheetData } from "@/lib/sheet-data"

interface CharacterSheetPageFourProps {
    formData: SheetData
}

// 卡牌内容渲染组件
const CardContent: React.FC<{ card: StandardCard }> = ({ card }) => {
    return (
        <>
            <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-base truncate max-w-[60%]">{card.name}</span>
                <span className="text-xs text-gray-500 px-2 py-0.5 rounded bg-gray-100">
                    {getCardTypeName(card.type as CardType)}
                </span>
            </div>
            {card.cardSelectDisplay && (card.cardSelectDisplay.item1 || card.cardSelectDisplay.item2 || card.cardSelectDisplay.item3) && (
                <div className="flex flex-row gap-2 text-xs text-blue-700 font-mono mb-1">
                    {card.cardSelectDisplay.item1 && <span>{card.cardSelectDisplay.item1}</span>}
                    {card.cardSelectDisplay.item2 && <span>{card.cardSelectDisplay.item2}</span>}
                    {card.cardSelectDisplay.item3 && <span>{card.cardSelectDisplay.item3}</span>}
                    {card.cardSelectDisplay.item4 && <span>{card.cardSelectDisplay.item4}</span>}
                </div>
            )}
            {card.description && (
                <div className="card-description text-xs text-gray-800 leading-snug flex-1">
                    <ReactMarkdown
                        skipHtml
                        components={{
                            ul: ({ children }) => <ul className="list-disc pl-4 mb-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-4 mb-1">{children}</ol>,
                            li: ({ children }) => <li className="mb-0.5 last:mb-0">{children}</li>,
                        }}
                    >
                        {card.description}
                    </ReactMarkdown>
                </div>
            )}
        </>
    );
};

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

// 打印专用页面，分别展示聚焦卡组和库存卡组
const CharacterSheetPageFour: React.FC<CharacterSheetPageFourProps> = ({ formData }) => {
    // 获取聚焦卡组的有效卡牌
    const focusedCards = useMemo(() => {
        return (formData?.cards || []).filter((card: StandardCard) => !isEmptyCard(card));
    }, [formData?.cards]);

    // 获取库存卡组的有效卡牌
    const inventoryCards = useMemo(() => {
        return (formData?.inventory_cards || []).filter((card: StandardCard) => !isEmptyCard(card));
    }, [formData?.inventory_cards]);

    // 如果两个卡组都是空的，不渲染第四页
    if (focusedCards.length === 0 && inventoryCards.length === 0) {
        return null;
    }

    return (
        <div className="w-full max-w-[210mm] mx-auto my-4">
            <div className="character-sheet-page-four a4-page p-2 bg-white text-gray-800 shadow-lg print:shadow-none rounded-md" style={{ width: "210mm" }}>
            {/* 聚焦卡组 - 只有当有卡牌时才显示 */}
            {focusedCards.length > 0 && (
                <CardDeckPrintSection
                    cards={focusedCards}
                    title="聚焦卡组"
                    deckType="focused"
                />
            )}

            {/* 库存卡组 - 只有当有卡牌时才显示，如果聚焦卡组也有内容则强制分页 */}
            {inventoryCards.length > 0 && (
                <div className={focusedCards.length > 0 ? "print-page-break" : ""}>
                    <CardDeckPrintSection
                        cards={inventoryCards}
                        title="库存卡组"
                        deckType="inventory"
                    />
                </div>
            )}
            </div>
        </div>
    )
}

export default CharacterSheetPageFour
