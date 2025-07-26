"use client"

import { StandardCard, ExtendedStandardCard, isVariantCard, getVariantRealType, CardType } from "@/card/card-types"
import { getCardTypeName } from "@/card/card-ui-config"
import React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import Image from "next/image"
import { getCardImageUrl } from "@/lib/utils"

// Helper function to get display type name
const getDisplayTypeName = (card: StandardCard) => {
    if (isVariantCard(card)) {
        const realType = getVariantRealType(card);
        if (realType) {
            return getCardTypeName(realType);
        }
    }
    return getCardTypeName(card.type);
};

interface PrintCardProps {
    card: ExtendedStandardCard | StandardCard
    showImage?: boolean
    onImageLoad?: () => void
    className?: string
}

export function PrintCard({ card, showImage = true, onImageLoad, className = "" }: PrintCardProps) {
    const [imageSrc, setImageSrc] = React.useState<string | null>(null)
    const [imageError, setImageError] = React.useState(false)
    
    // 获取图片URL - 只在显示图片时执行
    React.useEffect(() => {
        if (showImage) {
            setImageError(false);
            const url = getCardImageUrl(card, false);
            setImageSrc(url);
        }
    }, [card, showImage]);

    // 当图片加载失败时，获取备用图片URL
    React.useEffect(() => {
        if (showImage && imageError && !imageSrc?.includes('empty-card.webp')) {
            const url = getCardImageUrl(card, true);
            setImageSrc(url);
        }
    }, [imageError, card, imageSrc, showImage]);
    
    if (!card) {
        return null
    }

    const displayName = card.name || "未命名卡牌";
    const displayDescription = card.description || "无描述。";
    const displayItem1 = card.cardSelectDisplay?.item1 || "";
    const displayItem2 = card.cardSelectDisplay?.item2 || "";
    const displayItem3 = card.cardSelectDisplay?.item3 || "";
    const displayItem4 = card.cardSelectDisplay?.item4 || "";

    const handleImageLoad = () => {
        onImageLoad?.()
    }

    // 根据是否显示图片选择不同的容器类名
    const wrapperClasses = showImage ? "card-item" : "card-item-text"
    
    if (showImage) {
        // 图片模式 - 使用原 PrintImageCard 的布局
        return (
            <div className={`${wrapperClasses} ${className}`}>
                <div className="flex flex-col overflow-hidden rounded-lg border-2 border-slate-400 bg-white h-full shadow-sm print-card">
                    {/* Image Container */}
                    <div className="relative w-full h-[35mm] overflow-hidden bg-gray-100 flex-shrink-0">
                        {imageSrc && (
                            <Image
                                src={imageSrc}
                                alt={displayName}
                                fill
                                className="w-full h-full object-cover"
                                sizes="30vw"
                                onLoad={handleImageLoad}
                                onError={() => setImageError(true)}
                                priority
                            />
                        )}
                    </div>

                    {/* Title Bar */}
                    <div className="px-2 py-1 border-b-2 border-slate-300 bg-gray-50 print-card-header flex-shrink-0">
                        <div className="flex items-center justify-between gap-2">
                            <h3 className="text-sm font-bold text-gray-900 leading-none flex-1">{displayName}</h3>
                            <span className="text-[11px] font-medium text-gray-600 flex-shrink-0">{getDisplayTypeName(card)}</span>
                        </div>
                        {/* Display Items */}
                        {(displayItem1 || displayItem2 || displayItem3 || displayItem4) && (
                            <div className="flex flex-row flex-wrap items-center gap-2 print-card-tags mt-0.5">
                                {displayItem1 && <div className="text-[9px] font-medium text-gray-500">{displayItem1}</div>}
                                {displayItem2 && <div className="text-[9px] font-medium text-gray-500">{displayItem2}</div>}
                                {displayItem3 && <div className="text-[9px] font-medium text-gray-500">{displayItem3}</div>}
                                {displayItem4 && <div className="text-[9px] font-medium text-gray-500">{displayItem4}</div>}
                            </div>
                        )}
                    </div>

                    {/* Content Container */}
                    <div className="flex flex-1 flex-col p-2 min-h-0">
                        {/* Description */}
                        <div className="flex-1 text-xs text-gray-700 overflow-hidden card-description print-card-description min-h-0">
                            <ReactMarkdown
                                skipHtml
                                components={{
                                    p: ({ children }) => <p className="mb-1 last:mb-0 leading-tight">{children}</p>,
                                    ul: ({ children }) => <ul className="mb-1 list-inside list-disc text-[10px] space-y-0">{children}</ul>,
                                    ol: ({ children }) => <ol className="mb-1 list-inside list-decimal text-[10px] space-y-0">{children}</ol>,
                                    li: ({ children }) => <li className="mb-0">{children}</li>,
                                }}
                                remarkPlugins={[remarkGfm, remarkBreaks]}
                            >
                                {displayDescription}
                            </ReactMarkdown>
                        </div>

                        {/* Footer */}
                        {card.type !== CardType.Profession && card.hint && (
                            <div className="mt-auto pt-1 border-t-2 border-slate-300 flex-shrink-0">
                                <div className="text-[10px] text-gray-600 italic print-card-hint">{card.hint}</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    } else {
        // 文字模式 - 使用原 CardContent 的布局但采用统一结构
        return (
            <div className={`${wrapperClasses} ${className}`}>
                <div className="border-2 border-slate-400 rounded p-2 bg-white text-xs h-full flex flex-col">
                    {/* Title Bar - 统一的标题区域 */}
                    <div className="px-2 py-1 border-b-2 border-slate-300 bg-gray-50 print-card-header flex-shrink-0">
                        <div className="flex items-center justify-between gap-2">
                            <h3 className="text-sm font-bold text-gray-900 leading-none flex-1">{displayName}</h3>
                            <span className="text-[11px] font-medium text-gray-600 flex-shrink-0">{getDisplayTypeName(card)}</span>
                        </div>
                        {/* Display Items */}
                        {(displayItem1 || displayItem2 || displayItem3 || displayItem4) && (
                            <div className="flex flex-row flex-wrap items-center gap-2 print-card-tags mt-0.5">
                                {displayItem1 && <div className="text-[9px] font-medium text-gray-500">{displayItem1}</div>}
                                {displayItem2 && <div className="text-[9px] font-medium text-gray-500">{displayItem2}</div>}
                                {displayItem3 && <div className="text-[9px] font-medium text-gray-500">{displayItem3}</div>}
                                {displayItem4 && <div className="text-[9px] font-medium text-gray-500">{displayItem4}</div>}
                            </div>
                        )}
                    </div>

                    {/* Content Container */}
                    <div className="flex flex-1 flex-col p-2 min-h-0">
                        {/* Description */}
                        <div className="flex-1 text-xs text-gray-700 overflow-hidden card-description print-card-description min-h-0">
                            <ReactMarkdown
                                skipHtml
                                components={{
                                    p: ({ children }) => <p className="mb-1 last:mb-0 leading-tight">{children}</p>,
                                    ul: ({ children }) => <ul className="mb-1 list-inside list-disc text-[10px] space-y-0">{children}</ul>,
                                    ol: ({ children }) => <ol className="mb-1 list-inside list-decimal text-[10px] space-y-0">{children}</ol>,
                                    li: ({ children }) => <li className="mb-0">{children}</li>,
                                }}
                                remarkPlugins={[remarkGfm, remarkBreaks]}
                            >
                                {displayDescription}
                            </ReactMarkdown>
                        </div>

                        {/* Footer */}
                        {card.type !== CardType.Profession && card.hint && (
                            <div className="mt-auto pt-1 border-t-2 border-slate-300 flex-shrink-0">
                                <div className="text-[10px] text-gray-600 italic print-card-hint">{card.hint}</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }
}