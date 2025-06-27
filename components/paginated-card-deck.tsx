"use client"
import React from "react"
import { StandardCard } from "@/card/card-types"
import CardContent from "./card-content";

// A4 page dimensions in mm for calculation
const A4_HEIGHT_MM = 297
const A4_WIDTH_MM = 210

// Page margins and gaps in mm
const PAGE_MARGIN_TOP_MM = 15
const PAGE_MARGIN_BOTTOM_MM = 15
const CARD_GAP_MM = 4 // Gap between cards

// Card dimensions in mm (approximated from CSS)
const CARD_WIDTH_MM = (A4_WIDTH_MM - (PAGE_MARGIN_TOP_MM * 2) - (CARD_GAP_MM * 2)) / 3
const CARD_HEIGHT_MM = 88 // A common height for playing cards, can be adjusted

// Calculate how many rows of cards can fit on a page
const USABLE_PAGE_HEIGHT_MM = A4_HEIGHT_MM - PAGE_MARGIN_TOP_MM - PAGE_MARGIN_BOTTOM_MM
const CARDS_PER_ROW = 3
const ROWS_PER_PAGE = Math.floor(USABLE_PAGE_HEIGHT_MM / (CARD_HEIGHT_MM + CARD_GAP_MM))
const CARDS_PER_PAGE = CARDS_PER_ROW * ROWS_PER_PAGE

// Card content rendering component (re-used from character-sheet-page-four)

interface PaginatedCardDeckProps {
    cards: StandardCard[]
    title: string
}

const PaginatedCardDeck: React.FC<PaginatedCardDeckProps> = ({ cards, title }) => {
    if (cards.length === 0) {
        return null
    }

    const totalPages = Math.ceil(cards.length / CARDS_PER_PAGE)
    const pages = Array.from({ length: totalPages }, (_, i) =>
        cards.slice(i * CARDS_PER_PAGE, (i + 1) * CARDS_PER_PAGE)
    )

    return (
        <>
            {pages.map((pageCards, pageIndex) => (
                <div
                    key={`page-${pageIndex}`}
                    className="a4-page p-4 bg-white text-gray-800 shadow-lg print:shadow-none rounded-md my-4 print:my-0"
                    style={{ width: "210mm", height: "297mm", pageBreakAfter: "always" }}
                >
                    {/* Header */}
                    <div className="bg-gray-800 text-white p-2 flex items-center rounded-t-md mb-4">
                        <div className="flex flex-col">
                            <div className="text-[9px]">DAGGERHEART V20250520</div>
                        </div>
                    </div>

                    {/* Page Title */}
                    <div className="print-deck-header mb-6">
                        <h2 className="text-xl font-bold text-center">{title}</h2>
                        <div className="text-sm text-gray-600 text-center mt-1">
                            第 {pageIndex + 1} / {totalPages} 页 (共 {cards.length} 张卡牌)
                        </div>
                    </div>

                    {/* Card Grid */}
                    <div className="print-card-grid grid gap-4" style={{ gridTemplateColumns: `repeat(${CARDS_PER_ROW}, 1fr)` }}>
                        {pageCards.map((card) => (
                            <div
                                key={card.id}
                                className="card-item border rounded p-3 bg-white flex flex-col gap-1"
                                style={{ height: `${CARD_HEIGHT_MM}mm` }}
                            >
                                <CardContent card={card} />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </>
    )
}

export default PaginatedCardDeck
