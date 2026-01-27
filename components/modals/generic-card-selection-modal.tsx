"use client"

import { Button } from "@/components/ui/button"
import { CardType } from "@/card"
import { useState, useEffect, useMemo } from "react"
import type { StandardCard } from "@/card/card-types"
import { getStandardCardsByTypeAsync } from "@/card"
import { useSheetStore } from "@/lib/sheet-store"
import { BaseCardModal, ModalHeader } from "./base"
import { ContentStates, CardGrid } from "./display"
import { SingleSelectFilter } from "./filters"

interface GenericCardSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (cardId: string, field?: string) => void
  title: string
  cardType: Exclude<CardType, CardType.Domain>
  field?: string
  levelFilter?: number
}

export function GenericCardSelectionModal({
  isOpen,
  onClose,
  onSelect,
  title,
  cardType,
  field,
  levelFilter,
}: GenericCardSelectionModalProps) {
  const { sheetData: formData } = useSheetStore()
  const [selectedClass, setSelectedClass] = useState<string>("All")
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [baseCards, setBaseCards] = useState<StandardCard[]>([])
  const [professionCards, setProfessionCards] = useState<StandardCard[]>([])
  const [cardsLoading, setCardsLoading] = useState(true)
  const [cardsError, setCardsError] = useState<string | null>(null)

  // Load cards asynchronously when modal opens or card type changes
  useEffect(() => {
    if (!isOpen || !cardType) return

    let isMounted = true

    const loadCards = async () => {
      setCardsLoading(true)
      setCardsError(null)

      try {
        const cards = await getStandardCardsByTypeAsync(cardType as CardType)
        if (isMounted) {
          setBaseCards(cards)
        }

        if (cardType === "subclass") {
          const profCards = await getStandardCardsByTypeAsync(CardType.Profession)
          if (isMounted) {
            setProfessionCards(profCards)
          }
        }
      } catch (error) {
        if (isMounted) {
          setCardsError(error instanceof Error ? error.message : "Failed to load cards")
        }
      } finally {
        if (isMounted) {
          setCardsLoading(false)
        }
      }
    }

    loadCards()

    return () => {
      isMounted = false
    }
  }, [isOpen, cardType])

  // Calculate filtered cards based on card type and level filter
  const filteredInitialCards = useMemo(() => {
    if (!baseCards) return []

    let initialCards = baseCards

    if (cardType === "subclass") {
      const selectedProfessionCard = professionCards?.find(
        pCard => pCard.id === formData.professionRef?.id
      )
      const professionName = selectedProfessionCard?.name

      initialCards = baseCards.filter(
        (card): card is StandardCard =>
          card.level === 1 && card.class === professionName
      )
    } else if (levelFilter) {
      initialCards = baseCards.filter(card => card.level === levelFilter)
    }

    return initialCards
  }, [baseCards, professionCards, cardType, levelFilter, formData.professionRef?.id])

  // Calculate available classes for the filter dropdown
  const availableClasses = useMemo(() => {
    const uniqueClasses = Array.from(
      new Set(filteredInitialCards.flatMap((card) => card.class || []).filter((cls) => cls))
    )
    return uniqueClasses.map(cls => ({ value: cls, label: cls }))
  }, [filteredInitialCards])

  // Calculate final filtered cards based on class selection
  const finalFilteredCards = useMemo(() => {
    if (selectedClass === "All") return filteredInitialCards
    return filteredInitialCards.filter(
      (card) => card.class && card.class.includes(selectedClass)
    )
  }, [filteredInitialCards, selectedClass])

  // Trigger refresh animation when filter changes
  useEffect(() => {
    setRefreshTrigger(prev => prev + 1)
  }, [finalFilteredCards])

  const handleCardClick = (card: StandardCard) => {
    onSelect(card.id, field)
  }

  return (
    <BaseCardModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      header={
        <ModalHeader
          title={title}
          onClose={onClose}
          actions={
            <>
              <SingleSelectFilter
                value={selectedClass}
                onChange={setSelectedClass}
                options={availableClasses}
                allOption={{ value: "All", label: "全部类别" }}
                placeholder="筛选类别"
                disabled={cardsLoading}
              />
              <Button
                variant="destructive"
                onClick={() => onSelect("none", field)}
                className="bg-red-500 hover:bg-red-600 text-white"
                disabled={cardsLoading}
              >
                清除选择
              </Button>
            </>
          }
        />
      }
    >
      <div className="flex-1 overflow-y-auto p-4">
        <ContentStates
          loading={cardsLoading}
          error={cardsError}
          empty={finalFilteredCards.length === 0}
          emptyMessage={`没有找到符合条件的卡牌 (卡牌类型: ${cardType})`}
          loadingMessage="加载卡牌中..."
        >
          <CardGrid
            cards={finalFilteredCards}
            onCardClick={handleCardClick}
            refreshTrigger={refreshTrigger}
            className="gap-6"
          />
        </ContentStates>
      </div>
    </BaseCardModal>
  )
}
