"use client"

import type { StandardCard } from "@/card/card-types"
import { getCardTypeName } from "@/card/card-ui-config"
import { getVariantRealType, isVariantCard } from "@/card/card-types"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import React, { useState } from "react"

const basePath = '/DaggerHeart-CharacterSheet';

interface CardHoverPreviewProps {
    card: StandardCard
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

export function CardHoverPreview({ card }: CardHoverPreviewProps) {
    if (!card) return null

    const [imageError, setImageError] = useState(false)
    const displayTypeName = getDisplayTypeName(card)
    const cardImage = card.imageUrl || `/empty-card.webp` // Default image if none provided

    return (
        <div className="flex flex-row bg-white border border-gray-200 rounded-lg shadow-lg w-[520px] text-gray-800 overflow-auto">
            {/* Left Column: Image and Info Section */}
            <div className="flex flex-col w-[220px] flex-shrink-0">
                {/* Image Section */}
                {cardImage && (
                    <div className="relative w-full h-40">
                        <Image
                            src={imageError ? basePath + '/empty-card.webp' : (basePath + card.imageUrl || basePath + '/empty-card.webp')}
                            alt={`Image for ${card.name}`}
                            width={300}
                            height={420}
                            className="object-cover"
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
                    </div>
                </div>
            </div>

            {/* Separator */}
            <div className="w-px bg-gray-200"></div>

            {/* Right Column: Description + Hint */}
            {card.description && (
                <div className="flex-grow p-3 min-w-0 flex flex-col h-full">
                    <div className="text-sm text-gray-700 h-full overflow-y-auto pr-1 prose prose-sm max-w-none">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkBreaks]}
                            components={{
                                p: ({ children }) => <p className="first:mt-0 mb-0 mt-1">{children}</p>,
                                ul: ({ children }) => <ul className="list-disc pl-4 mb-0">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal pl-4 mb-0">{children}</ol>,
                                li: ({ children }) => <li className="mb-0.5 last:mb-0">{children}</li>,
                            }}
                        >
                            {card.description}
                        </ReactMarkdown>
                    </div>
                    {card.hint && card.type !== "profession" && (
                        <>
                            <div className="h-px bg-gray-200 w-full my-2"></div>
                            <p className="text-xs text-gray-500 italic">{card.hint}</p>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
