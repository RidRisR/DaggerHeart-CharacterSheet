"use client"

import React, { useMemo } from "react"
import { isEmptyCard, StandardCard } from "@/card/card-types"
import { PrintImageCard } from "@/components/ui/print-image-card"
import { CardContent } from "@/components/ui/card-content"
import { useTextModeStore } from "@/lib/text-mode-store"
import { useSheetStore } from "@/lib/sheet-store"

/**
 * 卡组打印区域组件
 *
 * 纯渲染组件，不负责状态追踪。
 */
interface CardDeckPrintSectionProps {
    cards: StandardCard[]
    title: string
}

const CardDeckPrintSection: React.FC<CardDeckPrintSectionProps> = ({ cards, title }) => {
    const { isTextMode } = useTextModeStore()

    // 按行分组，每行 3 张
    const cardRows = useMemo(() => {
        const rows: StandardCard[][] = []
        for (let i = 0; i < cards.length; i += 3) {
            rows.push(cards.slice(i, i + 3))
        }
        return rows
    }, [cards])

    if (cards.length === 0) {
        return null
    }

    return (
        <div className="print-deck-section">
            {/* 卡组标题 */}
            <div className="print-deck-header flex items-center justify-center">
                <div className="flex-1 h-px bg-gray-400"></div>
                <h2 className="px-3 text-sm font-medium text-gray-700">{title}</h2>
                <div className="flex-1 h-px bg-gray-400"></div>
            </div>

            {/* 卡牌网格 */}
            <div className="print-card-grid">
                {cardRows.map((row, rowIndex) => (
                    <div
                        key={`row-${rowIndex}`}
                        className={`grid grid-cols-3 gap-2 mt-2 print:gap-1 ${isTextMode ? 'card-row-text' : 'card-row'}`}
                    >
                        {row.map((card, cardIndex) => (
                            <div
                                key={`${rowIndex}-${cardIndex}`}
                                className={isTextMode ? "card-item-text" : "card-item"}
                            >
                                {isTextMode ? (
                                    <div className="border rounded p-2 bg-white text-xs h-full flex flex-col">
                                        <CardContent card={card} />
                                    </div>
                                ) : (
                                    <PrintImageCard card={card} />
                                )}
                            </div>
                        ))}

                        {/* 填充空白格子 */}
                        {Array.from({ length: 3 - row.length }).map((_, emptyIndex) => (
                            <div key={`empty-${rowIndex}-${emptyIndex}`} className="card-placeholder"></div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}

/**
 * 通用卡牌打印页面组件
 *
 * 纯渲染组件，过滤空卡牌后渲染。
 */
interface CardPrintPageProps {
    title: string
    cards: StandardCard[]
    className?: string
}

export const CharacterSheetCardPrintPage: React.FC<CardPrintPageProps> = ({
    title,
    cards,
    className = ""
}) => {
    // 过滤空卡牌
    const validCards = useMemo(() => {
        return cards.filter((card: StandardCard) => !isEmptyCard(card))
    }, [cards])

    if (validCards.length === 0) {
        return null
    }

    return (
        <div className="w-full max-w-[210mm] mx-auto">
            <div
                className={`a4-page bg-white text-gray-800 shadow-lg print:shadow-none rounded-md p-4 print:p-0 ${className}`}
                style={{ width: "210mm" }}
            >
                <CardDeckPrintSection cards={validCards} title={title} />
            </div>
        </div>
    )
}

/**
 * 聚焦卡组打印页面
 */
export const CharacterSheetPageFour: React.FC = () => {
    const { sheetData: formData } = useSheetStore()

    const focusedCards = useMemo(() => {
        const allCards = formData?.cards || []
        return allCards.slice(1) // 跳过序号 0 的卡牌
    }, [formData?.cards])

    return (
        <CharacterSheetCardPrintPage
            title="聚焦卡组"
            cards={focusedCards}
            className="character-sheet-page-four"
        />
    )
}

/**
 * 库存卡组打印页面
 */
export const CharacterSheetPageFive: React.FC = () => {
    const { sheetData: formData } = useSheetStore()

    const inventoryCards = useMemo(() => {
        return formData?.inventory_cards || []
    }, [formData?.inventory_cards])

    return (
        <CharacterSheetCardPrintPage
            title="库存卡组"
            cards={inventoryCards}
            className="character-sheet-page-five"
        />
    )
}

export default CharacterSheetCardPrintPage
