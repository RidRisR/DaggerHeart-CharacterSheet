import { vi } from 'vitest'
import { CardType, CardSource } from '@/card'
import type { ExtendedStandardCard } from '@/card'

// Mock card 数据生成器
export function createMockCard(overrides?: Partial<ExtendedStandardCard>): ExtendedStandardCard {
  const baseCard: ExtendedStandardCard = {
    standarized: true,
    id: `card-${Math.random()}`,
    name: 'Test Card',
    type: CardType.Ancestry,
    class: 'test-class',
    description: 'Test description',
    source: CardSource.BUILTIN,
    cardSelectDisplay: {},
  }
  
  return {
    ...baseCard,
    ...overrides,
  }
}

// Mock 批量生成卡片
export function createMockCards(count: number, type?: CardType): ExtendedStandardCard[] {
  return Array.from({ length: count }, (_, i) => 
    createMockCard({
      id: `card-${i}`,
      name: `Test Card ${i}`,
      type: type || CardType.Ancestry,
    })
  )
}

// Mock Zustand store
export function createMockStore(initialState = {}) {
  const store = {
    getState: vi.fn(() => initialState),
    setState: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
    destroy: vi.fn(),
  }
  return store
}

// Mock 异步操作
export function mockAsyncOperation<T>(data: T, delay = 0) {
  return vi.fn(() => 
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(data), delay)
    })
  )
}

// Mock localStorage 数据
export function mockLocalStorageData() {
  return {
    'unified-card-storage': JSON.stringify({
      state: {
        config: {
          enableDebug: false,
          maxBatchSize: 1000,
          maxTotalCards: 10000,
        }
      }
    }),
    'custom_cards_index': JSON.stringify({
      batches: {},
      totalCards: 0,
      totalBatches: 0,
      lastUpdate: new Date().toISOString()
    })
  }
}

// Mock import data
export function createMockImportData() {
  return {
    cards: [
      {
        name: 'Imported Card 1',
        type: CardType.Ancestry,
        description: 'Imported card description',
      },
      {
        name: 'Imported Card 2',
        type: CardType.Ancestry,
        description: 'Another imported card',
      }
    ]
  }
}