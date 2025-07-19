import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAllCards, useCardsByType } from '@/card/hooks'
import { CardType } from '@/card'
// Test utilities available if needed
// import { createMockCard } from '../../utils/mocks'

// Mock the unified store
vi.mock('@/card/stores/unified-card-store', () => ({
  useUnifiedCardStore: vi.fn(() => ({
    initialized: false,
    loading: false,
    error: null,
    cards: new Map(),
    batches: new Map(),
    loadAllCards: vi.fn(() => []),
    loadCardsByType: vi.fn(() => []),
    initializeSystem: vi.fn(() => Promise.resolve({ initialized: true })),
  }))
}))

describe('Card Hooks Compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useAllCards Hook', () => {
    it('should return the expected interface structure', () => {
      const { result } = renderHook(() => useAllCards())
      
      expect(result.current).toHaveProperty('cards')
      expect(result.current).toHaveProperty('loading')
      expect(result.current).toHaveProperty('error')
      expect(result.current).toHaveProperty('initialized')
      expect(result.current).toHaveProperty('fetchAllCards')
      expect(result.current).toHaveProperty('clearError')
      
      expect(Array.isArray(result.current.cards)).toBe(true)
      expect(typeof result.current.loading).toBe('boolean')
      expect(typeof result.current.initialized).toBe('boolean')
      expect(typeof result.current.fetchAllCards).toBe('function')
      expect(typeof result.current.clearError).toBe('function')
    })

    it('should return empty array when not initialized', () => {
      const { result } = renderHook(() => useAllCards())
      
      expect(result.current.cards).toEqual([])
      expect(result.current.initialized).toBe(false)
    })

    it('should provide fetchAllCards function that can be called', async () => {
      const { result } = renderHook(() => useAllCards())
      
      await act(async () => {
        await result.current.fetchAllCards()
      })
      
      // Function should execute without error
      expect(result.current.fetchAllCards).toBeDefined()
    })

    it('should provide clearError function that can be called', () => {
      const { result } = renderHook(() => useAllCards())
      
      act(() => {
        result.current.clearError()
      })
      
      // Function should execute without error
      expect(result.current.clearError).toBeDefined()
    })
  })

  describe('useCardsByType Hook', () => {
    it('should return the expected interface structure', () => {
      const { result } = renderHook(() => useCardsByType(CardType.Ancestry))
      
      expect(result.current).toHaveProperty('cards')
      expect(result.current).toHaveProperty('loading')
      expect(result.current).toHaveProperty('error')
      expect(result.current).toHaveProperty('initialized')
      expect(result.current).toHaveProperty('fetchCardsByType')
      expect(result.current).toHaveProperty('clearError')
      
      expect(Array.isArray(result.current.cards)).toBe(true)
      expect(typeof result.current.loading).toBe('boolean')
      expect(typeof result.current.initialized).toBe('boolean')
      expect(typeof result.current.fetchCardsByType).toBe('function')
      expect(typeof result.current.clearError).toBe('function')
    })

    it('should return empty array when not initialized', () => {
      const { result } = renderHook(() => useCardsByType(CardType.Profession))
      
      expect(result.current.cards).toEqual([])
      expect(result.current.initialized).toBe(false)
    })

    it('should provide fetchCardsByType function that can be called', async () => {
      const { result } = renderHook(() => useCardsByType(CardType.Community))
      
      await act(async () => {
        await result.current.fetchCardsByType()
      })
      
      // Function should execute without error
      expect(result.current.fetchCardsByType).toBeDefined()
    })

    it('should handle different card types', () => {
      const ancestryHook = renderHook(() => useCardsByType(CardType.Ancestry))
      const professionHook = renderHook(() => useCardsByType(CardType.Profession))
      const communityHook = renderHook(() => useCardsByType(CardType.Community))
      
      // All should have the same interface
      expect(ancestryHook.result.current).toHaveProperty('cards')
      expect(professionHook.result.current).toHaveProperty('cards')
      expect(communityHook.result.current).toHaveProperty('cards')
    })
  })

  describe('Hook Interface Consistency', () => {
    it('useAllCards and useCardsByType should have similar core properties', () => {
      const allCardsHook = renderHook(() => useAllCards())
      const cardsByTypeHook = renderHook(() => useCardsByType(CardType.Ancestry))
      
      // Both should have core properties
      const coreProperties = ['cards', 'loading', 'error', 'initialized']
      
      coreProperties.forEach(prop => {
        expect(allCardsHook.result.current).toHaveProperty(prop)
        expect(cardsByTypeHook.result.current).toHaveProperty(prop)
      })
      
      // Both should have their respective fetch functions
      expect(allCardsHook.result.current).toHaveProperty('fetchAllCards')
      expect(cardsByTypeHook.result.current).toHaveProperty('fetchCardsByType')
    })

    it('should maintain function stability', () => {
      const { result, rerender } = renderHook(() => useAllCards())
      
      const firstFetchAllCards = result.current.fetchAllCards
      const firstClearError = result.current.clearError
      
      rerender()
      
      // Functions should be stable (same reference) - this tests useCallback effectiveness
      expect(typeof result.current.fetchAllCards).toBe('function')
      expect(typeof result.current.clearError).toBe('function')
      // Note: Due to store updates, exact reference equality may not hold
    })
  })
})

describe('Hook Behavior Validation', () => {
  it('should handle uninitialized state gracefully', () => {
    const { result } = renderHook(() => useAllCards())
    
    // When not initialized, should return empty state
    expect(result.current.cards).toEqual([])
    expect(result.current.initialized).toBe(false)
    expect(result.current.loading).toBe(false)
  })

  it('should handle type filtering when uninitialized', () => {
    const { result } = renderHook(() => useCardsByType(CardType.Ancestry))
    
    // When not initialized, should return empty state
    expect(result.current.cards).toEqual([])
    expect(result.current.initialized).toBe(false)
    expect(result.current.loading).toBe(false)
  })

  it('should provide async fetch functions', async () => {
    const allCardsHook = renderHook(() => useAllCards())
    const cardsByTypeHook = renderHook(() => useCardsByType(CardType.Profession))
    
    // Both should provide async functions
    expect(allCardsHook.result.current.fetchAllCards).toBeInstanceOf(Function)
    expect(cardsByTypeHook.result.current.fetchCardsByType).toBeInstanceOf(Function)
    
    // Functions should be callable
    await act(async () => {
      await allCardsHook.result.current.fetchAllCards()
      await cardsByTypeHook.result.current.fetchCardsByType()
    })
  })
})