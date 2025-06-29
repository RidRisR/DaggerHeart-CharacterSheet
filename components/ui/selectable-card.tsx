"use client"

import type { CardType, StandardCard } from "@/card/card-types"
import { getCardTypeName } from "@/card/card-ui-config"
import { isVariantCard, getVariantRealType } from "@/card/card-types"
import React, { useState, useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"

interface SelectableCardProps {
    card: StandardCard
    onClick: (cardId: string) => void; // Added onClick prop
    isSelected: boolean; // Added isSelected prop
}

export function SelectableCard({ card, onClick, isSelected }: SelectableCardProps) { // Added isSelected to props
    const [isHovered, setIsHovered] = useState(false)
    const [isAltPressed, setIsAltPressed] = useState(false)
    const cardRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Alt") {
                setIsAltPressed(true)
            }
        }

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === "Alt") {
                setIsAltPressed(false)
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        window.addEventListener("keyup", handleKeyUp)

        return () => {
            window.removeEventListener("keydown", handleKeyDown)
            window.removeEventListener("keyup", handleKeyUp)
        }
    }, [])

    if (!card) {
        console.warn("[SelectableCard] Card prop is null or undefined.")
        return null
    }
    const cardId = card.id || `temp-id-${Math.random().toString(36).substring(2, 9)}`

    // Prepare derived values for display, handling potential undefined fields and fallbacks
    const displayName = card.name || "未命名卡牌";
    const displayDescription = card.description || "无描述。";

    // Enhanced card type name display for variants
    const displayTypeName = (() => {
        if (isVariantCard(card)) {
            const realType = getVariantRealType(card);
            if (realType) {
                return getCardTypeName(realType);
            }
        }
        return getCardTypeName(card.type);
    })();

    // Get display items, providing empty strings as fallbacks
    const displayItem1 = card.cardSelectDisplay?.item1 || "";
    const displayItem2 = card.cardSelectDisplay?.item2 || "";
    const displayItem3 = card.cardSelectDisplay?.item3 || "";
    const displayItem4 = card.cardSelectDisplay?.item4 || "";

    return (
        <div
            ref={cardRef}
            key={cardId}
            className={`border rounded p-2 sm:p-3 bg-white flex flex-col gap-1 break-inside-avoid shadow-sm relative cursor-pointer w-full max-w-60 h-full min-h-[180px] sm:min-h-[200px] ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => onClick(cardId)}
            onMouseEnter={() => setIsHovered(false)}
            onMouseLeave={() => {
                setIsHovered(false)
                setIsAltPressed(false)
            }}
        >
            <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm sm:text-base truncate max-w-[60%] text-gray-800" title={displayName}>{displayName}</span>
                <span className="text-xs text-gray-500 px-1 sm:px-2 py-0.5 rounded bg-gray-100 shrink-0">{displayTypeName}</span>
            </div>
            {(displayItem1 || displayItem2 || displayItem3 || displayItem4) && (
                <div className="flex flex-row gap-1 sm:gap-2 text-xs font-mono mb-2 pb-2 border-b border-dashed border-gray-300 flex-wrap">
                    {displayItem1 && <div className="px-1 sm:px-2 py-0.5 rounded bg-gray-100 border border-gray-300 text-gray-800 font-semibold shadow-sm text-xs">{displayItem1}</div>}
                    {displayItem2 && <div className="px-1 sm:px-2 py-0.5 rounded bg-gray-100 border border-gray-300 text-gray-800 font-semibold shadow-sm text-xs">{displayItem2}</div>}
                    {displayItem3 && <div className="px-1 sm:px-2 py-0.5 rounded bg-gray-100 border border-gray-300 text-gray-800 font-semibold shadow-sm text-xs">{displayItem3}</div>}
                    {displayItem4 && <div className="px-1 sm:px-2 py-0.5 rounded bg-gray-100 border border-gray-300 text-gray-800 font-semibold shadow-sm text-xs">{displayItem4}</div>}
                </div>
            )}
            <div className="text-xs text-gray-600 leading-snug mb-1 flex-1 overflow-hidden">{/*注意添加了flex-1和overflow-hidden*/}
                <ReactMarkdown skipHtml
                    components={{
                        ul: ({ children }) => <ul className="list-disc pl-4 mb-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-4 mb-1">{children}</ol>,
                        li: ({ children }) => <li className="mb-0.5 last:mb-0">{children}</li>,
                    }}
                >
                    {displayDescription}
                </ReactMarkdown>
            </div>
        </div>
    )
}
