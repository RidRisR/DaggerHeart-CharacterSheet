"use client"

import { useEffect, useCallback, useState, useMemo } from "react"
import { StandardCard, createEmptyCard } from "@/card/card-types"
import { BaseCardModal, ModalHeader, ModalFilterBar } from "./base"
import { ContentStates, InfiniteCardGrid } from "./display"
import { MultiSelectFilter } from "./filters"
import { CardTypeSidebar } from "./card-selection/CardTypeSidebar"
import { useCardFiltering } from "@/hooks/use-card-filtering"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, X } from "lucide-react"
import { CustomCardCreatorModal } from "./custom-card-creator-modal"
import { getActiveCharacterId } from "@/lib/multi-character-storage"
import { useTranslation } from "@/lib/i18n"

interface CardSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (card: StandardCard) => void
  selectedCardIndex: number
  initialTab?: string
}

/**
 * 卡牌选择模态框
 *
 * 重构后的简化版本：
 * - 状态内部管理（通过 useCardFiltering hook）
 * - 使用 BaseCardModal 底座
 * - 使用统一的筛选器组件
 * - 代码量从 991 行减少到 ~140 行
 */
export function CardSelectionModal({
  isOpen,
  onClose,
  onSelect,
  selectedCardIndex,
  initialTab,
}: CardSelectionModalProps) {
  const t = useTranslation()

  // === 使用简化的筛选 Hook ===
  const {
    filteredCards,
    classOptions,
    levelOptions,
    batchOptions,
    state,
    actions,
    loading,
    error,
  } = useCardFiltering(initialTab)


  // 本地搜索词（modal 关闭后自动清空）
  const [searchTerm, setSearchTerm] = useState('')

  // 刷新触发器（用于卡牌动画）
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // 自定义卡牌模态框状态
  const [customCardModalOpen, setCustomCardModalOpen] = useState(false)

  // 本地搜索过滤（在 useCardFiltering 结果基础上再过滤）
  const searchedCards = useMemo(() => {
    if (!searchTerm.trim()) return filteredCards
    const term = searchTerm.toLowerCase()
    return filteredCards.filter(card =>
      card.name?.toLowerCase().includes(term) ||
      card.description?.toLowerCase().includes(term) ||
      card.cardSelectDisplay?.item1?.toLowerCase().includes(term) ||
      card.cardSelectDisplay?.item2?.toLowerCase().includes(term) ||
      card.cardSelectDisplay?.item3?.toLowerCase().includes(term)
    )
  }, [filteredCards, searchTerm])

  // === 无限滚动 ===
  const { displayedItems, hasMore, loadMore, scrollRef } = useInfiniteScroll({
    items: searchedCards,
    pageSize: 30,
  })

  // === 副作用 ===

  // 筛选结果变化时触发动画（滚动重置由 useInfiniteScroll 内部处理）
  useEffect(() => {
    setRefreshTrigger(prev => prev + 1)
  }, [searchedCards])

  // === 事件处理 ===

  const handleCardClick = useCallback((card: StandardCard) => {
    const cardToSelect = { ...card }
    if (!cardToSelect.type) {
      cardToSelect.type = state.activeTab
    }
    onSelect(cardToSelect)
    onClose()
  }, [state.activeTab, onSelect, onClose])

  const handleClearSelection = useCallback(() => {
    onSelect(createEmptyCard())
    onClose()
  }, [onSelect, onClose])

  // 重置筛选
  const handleResetFilters = useCallback(() => {
    setSearchTerm('')
    actions.resetAll()
  }, [actions])

  // Tab 切换
  const handleTabChange = useCallback((tab: string) => {
    actions.setActiveTab(tab)
  }, [actions])

  // === 渲染 ===

  return (
    <>
    <BaseCardModal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      sidebar={
        <CardTypeSidebar
          activeTab={state.activeTab}
          onTabChange={handleTabChange}
        />
      }
      header={
        <ModalHeader
          title={t("cardSelection.title", { index: selectedCardIndex + 1 })}
          onClose={onClose}
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCustomCardModalOpen(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                {t("cardSelection.customCard")}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearSelection}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {t("cardSelection.clearSelection")}
              </Button>
            </>
          }
        />
      }
    >
      <ModalFilterBar>
        <MultiSelectFilter
          label={t("cardSelection.package")}
          options={batchOptions.map(b => ({ value: b.id, label: `${b.name} (${b.cardCount})` }))}
          selected={state.selectedBatches}
          onChange={actions.setBatches}
          placeholder={t("cardSelection.noPackageSelected")}
          allSelectedText={t("cardSelection.allPackages")}
          countSuffix={t("cardSelection.packagesSelected")}
          selectAllText={t("cardSelection.selectAll")}
          deselectAllText={t("cardSelection.deselectAll")}
          invertSelectionText={t("cardSelection.invertSelection")}
          noMatchesText={t("cardSelection.noFilterMatches")}
          showSearch
          searchPlaceholder={t("cardSelection.searchPackages")}
        />
        <MultiSelectFilter
          label={t("cardSelection.category")}
          options={classOptions}
          selected={state.selectedClasses}
          onChange={actions.setClasses}
          placeholder={t("cardSelection.noCategorySelected")}
          allSelectedText={t("cardSelection.allCategories")}
          countSuffix={t("cardSelection.categoriesSelected")}
          selectAllText={t("cardSelection.selectAll")}
          deselectAllText={t("cardSelection.deselectAll")}
          invertSelectionText={t("cardSelection.invertSelection")}
          noMatchesText={t("cardSelection.noFilterMatches")}
          disabled={classOptions.length === 0}
        />
        <MultiSelectFilter
          label={t("cardSelection.level")}
          options={levelOptions}
          selected={state.selectedLevels}
          onChange={actions.setLevels}
          placeholder={t("cardSelection.noLevelSelected")}
          allSelectedText={t("cardSelection.allLevels")}
          countSuffix={t("cardSelection.levelsSelected")}
          selectAllText={t("cardSelection.selectAll")}
          deselectAllText={t("cardSelection.deselectAll")}
          invertSelectionText={t("cardSelection.invertSelection")}
          noMatchesText={t("cardSelection.noFilterMatches")}
          disabled={levelOptions.length === 0}
        />
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("cardSelection.searchCards")}
            className="pl-9 pr-9"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          variant="secondary"
          onClick={handleResetFilters}
          className="bg-gray-500 hover:bg-gray-600 text-white"
        >
          {t("cardSelection.resetFilters")}
        </Button>
      </ModalFilterBar>

      <div
        id="cardSelectionScrollable"
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4"
      >
        <ContentStates
          loading={loading}
          error={error}
          empty={searchedCards.length === 0}
          emptyMessage={t("cardSelection.empty")}
          loadingMessage={t("cardSelection.loading")}
        >
          <InfiniteCardGrid
            cards={displayedItems}
            hasMore={hasMore}
            onLoadMore={loadMore}
            onCardClick={handleCardClick}
            totalCount={searchedCards.length}
            scrollableTarget="cardSelectionScrollable"
            refreshTrigger={refreshTrigger}
            className="gap-6"
          />
        </ContentStates>
      </div>
    </BaseCardModal>

    <CustomCardCreatorModal
      isOpen={customCardModalOpen}
      onClose={() => setCustomCardModalOpen(false)}
      onCreate={(card) => {
        onSelect(card)
        setCustomCardModalOpen(false)
        onClose()
      }}
      characterId={getActiveCharacterId() || "default"}
    />
  </>
  )
}
