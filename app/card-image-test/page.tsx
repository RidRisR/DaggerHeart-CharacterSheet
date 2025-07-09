"use client"

import { ImageCard } from "@/components/ui/image-card"
import { getStandardCardsByTypeAsync, CardType } from "@/card"
import { useState, useEffect } from "react"
import type { ExtendedStandardCard } from "@/card/card-types"

// Helper to get a random integer between min and max (inclusive)
const getRandomInt = (min: number, max: number) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function CardImageTestPage() {
    const [selectedCard, setSelectedCard] = useState<string | null>(null)
    const [domainCards, setDomainCards] = useState<ExtendedStandardCard[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadDomainCards = async () => {
            try {
                const cards = await getStandardCardsByTypeAsync(CardType.Ancestry)
                // Assign a random image to each domain card
                const cardsWithImages = cards.map(card => ({
                    ...card,
                    imageUrl: `/${getRandomInt(10001, 10189)}.jpg`
                }));
                setDomainCards(cardsWithImages)
            } catch (error) {
                console.error("加载领域卡失败:", error)
            } finally {
                setLoading(false)
            }
        }

        loadDomainCards()
    }, [])

    const handleCardClick = (cardId: string) => {
        setSelectedCard(prevId => (prevId === cardId ? null : cardId))
    }

    if (loading) {
        return (
            <div className="container mx-auto p-4">
                <h1 className="text-2xl font-bold mb-6">领域卡牌测试</h1>
                <div className="text-center">加载中...</div>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-6">领域卡牌测试</h1>
            <div className="text-sm text-gray-500 mb-4">共 {domainCards.length} 张领域卡</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {domainCards.map(card => (
                    <ImageCard
                        key={card.id}
                        card={card}
                        onClick={handleCardClick}
                        isSelected={selectedCard === card.id}
                        showSource={true}
                    />
                ))}
            </div>
        </div>
    )
}
