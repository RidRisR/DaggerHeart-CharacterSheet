"use client"

import { useEffect, useMemo } from "react"
import { useUnifiedCardStore, CardType } from "@/card/stores/unified-card-store"
import { useCardFilterStore } from "@/lib/card-filter-store"
import type { ExtendedStandardCard } from "@/card/card-types"
import { isVariantType } from "@/card/card-types"

/**
 * 筛选状态
 */
interface FilterState {
  activeTab: string
  selectedBatches: string[]
  selectedClasses: string[]
  selectedLevels: string[]
  searchTerm: string
}

/**
 * 筛选操作
 */
interface FilterActions {
  setActiveTab: (tab: string) => void
  setBatches: (batches: string[]) => void
  setClasses: (classes: string[]) => void
  setLevels: (levels: string[]) => void
  setSearchTerm: (term: string) => void
  resetAll: () => void
}

/**
 * Hook 返回值
 */
interface UseCardFilteringReturn {
  // 筛选结果
  filteredCards: ExtendedStandardCard[]
  totalCount: number

  // 动态选项（基于当前筛选条件）
  classOptions: Array<{ value: string; label: string }>
  levelOptions: Array<{ value: string; label: string }>
  batchOptions: Array<{ id: string; name: string; cardCount: number }>

  // 状态和操作
  state: FilterState
  actions: FilterActions

  // 加载状态
  loading: boolean
  error: string | null
}

/**
 * 简化的卡牌筛选 Hook
 *
 * 设计原则：
 * 1. 使用 Zustand store 持久化状态 - 组件卸载后状态不丢失
 * 2. 智能联动内置 - Tab/卡包变更时自动重置相关筛选
 * 3. 管道式过滤 - 按顺序执行：类型 → 卡包 → 类别 → 等级 → 搜索
 * 4. 动态选项计算 - 从过滤后的卡牌中提取类别/等级选项
 * 5. 支持多入口 - 通过 syncWithInitialTab 处理不同入口的 initialTab
 */
export function useCardFiltering(initialTab?: string): UseCardFilteringReturn {
  const cardStore = useUnifiedCardStore()
  const filterStore = useCardFilterStore()

  // === 同步 initialTab ===
  // 当 initialTab 与当前 activeTab 不同时，重置到 initialTab
  // 这样可以支持不同入口（card-deck、upgrade domain、upgrade subclass）
  // 使用 getState() 获取稳定的函数引用，避免无限循环
  useEffect(() => {
    useCardFilterStore.getState().syncWithInitialTab(initialTab)
  }, [initialTab])

  // === 从 store 获取状态 ===
  const state: FilterState = {
    activeTab: filterStore.activeTab,
    selectedBatches: filterStore.selectedBatches,
    selectedClasses: filterStore.selectedClasses,
    selectedLevels: filterStore.selectedLevels,
    searchTerm: filterStore.searchTerm,
  }

  // === 从 store 获取操作 ===
  // Zustand actions 是稳定的，不需要在依赖数组中包含
  const actions: FilterActions = useMemo(() => ({
    setActiveTab: useCardFilterStore.getState().setActiveTab,
    setBatches: useCardFilterStore.getState().setBatches,
    setClasses: useCardFilterStore.getState().setClasses,
    setLevels: useCardFilterStore.getState().setLevels,
    setSearchTerm: useCardFilterStore.getState().setSearchTerm,
    resetAll: useCardFilterStore.getState().resetAll,
  }), [])

  // === 基础卡牌（按类型） ===
  const baseCards = useMemo(() => {
    if (!cardStore.initialized) return []

    const isVariant = isVariantType(state.activeTab)
    const targetType = isVariant ? CardType.Variant : (state.activeTab as CardType)
    const cards = cardStore.loadCardsByType(targetType)

    // 如果是变体类型，需要进一步筛选 realType
    if (isVariant) {
      return cards.filter(card =>
        card.variantSpecial?.realType === state.activeTab
      )
    }

    return cards
  }, [state.activeTab, cardStore.initialized, cardStore.loadCardsByType, cardStore.cards])

  // === 卡包过滤后的卡牌（用于计算选项） ===
  const batchFilteredCards = useMemo(() => {
    if (state.selectedBatches.length === 0) return baseCards
    const batchSet = new Set(state.selectedBatches)
    return baseCards.filter(c => c.batchId && batchSet.has(c.batchId))
  }, [baseCards, state.selectedBatches])

  // === 动态选项（从卡包过滤后的卡牌中提取） ===
  const { classOptions, levelOptions } = useMemo(() => {
    const classes = new Set<string>()
    const levels = new Set<string>()

    for (const card of batchFilteredCards) {
      if (card.class) classes.add(card.class)
      if (card.level != null) levels.add(String(card.level))
    }

    return {
      classOptions: Array.from(classes)
        .sort()
        .map(c => ({ value: c, label: c })),
      levelOptions: Array.from(levels)
        .sort((a, b) => Number(a) - Number(b))
        .map(l => ({ value: l, label: `${l}级` })),
    }
  }, [batchFilteredCards])

  // === 完整筛选（管道式） ===
  const filteredCards = useMemo(() => {
    let result = batchFilteredCards

    // Step 1: 类别筛选
    if (state.selectedClasses.length > 0) {
      const classSet = new Set(state.selectedClasses)
      result = result.filter(c => c.class && classSet.has(c.class))
    }

    // Step 2: 等级筛选
    if (state.selectedLevels.length > 0) {
      const levelSet = new Set(state.selectedLevels)
      result = result.filter(c => c.level != null && levelSet.has(String(c.level)))
    }

    // Step 3: 搜索筛选
    if (state.searchTerm) {
      const term = state.searchTerm.toLowerCase()
      result = result.filter(c =>
        c.name?.toLowerCase().includes(term) ||
        c.description?.toLowerCase().includes(term) ||
        c.cardSelectDisplay?.item1?.toLowerCase().includes(term) ||
        c.cardSelectDisplay?.item2?.toLowerCase().includes(term) ||
        c.cardSelectDisplay?.item3?.toLowerCase().includes(term)
      )
    }

    return result
  }, [batchFilteredCards, state.selectedClasses, state.selectedLevels, state.searchTerm])

  // === 卡包选项（静态，不依赖筛选） ===
  const batchOptions = useMemo(() => {
    // getAllBatches 返回的是扩展类型，包含 id 和 name
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
  }, [cardStore.batches])

  return {
    filteredCards,
    totalCount: filteredCards.length,
    classOptions,
    levelOptions,
    batchOptions,
    state,
    actions,
    loading: cardStore.loading,
    error: cardStore.error,
  }
}
