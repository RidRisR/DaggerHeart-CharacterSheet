import { describe, expect, it } from 'vitest'
import builtin from '@/data/cards/builtin-base.json'
import { CardSource } from '@/card/card-types'
import { loadBuiltinCardRuntimeSource } from '@/card/runtime/builtin-source-adapter'
import { readBuiltinBeastForms } from '../read-model'
import { buildBeastFormPages } from '@/components/beast-forms/page-layout'

describe('built-in beast form reference', () => {
  it('projects every rule without losing text and covers every form exactly once in order', async () => {
    const source = await loadBuiltinCardRuntimeSource({ disabledSourceIds: [] })
    const forms = readBuiltinBeastForms(source.cards)
    const pages = buildBeastFormPages(forms)
    expect(pages.map(page => [page.tier, page.forms.length])).toEqual([[1, 6], [2, 6], [3, 6], [4, 6]])
    expect(pages.flatMap(page => page.forms.map(form => form.id))).toEqual(builtin.variant.map(card => card.id))
    for (const form of forms) {
      const raw = builtin.variant.find(card => card.id === form.id)!
      const stats = form.attributes === undefined ? [] : [
        `***角色属性***： ${form.attributes}`,
        `***攻击掷骰***： ${form.attack}`,
        `***获得优势***： ${form.advantages}`,
      ]
      const reconstructed = [form.examples, ...stats, form.traits].join('\n')
      expect(reconstructed.replace(/\s/g, '')).toBe(raw.效果.replace(/\s/g, ''))
    }
    expect(forms.find(form => form.name === '传奇野兽')?.attributes).toBeUndefined()
  })

  it('does not mix custom forms or other card types into the built-in reference', async () => {
    const { cards } = await loadBuiltinCardRuntimeSource({ disabledSourceIds: [] })
    const custom = cards.filter(card => card.variantSpecial?.realType === '野兽形态')
      .map(card => ({ ...card, id: `custom-${card.id}`, source: CardSource.CUSTOM, batchId: 'custom' }))
    expect(readBuiltinBeastForms([...cards, ...custom])).toHaveLength(24)
  })

  it('rejects missing, duplicate, wrongly tiered or newly unpaginated forms', async () => {
    const { cards } = await loadBuiltinCardRuntimeSource({ disabledSourceIds: [] })
    const forms = readBuiltinBeastForms(cards)
    expect(() => buildBeastFormPages(forms.slice(1))).toThrow(/pagination/)
    expect(() => buildBeastFormPages([...forms, forms[0]])).toThrow(/pagination/)
    expect(() => buildBeastFormPages([{ ...forms[0], tier: 4 }, ...forms.slice(1)])).toThrow(/pagination/)
    expect(() => buildBeastFormPages([...forms, { ...forms[0], id: 'new-form' }])).toThrow(/pagination/)
  })

  it('rejects malformed authored content instead of silently discarding fields', async () => {
    const { cards } = await loadBuiltinCardRuntimeSource({ disabledSourceIds: [] })
    const form = cards.find(card => card.variantSpecial?.realType === '野兽形态')!
    expect(() => readBuiltinBeastForms([{ ...form, description: 'broken' }])).toThrow(/Invalid built-in/)
    expect(() => readBuiltinBeastForms([{ ...form, description: form.description!.replace('***攻击掷骰***', '***攻击***') }])).toThrow(/Invalid built-in/)
    expect(() => readBuiltinBeastForms([form, form])).toThrow(/Invalid built-in/)
  })
})
