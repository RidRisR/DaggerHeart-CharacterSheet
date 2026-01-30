"use client"

import { Button } from "@/components/ui/button"
import { CardType } from "@/card"
import { useState, useEffect, useMemo } from "react"
import type { StandardCard } from "@/card/card-types"
import { getStandardCardsByTypeAsync } from "@/card"
import { useSheetStore } from "@/lib/sheet-store"
import { useUnifiedCardStore } from "@/card/stores/unified-card-store"
import { BaseCardModal, ModalHeader, ModalFilterBar } from "./base"
import { ContentStates, CardGrid } from "./display"
import { MultiSelectFilter } from "./filters"

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
  const cardStore = useUnifiedCardStore()
  const [selectedClasses, setSelectedClasses] = useState<string[]>([])
  const [selectedBatches, setSelectedBatches] = useState<string[]>([])
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [baseCards, setBaseCards] = useState<StandardCard[]>([])
  const [professionCards, setProfessionCards] = useState<StandardCard[]>([])
  const [cardsLoading, setCardsLoading] = useState(true)
  const [cardsError, setCardsError] = useState<string | null>(null)

  // 获取卡包选项
  const batchOptions = useMemo(() => {
    const batches = cardStore.getAllBatches() as unknown as Array<{
      id: string
      name: string
      cardCount: number
    }>
    return batches.map(b => ({
      id: b.id,
      name: b.name,
      cardCount: b.cardCount,
    }))
  }, [cardStore.initialized])

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

  // Calculate filtered cards based on card type, level filter, and batch filter
  const filteredInitialCards = useMemo(() => {
    if (!baseCards) return []

    let initialCards = baseCards

    // 卡包筛选
    if (selectedBatches.length > 0) {
      const batchSet = new Set(selectedBatches)
      initialCards = initialCards.filter(card =>
        (card as any).batchId && batchSet.has((card as any).batchId)
      )
    }

    if (cardType === "subclass") {
      const selectedProfessionCard = professionCards?.find(
        pCard => pCard.id === formData.professionRef?.id
      )
      const professionName = selectedProfessionCard?.name

      initialCards = initialCards.filter(
        (card): card is StandardCard =>
          card.level === 1 && card.class === professionName
      )
    } else if (levelFilter) {
      initialCards = initialCards.filter(card => card.level === levelFilter)
    }

    return initialCards
  }, [baseCards, professionCards, cardType, levelFilter, formData.professionRef?.id, selectedBatches])

  // Calculate available classes for the filter dropdown
  const availableClasses = useMemo(() => {
    const uniqueClasses = Array.from(
      new Set(filteredInitialCards.flatMap((card) => card.class || []).filter((cls) => cls))
    )
    return uniqueClasses.map(cls => ({ value: cls, label: cls }))
  }, [filteredInitialCards])

  // Calculate final filtered cards based on class selection
  const finalFilteredCards = useMemo(() => {
    if (selectedClasses.length === 0) return filteredInitialCards
    return filteredInitialCards.filter(
      (card) => card.class && selectedClasses.some(cls => card.class?.includes(cls))
    )
  }, [filteredInitialCards, selectedClasses])

  // Trigger refresh animation when filter changes
  useEffect(() => {
    setRefreshTrigger(prev => prev + 1)
  }, [finalFilteredCards])

  const handleCardClick = (card: StandardCard) => {
    onSelect(card.id, field)
  }

  // 重置筛选
  const handleResetFilters = () => {
    setSelectedBatches([])
    setSelectedClasses([])
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
            <Button
              variant="destructive"
              onClick={() => onSelect("none", field)}
              className="bg-red-500 hover:bg-red-600 text-white"
              disabled={cardsLoading}
            >
              清除选择
            </Button>
          }
        />
      }
    >
      <ModalFilterBar>
        <MultiSelectFilter
          label="卡包"
          options={batchOptions.map(b => ({ value: b.id, label: `${b.name} (${b.cardCount})` }))}
          selected={selectedBatches}
          onChange={setSelectedBatches}
          placeholder="未选卡包"
          allSelectedText="全部卡包"
          countSuffix="包已选"
          showSearch
          searchPlaceholder="搜索卡包..."
          disabled={cardsLoading}
        />
        <MultiSelectFilter
          label="类别"
          options={availableClasses}
          selected={selectedClasses}
          onChange={setSelectedClasses}
          placeholder="未选类别"
          allSelectedText="全部类别"
          countSuffix="类已选"
          disabled={cardsLoading}
        />
        <Button
          variant="secondary"
          onClick={handleResetFilters}
          className="bg-gray-500 hover:bg-gray-600 text-white"
          disabled={cardsLoading}
        >
          重置筛选
        </Button>
      </ModalFilterBar>

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
