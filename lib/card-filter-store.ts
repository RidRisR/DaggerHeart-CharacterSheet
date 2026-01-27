"use client"

import { create } from 'zustand'
import { CardType } from '@/card/stores/unified-card-store'

/**
 * 卡牌筛选状态 Store
 *
 * 用于持久化 CardSelectionModal 的筛选状态
 * 解决组件卸载后状态丢失的问题
 */

interface CardFilterState {
  activeTab: string
  selectedBatches: string[]
  selectedClasses: string[]
  selectedLevels: string[]
  searchTerm: string
}

interface CardFilterStore extends CardFilterState {
  // === 状态更新 actions ===
  setActiveTab: (tab: string) => void
  setBatches: (batches: string[]) => void
  setClasses: (classes: string[]) => void
  setLevels: (levels: string[]) => void
  setSearchTerm: (term: string) => void
  resetAll: () => void

  // === 同步 initialTab ===
  // 当 initialTab 与当前 activeTab 不同时，重置到 initialTab
  syncWithInitialTab: (initialTab?: string) => void
}

export const useCardFilterStore = create<CardFilterStore>((set, get) => ({
  // === 初始状态 ===
  activeTab: CardType.Domain,
  selectedBatches: [],
  selectedClasses: [],
  selectedLevels: [],
  searchTerm: '',

  // === Tab 切换：重置所有筛选 ===
  setActiveTab: (tab) => set({
    activeTab: tab,
    selectedBatches: [],
    selectedClasses: [],
    selectedLevels: [],
    searchTerm: '',
  }),

  // === 卡包变更：重置类别和等级 ===
  setBatches: (batches) => set({
    selectedBatches: batches,
    selectedClasses: [],
    selectedLevels: [],
  }),

  // === 类别和等级变更：不影响其他筛选 ===
  setClasses: (classes) => set({ selectedClasses: classes }),
  setLevels: (levels) => set({ selectedLevels: levels }),

  // === 搜索词变更 ===
  setSearchTerm: (term) => set({ searchTerm: term }),

  // === 重置所有筛选（保留 activeTab）===
  resetAll: () => set({
    selectedBatches: [],
    selectedClasses: [],
    selectedLevels: [],
    searchTerm: '',
  }),

  // === 同步 initialTab ===
  // 处理不同入口点（card-deck、upgrade domain、upgrade subclass）
  syncWithInitialTab: (initialTab) => {
    if (initialTab && initialTab !== get().activeTab) {
      set({
        activeTab: initialTab,
        selectedBatches: [],
        selectedClasses: [],
        selectedLevels: [],
        searchTerm: '',
      })
    }
  },
}))
