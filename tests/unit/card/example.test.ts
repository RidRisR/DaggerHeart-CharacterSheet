import { describe, it, expect } from 'vitest'
import { createMockCard, createMockCards } from '../../utils/mocks'
import { CardType, CardSource } from '@/card'

describe('Card Utils', () => {
  it('should create a mock card with default values', () => {
    const card = createMockCard()
    expect(card.name).toBe('Test Card')
    expect(card.type).toBe('ancestry')
    expect(card.source).toBe('builtin')
  })

  it('should override card properties', () => {
    const card = createMockCard({ 
      name: 'Custom Card',
      type: CardType.Profession,
      source: CardSource.CUSTOM
    })
    expect(card.name).toBe('Custom Card')
    expect(card.type).toBe('profession')
    expect(card.source).toBe('custom')
  })

  it('should create multiple mock cards', () => {
    const cards = createMockCards(5, CardType.Subclass)
    expect(cards).toHaveLength(5)
    cards.forEach((card, index) => {
      expect(card.name).toBe(`Test Card ${index}`)
      expect(card.type).toBe('subclass')
    })
  })
})