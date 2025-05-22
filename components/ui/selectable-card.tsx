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
            className="relative cursor-pointer"
            onClick={() => onClick(cardId)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
                setIsHovered(false)
                setIsAltPressed(false)
            }}
        >
            <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-white p-2 h-48 flex flex-col">
                    <div className="flex items-center mb-2">
                        <img
                            src={
                                card.imageUrl ||
                                `/placeholder.svg?height=40&width=40&query=icon for ${card.name || "card"}`
                            }
                            alt={card.name || "card icon"}
                            className="w-6 h-6 mr-1 object-contain"
                        />
                        <span className="text-sm font-medium truncate">{card.name || "未命名卡牌"}</span>
                    </div>
                    <div className="text-xs text-gray-600 overflow-hidden line-clamp-5 flex-grow">
                        {card.description || "无描述"}
                    </div>
                </div>

                <div
                    className="p-2 text-white"
                    style={{
                        backgroundColor: getCardTypeColor(card.type?.replace(/卡$/, "") || "unknown") || "#4b5563",
                    }}
                >
                    <div className="text-sm font-medium truncate">{card.name || "未命名卡牌"}</div>
                    <div className="flex justify-between items-center text-xs opacity-90 mt-1">
                        <span className="truncate max-w-[25%]">
                            {card.class || "——"}
                        </span>
                        <span className="truncate max-w-[25%]">
                            {card.primaryAttribute || "——"}
                        </span>
                        <span className="truncate max-w-[25%]">
                            {card.secondaryAttribute || "——"}
                        </span>
                        <span>{card.level?.toString() || "——"}</span>
                    </div>
                </div>
            </div>

            {isHovered && card.name && (
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
                                    card.imageUrl ||
                                    `/placeholder.svg?height=1110&width=816&query=fantasy card ${card.name || "card"}`
                                }
                                alt={card.name || "卡牌"}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>

                    {!isAltPressed && card.description && (
                        <div className="p-2 border-t">
                            <p className="text-xs text-gray-700">
                                {card.description || "无描述"}
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
