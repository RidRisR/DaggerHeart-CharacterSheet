import { describe, expect, it } from 'vitest'
import { validateProfessionCard, type ValidationContext } from '@/card/type-validators'

const context: ValidationContext = {
  customFields: {
    professions: ['零闪避职业'],
    domains: ['领域一', '领域二'],
    ancestries: [],
    communities: [],
    variants: [],
  },
  variantTypes: {},
}

describe('validateProfessionCard', () => {
  it('allows profession starting evasion to be zero', () => {
    const result = validateProfessionCard(
      {
        id: 'zero-evasion-profession',
        名称: '零闪避职业',
        简介: '测试职业',
        领域1: '领域一',
        领域2: '领域二',
        起始生命: 6,
        起始闪避: 0,
        起始物品: '测试物品',
        希望特性: '测试希望特性',
        职业特性: '测试职业特性',
      },
      0,
      undefined,
      context
    )

    expect(result.errors).not.toContainEqual(
      expect.objectContaining({ path: 'profession[0].起始闪避' })
    )
    expect(result.isValid).toBe(true)
  })
})
