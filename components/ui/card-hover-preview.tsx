"use client"

import type { StandardCard } from "@/card/card-types"
import { getCardTypeName } from "@/card/card-ui-config"
import { getVariantRealType, isVariantCard } from "@/card/card-types"
import Image from "next/image"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import React, { useState } from "react"
import { getCardImageUrl } from "@/lib/utils"
import { SelectableCard } from "@/components/ui/selectable-card"

interface CardHoverPreviewProps {
    card: StandardCard
    isTextMode?: boolean
}

// Helper function to get display type name, moved outside for consistency
const getDisplayTypeName = (card: StandardCard) => {
    if (isVariantCard(card)) {
        const realType = getVariantRealType(card)
        if (realType) {
            return getCardTypeName(realType)
        }
    }
    return getCardTypeName(card.type)
}

export function CardHoverPreview({ card, isTextMode = false }: CardHoverPreviewProps) {
    const [imageError, setImageError] = useState(false)
    const [imageSrc, setImageSrc] = useState<string>('')
    
    // 异步获取图片URL
    React.useEffect(() => {
        const loadImageUrl = async () => {
            const url = await getCardImageUrl(card, imageError);
            setImageSrc(url);
        };
        
        loadImageUrl();
    }, [card, imageError]);
    
    if (!card) return null

    // 文字模式下使用 SelectableCard 组件
    if (isTextMode) {
        return (
            <div className="shadow-lg">
                <SelectableCard 
                    card={card} 
                    onClick={() => {}} 
                    isSelected={false}
                    showSource={false}
                />
            </div>
        )
    }

    const displayTypeName = getDisplayTypeName(card)

    return (
        <div className="flex flex-row bg-white border border-gray-200 rounded-lg shadow-lg w-[520px] text-gray-800 overflow-auto">
            {/* Left Column: Image and Info Section */}
            <div className="flex flex-col w-[220px] flex-shrink-0">
                {/* Image Section */}
                {imageSrc && (
                    <div className="relative w-full h-40">
                        <Image
                            src={imageSrc}
                            alt={`Image for ${card.name}`}
                            fill
                            className="object-cover"
                            sizes="220px"
                            onError={() => setImageError(true)}
                        />
                    </div>
                )}
                {/* Info Section Below Image */}
                <div className="p-3 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-base leading-tight pr-2 break-words">{card.name}</h3>
                        <span className="text-xs text-gray-500 px-2 py-0.5 rounded-full bg-gray-100 whitespace-nowrap flex-shrink-0">
                            {displayTypeName}
                        </span>
                    </div>
                    <div className="flex flex-row flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
                        {card.cardSelectDisplay?.item1 && <span className="truncate">{card.cardSelectDisplay.item1}</span>}
                        {card.cardSelectDisplay?.item2 && <span className="truncate">{card.cardSelectDisplay.item2}</span>}
                        {card.cardSelectDisplay?.item3 && <span className="truncate">{card.cardSelectDisplay.item3}</span>}
                        {card.cardSelectDisplay?.item4 && <span className="truncate">{card.cardSelectDisplay.item4}</span>}
                    </div>
                </div>
            </div>

            {/* Separator */}
            <div className="w-px bg-gray-200"></div>

            {/* Right Column: Description + Hint */}
            <div className="flex-grow p-3 min-w-0 flex flex-col bg-gray-100 rounded-r-lg">
                {card.description && (
                    <div className="text-sm text-gray-700 flex-grow overflow-y-auto pr-1 prose prose-sm max-w-none">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkBreaks]}
                            components={{
                                p: ({ children }) => <p className="first:mt-0 mb-0 mt-2">{children}</p>,
                                ul: ({ children }) => <ul className="list-disc pl-4 mb-0">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal pl-4 mb-0">{children}</ol>,
                                li: ({ children }) => <li className="mb-0.5 last:mb-0">{children}</li>,
                            }}
                        >
                            {card.description}
                        </ReactMarkdown>
                    </div>
                )}
                {card.hint && card.type !== "profession" && (
                    <>
                        {card.description && <div className="h-px bg-gray-200 w-full my-2 flex-shrink-0"></div>}
                        <p className="text-xs text-gray-500 italic flex-shrink-0">{card.hint}</p>
                    </>
                )}
            </div>
        </div>
    )
}
