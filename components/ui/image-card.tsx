"use client"

import { CardType, StandardCard, ExtendedStandardCard } from "@/card/card-types"
import { CardSource } from "@/card/card-types"
import { getAllStandardCardsAsync, getBatchName } from "@/card"
import { getCardTypeName } from "@/card/card-ui-config"
import { isVariantCard, getVariantRealType } from "@/card/card-types"
import React, { useState, useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import Image from "next/image"
import { getBasePath } from "@/lib/utils"

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
const getCardSourceDisplayName = async (card: StandardCard | ExtendedStandardCard): Promise<string> => {
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

                // 如果 getBatchName 获取失败，与 allCards 对比查找同 ID 卡牌
                try {
                    const allCards = await getAllStandardCardsAsync();
                    const matchedCard = allCards.find(c => c.id === card.id);
                    if (matchedCard && matchedCard.batchName) {
                        return matchedCard.batchName;
                    }
                    if (matchedCard && matchedCard.batchId) {
                        return matchedCard.batchId;
                    }
                } catch (error) {
                    console.warn("[ImageCard] 通过 allCards 查找卡牌失败:", error);
                }

                return "卡包ID不存在";
            }
            return "自定义卡包";
        }
        return "内置卡包";
    }

    // 通过ID在全局卡牌库中查找匹配的卡牌
    try {
        const allCards = await getAllStandardCardsAsync();
        const matchedCard = allCards.find(c => c.id === card.id);

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
    } catch (error) {
        console.warn("[ImageCard] 获取卡牌来源信息失败:", error);
        return "未知来源";
    }
};

// 辅助函数：检查卡牌是否有来源信息
const hasSourceInfo = (card: any): card is ExtendedStandardCard => {
    return 'source' in card && card.source !== undefined;
};

interface ImageCardProps {
    card: ExtendedStandardCard | StandardCard
    onClick: (cardId: string) => void;
    isSelected: boolean;
    showSource?: boolean; // 是否显示来源，默认为 true
    priority?: boolean; // 是否优先加载图片
}

export function ImageCard({ card, onClick, isSelected, showSource = true, priority = false }: ImageCardProps) {
    const [isHovered, setIsHovered] = useState(false)
    const [isAltPressed, setIsAltPressed] = useState(false)
    const [cardSource, setCardSource] = useState<string>("加载中...")
    const [imageLoaded, setImageLoaded] = useState(false)
    const [imageError, setImageError] = useState(false)
    const cardRef = useRef<HTMLDivElement | null>(null)

    // 当卡牌更换时，重置图片加载状态
    useEffect(() => {
        setImageLoaded(false);
        setImageError(false);
    }, [card.imageUrl]);

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

    // 异步获取卡牌来源信息
    useEffect(() => {
        if (!showSource) return;

        const fetchCardSource = async () => {
            const source = await getCardSourceDisplayName(card);
            setCardSource(source);
        };

        fetchCardSource();
    }, [card.id, showSource]);

    if (!card) {
        console.warn("[ImageCard] Card prop is null or undefined.")
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
            className={`group relative flex w-full max-w-sm flex-col overflow-hidden rounded-xl bg-white shadow-md transition-all duration-300 ease-in-out hover:shadow-xl ${isSelected ? 'ring-2 ring-blue-500' : 'border'}`}
            onClick={() => onClick(cardId)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
                setIsHovered(false)
                setIsAltPressed(false)
            }}
        >
            {/* Image Container */}
            <div className="relative w-full aspect-[3/2] overflow-hidden">
                <Image
                    src={imageError ? `${getBasePath()}/empty-card.webp` : (card.imageUrl ? `${getBasePath()}${card.imageUrl}` : `${getBasePath()}/empty-card.webp`)}
                    alt={displayName}
                    width={300}
                    height={420}
                    className="w-full h-auto object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                    priority={priority}
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setImageError(true)}
                />
                {/* 轻度遮罩 + 文字阴影 */}
                <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 flex items-end p-4 pointer-events-none">
                    <div>
                        <h3 className="text-lg font-bold text-white" style={{ textShadow: '0 2px 10px rgba(0,0,0,1)' }}>{displayName}</h3>
                        <span className="text-xs font-medium text-gray-200" style={{ textShadow: '0 1px 5px rgba(0,0,0,1)' }}>{getDisplayTypeName(card)}</span>
                    </div>
                </div>
            </div>

            {/* Content Container */}
            <div className="flex flex-1 flex-col p-4 h-[210px]">
                {/* Display Items */}
                {(displayItem1 || displayItem2 || displayItem3 || displayItem4) && (
                    <div className="mb-3 flex flex-row flex-wrap items-center gap-2 border-b border-dashed border-gray-200 pb-3 text-xs">
                        {displayItem1 && <div className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800">{displayItem1}</div>}
                        {displayItem2 && <div className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800">{displayItem2}</div>}
                        {displayItem3 && <div className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">{displayItem3}</div>}
                        {displayItem4 && <div className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-rose-800">{displayItem4}</div>}
                    </div>
                )}

                {/* Description */}
                <div className="flex-1 text-sm text-gray-600 overflow-hidden">
                    <div>
                        <ReactMarkdown
                            skipHtml
                            components={{
                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                ul: ({ children }) => <ul className="mb-2 list-inside list-disc">{children}</ul>,
                                ol: ({ children }) => <ol className="mb-2 list-inside list-decimal">{children}</ol>,
                                li: ({ children }) => <li className="mb-1">{children}</li>,
                            }}
                            remarkPlugins={[remarkGfm, remarkBreaks]}
                        >
                            {displayDescription}
                        </ReactMarkdown>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-auto pt-4">
                    {(card.type !== CardType.Profession && card.hint) || showSource ? (
                        <div className="border-t border-gray-100 pt-3 text-right text-[10px] text-gray-400">
                            {card.type !== CardType.Profession && card.hint && <div className="float-left mb-1 italic">{card.hint}</div>}
                            {showSource && <div>{cardSource}</div>}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    )
}
