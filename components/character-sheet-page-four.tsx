"use client"
import React, { useMemo } from "react"
import { isEmptyCard, StandardCard } from "@/card/card-types"
import type { SheetData } from "@/lib/sheet-data"
import PaginatedCardDeck from "./paginated-card-deck" // 导入新的分页组件

interface CharacterSheetPageFourProps {
    formData: SheetData
}

// 打印专用页面，分别展示聚焦卡组和库存卡组
const CharacterSheetPageFour: React.FC<CharacterSheetPageFourProps> = ({ formData }) => {
    // 获取聚焦卡组的有效卡牌
    const focusedCards = useMemo(() => {
        return (formData?.cards || []).filter((card: StandardCard) => !isEmptyCard(card));
    }, [formData?.cards]);

    // 获取库存卡组的有效卡牌
    const inventoryCards = useMemo(() => {
        return (formData?.inventory_cards || []).filter((card: StandardCard) => !isEmptyCard(card));
    }, [formData?.inventory_cards]);

    const showFocusedDeck = focusedCards.length > 0;
    const showInventoryDeck = inventoryCards.length > 0;

    // 如果两个卡组都为空，则显示占位符
    if (!showFocusedDeck && !showInventoryDeck) {
        return (
            <div className="w-full max-w-[210mm] mx-auto my-4">
                <div
                    className="a4-page p-4 bg-white text-gray-800 shadow-lg print:shadow-none rounded-md flex items-center justify-center"
                    style={{ width: "210mm", height: "297mm" }}
                >
                    <div className="text-center text-gray-500">
                        <h3 className="text-xl font-semibold mb-2">卡组打印页</h3>
                        <p className="text-sm">当您有聚焦卡组或库存卡组时，卡牌将在此处生成以供打印。</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="card-print-container">
            {/* 为聚焦卡组生成分页 */}
            {showFocusedDeck && (
                <PaginatedCardDeck
                    cards={focusedCards}
                    title="聚焦卡组"
                />
            )}

            {/* 为库存卡组生成分页 */}
            {showInventoryDeck && (
                <PaginatedCardDeck
                    cards={inventoryCards}
                    title="库存卡组"
                />
            )}
        </div>
    )
}

export default CharacterSheetPageFour
