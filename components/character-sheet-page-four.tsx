"use client"
import React, { useMemo } from "react"
import { CardType, isEmptyCard, StandardCard } from "@/card/card-types"
import { getCardTypeName } from "@/card/card-ui-config"
import ReactMarkdown from "react-markdown"
import type { SheetData } from "@/lib/sheet-data"

interface CharacterSheetPageFourProps {
    formData: SheetData
}

interface PageRow {
    cards: StandardCard[];
}

interface Page {
    rows: PageRow[];
    cardCount: number;
}

// 安全分页：每页最多3行，避免截断问题
const organizeCardsIntoPages = (cards: StandardCard[]): Page[] => {
    const pages: Page[] = [];
    const maxRowsPerPage = 3; // 每页最多3行，确保安全
    const cardsPerRow = 3;
    const cardsPerPage = maxRowsPerPage * cardsPerRow; // 最多9张卡牌

    for (let i = 0; i < cards.length; i += cardsPerPage) {
        const pageCards = cards.slice(i, i + cardsPerPage);
        const rows: PageRow[] = [];

        // 按3张一行分组，但最多3行
        for (let j = 0; j < pageCards.length; j += cardsPerRow) {
            const rowCards = pageCards.slice(j, j + cardsPerRow);
            rows.push({
                cards: rowCards
            });
        }

        pages.push({
            rows,
            cardCount: pageCards.length
        });
    }

    return pages;
};

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
    const pages = useMemo(() => organizeCardsIntoPages(cards), [cards]);

    if (cards.length === 0) {
        return (
            <div className="a4-page print-page px-8 py-10 print:px-8 print:py-10">
                <div className="text-center text-gray-500 py-20">
                    {title} - 暂无卡牌
                </div>
            </div>
        );
    }

    return (
        <>
            {pages.map((page, pageIndex) => (
                <div key={`${deckType}-page-${pageIndex}`} className="a4-page print-page px-8 py-10 print:px-8 print:py-10">
                    {/* 页面标题 */}
                    <div className="print-page-header mb-6">
                        <h2 className="text-xl font-bold text-center">
                            {title} {pages.length > 1 ? `(第${pageIndex + 1}页，共${pages.length}页)` : ''}
                        </h2>
                        <div className="text-sm text-gray-600 text-center mt-1">
                            本页显示 {page.cardCount} 张卡牌
                        </div>
                    </div>

                    {/* 卡牌行 */}
                    <div className="print-page-content">
                        {page.rows.map((row, rowIndex) => (
                            <div
                                key={`row-${rowIndex}`}
                                className="card-row grid grid-cols-3 gap-4 mb-4"
                            >
                                {row.cards.map((card, cardIndex) => (
                                    <div
                                        key={card.id || `${rowIndex}-${cardIndex}`}
                                        className="card-item border rounded p-3 bg-white flex flex-col gap-1 shadow-sm"
                                    >
                                        <CardContent card={card} />
                                    </div>
                                ))}

                                {/* 填充空白格子（如果一行不足3张） */}
                                {Array.from({ length: 3 - row.cards.length }).map((_, emptyIndex) => (
                                    <div key={`empty-${emptyIndex}`} className="card-placeholder"></div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </>
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

    return (
        <>
            {/* 聚焦卡组打印页面 */}
            <CardDeckPrintSection
                cards={focusedCards}
                title="聚焦卡组"
                deckType="focused"
            />

            {/* 库存卡组打印页面 */}
            <CardDeckPrintSection
                cards={inventoryCards}
                title="库存卡组"
                deckType="inventory"
            />
        </>
    )
}

export default CharacterSheetPageFour
