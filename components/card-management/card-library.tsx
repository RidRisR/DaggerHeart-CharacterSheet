"use client"

import type React from "react"

interface CardLibraryProps {
  cards: any[]
  slotIndex?: number
  onCardSelect?: (card: any, slotIndex?: number) => void
  filter?: (card: any) => boolean
}

const CardLibrary: React.FC<CardLibraryProps> = ({ cards, slotIndex, onCardSelect, filter }) => {
  const filteredCards = filter ? cards.filter(filter) : cards

  return (
    <div>
      {filteredCards.map((card, index) => (
        <div
          key={index}
          onClick={() => {
            if (onCardSelect) {
              onCardSelect(card, slotIndex)
            }
          }}
          style={{
            border: "1px solid black",
            padding: "10px",
            margin: "5px",
            cursor: "pointer",
          }}
        >
          {card.name ? card.name : "Unnamed Card"}
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span className="truncate max-w-[25%]">{card.class || "——"}</span>
            <span className="truncate max-w-[25%]">{card.primaryAttribute || "——"}</span>
            <span className="truncate max-w-[25%]">{card.secondaryAttribute || "——"}</span>
            <span>{card.level || "——"}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default CardLibrary
