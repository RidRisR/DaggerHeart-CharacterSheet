"use client"

import { useEffect, useCallback, useState } from "react"
import { StandardCard, createEmptyCard } from "@/card/card-types"
import { BaseCardModal, ModalHeader, ModalFilterBar } from "./base"
import { ContentStates, InfiniteCardGrid } from "./display"
import { MultiSelectFilter, SearchFilter } from "./filters"
import { CardTypeSidebar } from "./card-selection/CardTypeSidebar"
import { useCardFiltering } from "@/hooks/use-card-filtering"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useDebounce } from "@/hooks/use-debounce"
import { Button } from "@/components/ui/button"

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
    totalCount,
    classOptions,
    levelOptions,
    batchOptions,
    state,
    actions,
    loading,
    error,
  } = useCardFiltering(initialTab)

  // 本地搜索词（用于即时输入响应）
  const [localSearchTerm, setLocalSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(localSearchTerm, 300)

  // 同步防抖后的搜索词到筛选状态
  useEffect(() => {
    actions.setSearchTerm(debouncedSearchTerm)
  }, [debouncedSearchTerm, actions])

  // 当筛选状态的搜索词变化时（如重置），同步到本地
  useEffect(() => {
    if (state.searchTerm !== localSearchTerm && state.searchTerm === '') {
      setLocalSearchTerm('')
    }
  }, [state.searchTerm])

  // 刷新触发器（用于卡牌动画）
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // === 无限滚动 ===
  const { displayedItems, hasMore, loadMore, reset, scrollRef } = useInfiniteScroll({
    items: filteredCards,
    pageSize: 30,
  })

  // === 副作用 ===

  // 筛选结果变化时重置滚动
  useEffect(() => {
    reset()
    setRefreshTrigger(prev => prev + 1)
  }, [filteredCards, reset])

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

  // 重置筛选（包括本地搜索词）
  const handleResetFilters = useCallback(() => {
    setLocalSearchTerm('')
    actions.resetAll()
  }, [actions])

  // Tab 切换时也清空本地搜索词
  const handleTabChange = useCallback((tab: string) => {
    setLocalSearchTerm('')
    actions.setActiveTab(tab)
  }, [actions])

  // 计算激活的筛选器数量
  const activeFilterCount =
    (state.selectedBatches.length > 0 ? 1 : 0) +
    (state.selectedClasses.length > 0 ? 1 : 0) +
    (state.selectedLevels.length > 0 ? 1 : 0) +
    (localSearchTerm ? 1 : 0)

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
        <SearchFilter
          value={localSearchTerm}
          onChange={setLocalSearchTerm}
          placeholder="搜索卡牌名称或描述..."
          debounceMs={0}
          className="flex-1 min-w-[200px]"
        />
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
          empty={totalCount === 0}
          emptyMessage="未找到符合条件的卡牌"
          loadingMessage="加载卡牌中..."
        >
          <InfiniteCardGrid
            cards={displayedItems}
            hasMore={hasMore}
            onLoadMore={loadMore}
            onCardClick={handleCardClick}
            totalCount={totalCount}
            scrollableTarget="cardSelectionScrollable"
            refreshTrigger={refreshTrigger}
            className="gap-6"
          />
        </ContentStates>
      </div>
    </BaseCardModal>
  )
}
