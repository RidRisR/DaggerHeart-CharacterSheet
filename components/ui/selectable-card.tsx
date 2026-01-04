"use client"

import { CardType, StandardCard, ExtendedStandardCard, CardSource } from "@/card/card-types"
import { getCardTypeName } from "@/card/card-ui-config"
import { isVariantCard, getVariantRealType } from "@/card/card-types"
import { getBatchName } from "@/card"
import { getStandardCardById } from "@/card"
import React, { useState, useEffect, useRef } from "react"
import { CardMarkdown } from "@/components/ui/card-markdown"

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

// Helper function to get card type border color hex value
const getCardTypeBorderColorHex = (cardType: string): string => {
    if (cardType.includes("domain")) return "#f87171"; // red-400
    if (cardType.includes("profession")) return "#60a5fa"; // blue-400
    if (cardType.includes("ancestry")) return "#9ca3af"; // gray-400
    if (cardType.includes("subclass")) return "#c084fc"; // purple-400
    if (cardType.includes("community")) return "#2dd4bf"; // teal-400
    return "#34d399"; // green-400, variant default
};

// Helper function to get card source display name
const getCardSourceDisplayName = (card: StandardCard | ExtendedStandardCard): string => {
    // 检查是否有来源信息
    const extCard = card as ExtendedStandardCard;
    if (extCard.source !== undefined) {
        if (extCard.source === CardSource.BUILTIN) {
            return "内置卡包";
        }
        if (extCard.source === CardSource.CUSTOM) {
            // 优先使用 batchName
            if (extCard.batchName) {
                return extCard.batchName;
            }
            // 其次使用 batchId 获取名称
            if (extCard.batchId) {
                const batchName = getBatchName(extCard.batchId);
                if (batchName) {
                    return batchName;
                }
                return extCard.batchId;
            }
            return "自定义卡包";
        }
        return "内置卡包";
    }

    // 如果没有来源信息，尝试通过ID查找
    const matchedCard = getStandardCardById(card.id);
    if (matchedCard && (matchedCard as ExtendedStandardCard).source !== undefined) {
        const matched = matchedCard as ExtendedStandardCard;
        if (matched.source === CardSource.BUILTIN) {
            return "内置卡包";
        }
        if (matched.source === CardSource.CUSTOM) {
            return matched.batchName || matched.batchId || "自定义卡包";
        }
    }

    return "未知来源";
};

interface SelectableCardProps {
    card: ExtendedStandardCard | StandardCard
    onClick: (cardId: string) => void;
    isSelected: boolean;
    showSource?: boolean; // 是否显示来源，默认为 true
}

export function SelectableCard({ card, onClick, isSelected, showSource = true }: SelectableCardProps) {
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
    }, [card.id, showSource, card])

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

    // 构建属性徽章数组（只包含非空项）
    let badges = [displayItem1, displayItem2, displayItem3, displayItem4].filter(Boolean);

    // 子职业卡特殊处理：为施法属性添加"施法"后缀
    if (card.type === CardType.Subclass && displayItem3) {
        const castingAttr = displayItem3 === '不可施法' ? displayItem3 : `${displayItem3}施法`;
        badges = [displayItem1, displayItem2, castingAttr].filter(Boolean);
    }

    // 领域卡特殊处理：为领域名添加"领域"后缀
    if (card.type === CardType.Domain && displayItem1) {
        const domainName = `${displayItem1}领域`;
        badges = [domainName, displayItem2, displayItem3, displayItem4].filter(Boolean);
    }

    // 根据卡牌类型提取右上角关键信息（视觉锚点）
    let rightAnchor: string | null = null;
    switch (card.type) {
        case CardType.Domain:
            // 领域卡：强调等级
            rightAnchor = badges.find(b => b.startsWith('LV.')) || null;
            break;
        case CardType.Subclass:
            // 子职业卡：不提取锚点，显示类型标签（"子职业"）
            rightAnchor = null;
            break;
        case CardType.Ancestry:
            // 种族卡：不提取锚点，显示类型标签（"种族"），种族名称保留在属性徽章中
            rightAnchor = null;
            break;
        default:
            // 职业卡、社群卡：不提取锚点，显示类型标签
            rightAnchor = null;
    }

    // 过滤掉已提取的锚点信息，避免重复显示
    const otherBadges = rightAnchor ? badges.filter(b => b !== rightAnchor) : badges;

    return (
        <div
            ref={cardRef}
            key={cardId}
            className={`border-2 rounded-lg p-4 bg-white flex flex-col gap-0 break-inside-avoid shadow-md hover:shadow-lg transition-shadow relative cursor-pointer w-full max-w-72 h-full min-h-[350px] ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => onClick(cardId)}
            onMouseEnter={() => setIsHovered(false)}
            onMouseLeave={() => {
                setIsHovered(false)
                setIsAltPressed(false)
            }}
        >
            {/* 标题区 */}
            <div className="flex items-start justify-between gap-2 mb-1.5">
                <h3 className="font-bold text-xl text-gray-900 leading-tight flex-1 min-w-0" title={displayName}>
                    {displayName}
                </h3>

                {/* 右上角：优先显示关键锚点（小标签），否则显示类型标签 */}
                <span className="text-sm px-2 py-0.5 rounded bg-gray-100 text-gray-600 whitespace-nowrap flex-shrink-0">
                    {rightAnchor || getDisplayTypeName(card)}
                </span>
            </div>

            {/* 属性徽章区 */}
            {otherBadges.length > 0 && (
                <div className="pb-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        {otherBadges.map((badge, index) => (
                            <React.Fragment key={index}>
                                {index > 0 && <span className="text-gray-300">•</span>}
                                <span className="text-gray-600">
                                    {badge}
                                </span>
                            </React.Fragment>
                        ))}
                    </div>
                    <div className="w-1/2 h-px mt-1.5" style={{
                        background: `linear-gradient(to right, ${getCardTypeBorderColorHex(card.type)}, transparent)`
                    }}></div>
                </div>
            )}

            {/* 描述区 */}
            <div className="text-sm text-gray-700 leading-loose text-left flex-1 overflow-hidden pt-3">
                <CardMarkdown>{displayDescription}</CardMarkdown>
            </div>

            {/* 底部区域（hint + 来源信息） */}
            {((card.type !== CardType.Profession && card.hint) || showSource) && (
                <div className="text-xs text-gray-500 border-t border-gray-200 pt-2 mt-auto space-y-1">
                    {card.type !== CardType.Profession && card.hint && (
                        <div className="italic">{card.hint}</div>
                    )}
                    {showSource && (
                        <div className="text-right text-[10px] text-gray-400">{cardSource}</div>
                    )}
                </div>
            )}
        </div>
    )
}
