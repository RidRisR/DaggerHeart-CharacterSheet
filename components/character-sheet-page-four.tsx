"use client"
import React from "react"
import { isEmptyCard, StandardCard } from "@/data/card/card-types"
import { ALL_CARD_TYPES } from "@/data/card/card-ui-config"
import ReactMarkdown from "react-markdown"
import type { FormData } from "@/lib/form-data"

interface CharacterSheetPageFourProps {
    formData: FormData
}

// 打印专用页面，展示所有已加入卡组的卡牌信息
const CharacterSheetPageFour: React.FC<CharacterSheetPageFourProps> = ({ formData }) => {
    // 只展示有效卡牌
    const cards: StandardCard[] = (formData?.cards || []).filter((card: StandardCard) => !isEmptyCard(card))

    const getTypeName = (type: string) => {
        const found = ALL_CARD_TYPES.find(t => t.id === type)
        return found ? found.name : type
    }

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
                            <span className="text-xs text-gray-500 px-2 py-0.5 rounded bg-gray-100">{getTypeName(card.type)}</span>
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
                                    {card.description.replace(/\n{2,}/g, '\n\n').replace(/(\n\n)(?=\s*[-*+] )/g, '\n')}
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
