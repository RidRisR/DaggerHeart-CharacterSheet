"use client"
import React from "react"
import { CardType, isEmptyCard, StandardCard } from "@/data/card/card-types"
import { getCardTypeName } from "@/data/card/card-ui-config"
import ReactMarkdown from "react-markdown"
import type { SheetData } from "@/lib/sheet-data"

interface CharacterSheetPageFourProps {
    formData: SheetData
}

// 打印专用页面，展示所有已加入卡组的卡牌信息
const CharacterSheetPageFour: React.FC<CharacterSheetPageFourProps> = ({ formData }) => {
    // 只展示有效且唯一的卡牌（按 id 去重）
    const uniqueCardsMap = new Map<string, StandardCard>();
    (formData?.cards || []).forEach((card: StandardCard) => {
        if (!isEmptyCard(card) && card.id && !uniqueCardsMap.has(card.id)) {
            uniqueCardsMap.set(card.id, card);
        }
    });
    const cards: StandardCard[] = Array.from(uniqueCardsMap.values());

    if (!cards.length) {
        return <div className="a4-page text-center text-gray-500">没有已加入的卡牌</div>
    }

    return (
        <div className="a4-page page-four print:block hidden px-8 py-10 print:px-8 print:py-10">
            <h2 className="text-xl font-bold mb-4 text-center">卡组总览</h2>
            <div className="grid grid-cols-3 gap-4">
                {cards.map((card, idx) => (
                    <div key={card.id || idx} className="border rounded p-3 bg-white flex flex-col gap-1 break-inside-avoid shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-base truncate max-w-[60%]">{card.name}</span>
                            <span className="text-xs text-gray-500 px-2 py-0.5 rounded bg-gray-100">{getCardTypeName(card.type as CardType)}</span>
                        </div>
                        {card.cardSelectDisplay && (card.cardSelectDisplay.item1 || card.cardSelectDisplay.item2 || card.cardSelectDisplay.item3) && (
                            <div className="flex flex-row gap-2 text-xs text-blue-700 font-mono mb-1">
                                {card.cardSelectDisplay.item1 && <span>{card.cardSelectDisplay.item1}</span>}
                                {card.cardSelectDisplay.item2 && <span>{card.cardSelectDisplay.item2}</span>}
                                {card.cardSelectDisplay.item3 && <span>{card.cardSelectDisplay.item3}</span>}
                                {card.cardSelectDisplay.item3 && <span>{card.cardSelectDisplay.item4}</span>}
                            </div>
                        )}
                        {card.description && (
                            <div className="text-xs text-gray-800 leading-snug mb-1">
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
                    </div>
                ))}
            </div>
        </div>
    )
}

export default CharacterSheetPageFour
