import { describe, expect, it } from 'vitest'
import { MAX_CHARACTERS } from '@/lib/multi-character-storage'

describe('character save limit and shortcuts', () => {
  it('sets the save limit to 15', () => {
    expect(MAX_CHARACTERS).toBe(15)
  })
})
