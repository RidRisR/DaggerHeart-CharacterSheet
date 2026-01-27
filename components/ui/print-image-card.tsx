"use client"

import { StandardCard, ExtendedStandardCard, isVariantCard, getVariantRealType, CardType } from "@/card/card-types"
import { getCardTypeName } from "@/card/card-ui-config"
import React from "react"
import Image from "next/image"
import { getCardImageUrl, getCardImageUrlAsync } from "@/lib/utils"
import { CardMarkdown } from "@/components/ui/card-markdown"

const getDisplayTypeName = (card: StandardCard) => {
    if (isVariantCard(card)) {
        const realType = getVariantRealType(card)
        if (realType) {
            return getCardTypeName(realType)
        }
    }
    return getCardTypeName(card.type)
}

interface PrintImageCardProps {
    card: ExtendedStandardCard | StandardCard
}

/**
 * 打印用图片卡片组件
 *
 * 纯渲染组件，不负责状态上报。
 * 图片加载状态由 usePrintReady hook 通过 DOM 观察获取。
 */
export function PrintImageCard({ card }: PrintImageCardProps) {
    const [imageSrc, setImageSrc] = React.useState<string | null>(null)
    const [imageError, setImageError] = React.useState(false)

    // 获取图片 URL
    React.useEffect(() => {
        setImageError(false)
        const loadImageUrl = async () => {
            const url = await getCardImageUrlAsync(card, false)
            setImageSrc(url)
        }
        loadImageUrl()
    }, [card])

    // 图片加载失败时使用备用图片
    React.useEffect(() => {
        if (imageError && !imageSrc?.includes('empty-card.webp')) {
            const url = getCardImageUrl(card, true)
            setImageSrc(url)
        }
    }, [imageError, card, imageSrc])

    if (!card) {
        return null
    }

    const displayName = card.name || "未命名卡牌"
    const displayDescription = card.description || "无描述。"
    const displayItem1 = card.cardSelectDisplay?.item1 || ""
    const displayItem2 = card.cardSelectDisplay?.item2 || ""
    const displayItem3 = card.cardSelectDisplay?.item3 || ""
    const displayItem4 = card.cardSelectDisplay?.item4 || ""

    return (
        <div className="flex flex-col overflow-hidden rounded-lg border border-gray-400 bg-white h-full shadow-sm print-card">
            {/* 图片容器 */}
            <div className="relative w-full aspect-[1.6] overflow-hidden bg-gray-100">
                {imageSrc && (
                    <Image
                        src={imageSrc}
                        alt={displayName}
                        fill
                        className="w-full h-full object-cover object-[center_20%]"
                        sizes="30vw"
                        onError={() => setImageError(true)}
                        priority
                    />
                )}
            </div>

            {/* 标题栏 */}
            <div className="px-2 py-1.5 border-b border-gray-200 bg-gray-50 print-card-header">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-gray-900 leading-none flex-1">{displayName}</h3>
                    <span className="text-[11px] font-medium text-gray-600 flex-shrink-0">{getDisplayTypeName(card)}</span>
                </div>
                {(displayItem1 || displayItem2 || displayItem3 || displayItem4) && (
                    <div className="flex flex-row flex-wrap items-center gap-2 print-card-tags mt-0.5">
                        {displayItem1 && <div className="text-[9px] font-medium text-gray-500">{displayItem1}</div>}
                        {displayItem2 && <div className="text-[9px] font-medium text-gray-500">{displayItem2}</div>}
                        {displayItem3 && <div className="text-[9px] font-medium text-gray-500">{displayItem3}</div>}
                        {displayItem4 && <div className="text-[9px] font-medium text-gray-500">{displayItem4}</div>}
                    </div>
                )}
            </div>

            {/* 内容区域 */}
            <div className="flex flex-1 flex-col p-2">
                <div className="flex-1 text-xs text-gray-700 overflow-hidden card-description print-card-description">
                    <CardMarkdown
                        className="text-[10px]"
                        customComponents={{
                            p: ({ children }) => <p className="mb-1 last:mb-0 leading-tight">{children}</p>,
                            li: ({ children }) => <li className="mb-0">{children}</li>,
                        }}
                    >
                        {displayDescription}
                    </CardMarkdown>
                </div>

                {/* 底部提示 */}
                {card.type !== CardType.Profession && card.hint && (
                    <div className="mt-auto pt-1 border-t border-gray-200">
                        <div className="text-[10px] text-gray-600 italic print-card-hint">{card.hint}</div>
                    </div>
                )}
            </div>
        </div>
    )
}
