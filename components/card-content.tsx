"use client"
import React from "react"
import { StandardCard, CardType } from "@/card/card-types"
import { getCardTypeName } from "@/card/card-ui-config"
import ReactMarkdown from "react-markdown"

// Card content rendering component
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

export default CardContent
