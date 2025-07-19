"use client"

import { CardType, StandardCard, ExtendedStandardCard } from "@/card/card-types"
import { CardSource } from "@/card/card-types"
import { getBatchName } from "@/card"
import { getCardTypeName } from "@/card/card-ui-config"
import { isVariantCard, getVariantRealType } from "@/card/card-types"
import { useCardStore } from "@/card/hooks"
import React, { useState, useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"

// Helper function to get display type name, moved outside of the component
const getDisplayTypeName = (card: StandardCard) => {
    if (isVariantCard(card)) {
        const realType = getVariantRealType(card);
        if (realType) {
            return getCardTypeName(realType);
        }
    }
    return getCardTypeName(card.type);
};

// Helper function to get card source display name
const getCardSourceDisplayName = (card: StandardCard | ExtendedStandardCard): string => {
    // 如果已经有来源信息，直接使用
    if (hasSourceInfo(card)) {
        if (card.source === CardSource.BUILTIN) {
            return "内置卡包";
        }
        if (card.source === CardSource.CUSTOM) {
            // 如果已经有 batchName，直接使用
            if (card.batchName) {
                return card.batchName;
            }
            // 如果没有 batchName 但有 batchId，通过 getBatchName 获取名称
            if (card.batchId) {
                const batchName = getBatchName(card.batchId);
                if (batchName) {
                    return batchName;
                }

                // 如果 getBatchName 获取失败，从 store 中查找同 ID 卡牌
                const store = useCardStore.getState();
                const matchedCard = store.getCardById(card.id);
                if (matchedCard && matchedCard.batchName) {
                    return matchedCard.batchName;
                }
                if (matchedCard && matchedCard.batchId) {
                    return matchedCard.batchId;
                }

                return "卡包ID不存在";
            }
            return "自定义卡包";
        }
        return "内置卡包";
    }

    // 通过ID在 store 中查找匹配的卡牌
    const store = useCardStore.getState();
    const matchedCard = store.getCardById(card.id);

    if (matchedCard && matchedCard.source) {
        if (matchedCard.source === CardSource.BUILTIN) {
            return "内置卡包";
        }
        if (matchedCard.source === CardSource.CUSTOM) {
            return matchedCard.batchName || matchedCard.batchId || "自定义卡包";
        }
    }

    // 如果找不到匹配的卡牌
    return "未知来源";
};

// 辅助函数：检查卡牌是否有来源信息
const hasSourceInfo = (card: any): card is ExtendedStandardCard => {
    return 'source' in card && card.source !== undefined;
};

interface SelectableCardProps {
    card: ExtendedStandardCard | StandardCard
    onClick: (cardId: string) => void; // Added onClick prop
    isSelected: boolean; // Added isSelected prop
    showSource?: boolean; // 新增：是否显示来源，默认为 true
}

export function SelectableCard({ card, onClick, isSelected, showSource = true }: SelectableCardProps) { // Added isSelected to props
    const [_isHovered, setIsHovered] = useState(false)
    const [_isAltPressed, setIsAltPressed] = useState(false)
    const [cardSource, setCardSource] = useState<string>("加载中...")
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

    // 获取卡牌来源信息
    useEffect(() => {
        if (!showSource) return;

        const source = getCardSourceDisplayName(card);
        setCardSource(source);
    }, [card.id, showSource]);

    if (!card) {
        console.warn("[SelectableCard] Card prop is null or undefined.")
        return null
    }
    const cardId = card.id || `temp-id-${Math.random().toString(36).substring(2, 9)}`

    // Prepare derived values for display, handling potential undefined fields and fallbacks
    const displayName = card.name || "未命名卡牌";
    const displayDescription = card.description || "无描述。";

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
                <span className="text-xs text-gray-500 px-1 sm:px-2 py-0.5 rounded bg-gray-100 shrink-0">{getDisplayTypeName(card)}</span>
            </div>
            {(displayItem1 || displayItem2 || displayItem3 || displayItem4) && (
                <div className="flex flex-row gap-1 sm:gap-2 text-xs font-mono mb-2 pb-2 border-b border-dashed border-gray-300 flex-wrap">
                    {displayItem1 && <div className="px-1 sm:px-2 py-0.5 rounded bg-gray-100 border border-gray-300 text-gray-800 font-semibold shadow-sm text-xs">{displayItem1}</div>}
                    {displayItem2 && <div className="px-1 sm:px-2 py-0.5 rounded bg-gray-100 border border-gray-300 text-gray-800 font-semibold shadow-sm text-xs">{displayItem2}</div>}
                    {displayItem3 && <div className="px-1 sm:px-2 py-0.5 rounded bg-gray-100 border border-gray-300 text-gray-800 font-semibold shadow-sm text-xs">{displayItem3}</div>}
                    {displayItem4 && <div className="px-1 sm:px-2 py-0.5 rounded bg-gray-100 border border-gray-300 text-gray-800 font-semibold shadow-sm text-xs">{displayItem4}</div>}
                </div>
            )}
            <div className="text-xs text-gray-600 leading-snug mb-1 flex-1 overflow-hidden">
                <ReactMarkdown skipHtml
                    components={{
                        p: ({ children }) => <p className="first:mt-0 mb-0 mt-3">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc pl-4 mb-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-4 mb-0">{children}</ol>,
                        li: ({ children }) => <li className="mb-0.5 last:mb-0">{children}</li>,
                    }}
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                >
                    {displayDescription}
                </ReactMarkdown>
            </div>
            {(card.type !== CardType.Profession && card.hint) || showSource ? (
                <div className="text-[10px] text-gray-400 mt-2">
                    {card.type !== CardType.Profession && card.hint && <div className="italic text-left">{card.hint}</div>}
                    {showSource && <div className="text-right">{cardSource}</div>}
                </div>
            ) : null}
        </div>
    )
}
