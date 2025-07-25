"use client"

import { CardType, StandardCard, ExtendedStandardCard } from "@/card/card-types"
import { CardSource } from "@/card/card-types"
import { getBatchName } from "@/card"
import { getCardTypeName } from "@/card/card-ui-config"
import { isVariantCard, getVariantRealType } from "@/card/card-types"
import { getStandardCardById } from "@/card"
import React, { useState, useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import Image from "next/image"
import { getCardImageUrl } from "@/lib/utils"

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

// Helper function to get card source display name (optimized)
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
                return card.batchId;
            }
            return "自定义卡包";
        }
        return "内置卡包";
    }

    // 使用优化的同步查找方法
    const matchedCard = getStandardCardById(card.id);
    if (matchedCard && hasSourceInfo(matchedCard)) {
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

interface ImageCardProps {
    card: ExtendedStandardCard | StandardCard
    onClick: (cardId: string) => void;
    isSelected: boolean;
    showSource?: boolean; // 是否显示来源，默认为 true
    priority?: boolean; // 是否优先加载图片
    refreshTrigger?: number; // 用于手动触发刷新动画
}

export function ImageCard({ card, onClick, isSelected, showSource = true, priority = false, refreshTrigger }: ImageCardProps) {
    const [_isHovered, setIsHovered] = useState(false)
    const [_isAltPressed, setIsAltPressed] = useState(false)
    const [cardSource, setCardSource] = useState<string>("加载中...")
    const [_imageLoaded, setImageLoaded] = useState(false)
    const [imageError, setImageError] = useState(false)
    const [imageSrc, setImageSrc] = useState<string | null>(null)
    const [cardScale, setCardScale] = useState('scale(1)')
    const cardRef = useRef<HTMLDivElement | null>(null)

    // 当卡牌更换时，重置图片加载状态并获取图片URL
    useEffect(() => {
        setImageLoaded(false);
        setImageError(false);
        
        // 轻微缩放动画
        setCardScale('scale(0.99)');
        
        // 获取图片URL
        const url = getCardImageUrl(card, false); // 重置时不传递错误状态
        setImageSrc(url);
        
        // 100ms后恢复正常大小
        const timer = setTimeout(() => {
            setCardScale('scale(1)');
        }, 100);
        
        return () => clearTimeout(timer);
    }, [card]); // 移除 imageError 依赖，避免无限循环

    // 当图片加载失败时，获取备用图片URL
    useEffect(() => {
        if (imageError && !imageSrc?.includes('empty-card.webp')) {
            const url = getCardImageUrl(card, true); // 传递错误状态以获取默认图片
            setImageSrc(url);
        }
    }, [imageError, card, imageSrc]);

    // 监听手动刷新触发器
    useEffect(() => {
        if (refreshTrigger) {
            // 触发缩放动画反馈
            setCardScale('scale(0.99)');
            
            const timer = setTimeout(() => {
                setCardScale('scale(1)');
            }, 100);
            
            return () => clearTimeout(timer);
        }
    }, [refreshTrigger]);

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
            className={`group relative flex w-full max-w-sm flex-col overflow-hidden rounded-xl bg-white shadow-md transition-all duration-300 ease-in-out hover:shadow-xl min-h-[520px] ${isSelected ? 'ring-2 ring-blue-500' : 'border'}`}
            style={{ 
                transform: cardScale,
                transition: 'transform 100ms ease-out'
            }}
            onClick={() => onClick(cardId)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
                setIsHovered(false)
                setIsAltPressed(false)
            }}
        >
            {/* Image Container */}
            <div className="relative w-full aspect-[1.4] overflow-hidden">
                {imageSrc && (
                    <Image
                        src={imageSrc}
                        alt={displayName}
                        width={300}
                        height={420}
                        className="w-full h-auto object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                        priority={priority}
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageError(true)}
                    />
                )}

                {/* Level badge for Domain cards with frosted glass effect */}
                {/* {card.type !== (CardType.Ancestry) && card.level && (
                    <div className="absolute top-2 right-2 bg-black/25 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-lg border border-white/20 pointer-events-none">
                        <span style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                            LV.  {card.level}
                        </span>
                    </div>
                )} */}


                {/* 轻度遮罩 + 文字阴影 */}
                <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 flex items-end p-4 pointer-events-none">
                    <div>
                        <h3 className="text-lg font-bold text-white" style={{ textShadow: '0 2px 10px rgba(0,0,0,1)' }}>{displayName}</h3>
                        <span className="text-xs font-medium text-gray-200" style={{ textShadow: '0 1px 5px rgba(0,0,0,1)' }}>{getDisplayTypeName(card)}</span>
                    </div>
                </div>
            </div>

            {/* Content Container */}
            <div className="flex flex-1 flex-col p-4">
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
                        <div className="border-t border-gray-100 pt-3 text-[10px] text-gray-500">
                            {card.type !== CardType.Profession && card.hint && (
                                <div className="text-left mb-1 italic">{card.hint}</div>
                            )}
                            {showSource && (
                                <div className="text-right">{cardSource}</div>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    )
}
