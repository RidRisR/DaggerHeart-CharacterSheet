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

  // 计算激活的筛选器数量
  const activeFilterCount =
    (state.selectedBatches.length > 0 ? 1 : 0) +
    (state.selectedClasses.length > 0 ? 1 : 0) +
    (state.selectedLevels.length > 0 ? 1 : 0) +
    (searchTerm ? 1 : 0)

  // === 渲染 ===

  return (
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
          title={`选择卡牌 #${selectedCardIndex + 1}`}
          onClose={onClose}
          actions={
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearSelection}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              清除选择
            </Button>
          }
        />
      }
    >
      <ModalFilterBar collapsible activeFilterCount={activeFilterCount}>
        <MultiSelectFilter
          label="卡包"
          options={batchOptions.map(b => ({ value: b.id, label: `${b.name} (${b.cardCount})` }))}
          selected={state.selectedBatches}
          onChange={actions.setBatches}
          placeholder="未选卡包"
          allSelectedText="全部卡包"
          countSuffix="包已选"
          showSearch
          searchPlaceholder="搜索卡包..."
        />
        <MultiSelectFilter
          label="类别"
          options={classOptions}
          selected={state.selectedClasses}
          onChange={actions.setClasses}
          placeholder="未选类别"
          allSelectedText="全部类别"
          countSuffix="类已选"
          disabled={classOptions.length === 0}
        />
        <MultiSelectFilter
          label="等级"
          options={levelOptions}
          selected={state.selectedLevels}
          onChange={actions.setLevels}
          placeholder="未选等级"
          allSelectedText="全部等级"
          countSuffix="级已选"
          disabled={levelOptions.length === 0}
        />
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索卡牌名称或描述..."
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
          重置筛选
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
          emptyMessage="未找到符合条件的卡牌"
          loadingMessage="加载卡牌中..."
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
  )
}
