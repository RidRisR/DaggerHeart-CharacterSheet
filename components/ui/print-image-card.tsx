"use client"

import { StandardCard, ExtendedStandardCard, isVariantCard, getVariantRealType, CardType } from "@/card/card-types"
import { getCardTypeName } from "@/card/card-ui-config"
import React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import Image from "next/image"
import { getBasePath } from "@/lib/utils"

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

interface PrintImageCardProps {
    card: ExtendedStandardCard | StandardCard
    onImageLoad?: () => void
}

export function PrintImageCard({ card, onImageLoad }: PrintImageCardProps) {
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

    return (
        <div className="flex flex-col overflow-hidden rounded-lg border border-gray-300 bg-white h-full">
            {/* Image Container */}
            <div className="relative w-full aspect-[1.4] overflow-hidden">
                <Image
                    src={card.imageUrl ? `${getBasePath()}${card.imageUrl.startsWith('/') ? card.imageUrl : '/' + card.imageUrl}` : `${getBasePath()}/empty-card.webp`}
                    alt={displayName}
                    fill
                    className="w-full h-full object-cover"
                    sizes="30vw"
                    onLoad={handleImageLoad}
                    priority
                />
                <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/50 to-transparent pointer-events-none flex flex-col justify-end p-2">
                    <h3 className="text-base font-bold text-white leading-tight">{displayName}</h3>
                    <span className="text-xs font-medium text-gray-200">{getDisplayTypeName(card)}</span>
                </div>
            </div>


            {/* Content Container */}
            <div className="flex flex-1 flex-col p-2">
                {/* Display Items */}
                {(displayItem1 || displayItem2 || displayItem3 || displayItem4) && (
                    <div className="mb-2 flex flex-row flex-wrap items-center gap-1 border-b border-dashed border-gray-200 pb-2 text-[10px]">
                        {displayItem1 && <div className="rounded-full bg-gray-100 px-2 py-0.5 font-semibold text-gray-700">{displayItem1}</div>}
                        {displayItem2 && <div className="rounded-full bg-gray-100 px-2 py-0.5 font-semibold text-gray-700">{displayItem2}</div>}
                        {displayItem3 && <div className="rounded-full bg-gray-100 px-2 py-0.5 font-semibold text-gray-700">{displayItem3}</div>}
                        {displayItem4 && <div className="rounded-full bg-gray-100 px-2 py-0.5 font-semibold text-gray-700">{displayItem4}</div>}
                    </div>
                )}

                {/* Description */}
                <div className="flex-1 text-xs text-gray-700 overflow-hidden card-description">
                    <ReactMarkdown
                        skipHtml
                        components={{
                            p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                            ul: ({ children }) => <ul className="mb-1 list-inside list-disc text-[11px]">{children}</ul>,
                            ol: ({ children }) => <ol className="mb-1 list-inside list-decimal text-[11px]">{children}</ol>,
                            li: ({ children }) => <li className="mb-0.5">{children}</li>,
                        }}
                        remarkPlugins={[remarkGfm, remarkBreaks]}
                    >
                        {displayDescription}
                    </ReactMarkdown>
                </div>

                {/* Footer */}
                {card.type !== CardType.Profession && card.hint && (
                    <div className="mt-auto pt-2 border-t border-gray-100">
                        <div className="text-[10px] text-gray-600 italic">{card.hint}</div>
                    </div>
                )}
            </div>
        </div>
    )
}
