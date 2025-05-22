"use client"

import type { StandardCard } from "@/data/card/card-types"
import { getCardTypeColor } from "@/data/card/card-ui-config"
import React, { useState, useEffect, useRef } from "react"

interface SelectableCardProps {
    card: StandardCard
    onClick: (cardId: string) => void
}

export function SelectableCard({ card, onClick }: SelectableCardProps) {
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
    // Fallback to attributes if top-level properties are not present
    const displayClass = card.class || card.attributes?.主职业 || "——";
    const displayPrimaryAttribute = card.primaryAttribute || "——";
    const displaySecondaryAttribute = card.secondaryAttribute || "——";
    const displayLevel = card.level?.toString() || card.attributes?.等级?.toString() || "——";
    const displayType = card.type?.replace(/卡$/, "") || "unknown";
    const displayImageUrl = card.imageUrl;

    const getPreviewPosition = (): React.CSSProperties => {
        if (!cardRef.current) return {}
        const rect = cardRef.current.getBoundingClientRect()
        const isRightSide = rect.left > window.innerWidth / 2
        return {
            position: "fixed",
            top: `${rect.top}px`,
            left: isRightSide ? "auto" : `${rect.right + 10}px`,
            right: isRightSide ? `${window.innerWidth - rect.left + 10}px` : "auto",
            maxHeight: "80vh",
            overflowY: "auto",
            zIndex: 1000,
        }
    }

    return (
        <div
            ref={cardRef}
            key={cardId}
            className="relative cursor-pointer h-full flex flex-col w-72" // Added w-72 for fixed width
            onClick={() => onClick(cardId)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
                setIsHovered(false)
                setIsAltPressed(false)
            }}
        >
            {/* Main card content area with fixed height */}
            <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col flex-1 h-64">
                {/* Name and Description section - takes remaining space */}
                <div className="bg-white p-3 flex flex-col flex-1 overflow-hidden">
                    <h3 className="text-base font-semibold mb-1 truncate" title={displayName}>
                        {displayName}
                    </h3>
                    <div className="text-xs text-gray-600 overflow-y-auto flex-grow">
                        {displayDescription}
                    </div>
                </div>

                {/* Attributes section - fixed height */}
                <div
                    className="p-2 h-24 flex flex-col justify-around" // Removed text-white, kept h-24 and flex utilities
                    style={{
                        backgroundColor: getCardTypeColor(displayType) || "#4b5563",
                    }}
                >
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                        <div className="truncate" title={displayPrimaryAttribute}>
                            <span className="opacity-80"></span> {displayPrimaryAttribute}
                        </div>
                        <div className="truncate" title={displaySecondaryAttribute}>
                            <span className="opacity-80"></span> {displaySecondaryAttribute}
                        </div>
                    </div>
                </div>
            </div>

            {isHovered && displayName && (
                <div
                    className="absolute bg-white border border-gray-300 rounded-md shadow-lg"
                    style={{
                        ...getPreviewPosition(),
                        width: isAltPressed ? "400px" : "280px",
                    } as React.CSSProperties}
                >
                    <div className={isAltPressed ? "w-full" : "w-3/4 mx-auto"}>
                        <div className="aspect-[816/1110] w-full overflow-hidden">
                            <img
                                src={
                                    displayImageUrl ||
                                    `/placeholder.svg?height=1110&width=816&query=fantasy card ${displayName || "card"}`
                                }
                                alt={displayName || "卡牌"}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>

                    {!isAltPressed && displayDescription && (
                        <div className="p-2 border-t">
                            <p className="text-xs text-gray-700">
                                {displayDescription || "无描述"}
                            </p>
                        </div>
                    )}

                    <div className="text-[10px] text-gray-400 text-center p-1 bg-gray-50">
                        {isAltPressed ? "松开ALT键返回正常视图" : "按住ALT键查看大图"}
                    </div>
                </div>
            )}
        </div>
    )
}
