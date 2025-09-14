import { describe, it, expect } from 'vitest'
import type { SubClassCard as SubclassCard } from '@/card/subclass-card/convert'

// 提取分组逻辑为独立函数，便于测试
export function groupSubclassCards(cards: SubclassCard[]) {
  interface SubclassTriple {
    card1: SubclassCard | null  // 基石
    card2: SubclassCard | null  // 专精
    card3: SubclassCard | null  // 大师
    index1: number
    index2: number
    index3: number
    子职业: string
    主职: string
  }

  const triples: SubclassTriple[] = []
  const processedIndices = new Set<number>()

  cards.forEach((card, index) => {
    if (processedIndices.has(index)) return

    // 只从基石卡开始组建三卡组，仿照种族卡从类别1开始
    if (card.等级 !== '基石') return

    // 寻找对应的专精卡和大师卡
    const 专精Index = cards.findIndex((c, i) =>
      i !== index &&
      !processedIndices.has(i) &&
      c.子职业 === card.子职业 &&
      c.主职 === card.主职 &&
      c.等级 === '专精'
    )

    const 大师Index = cards.findIndex((c, i) =>
      i !== index &&
      !processedIndices.has(i) &&
      c.子职业 === card.子职业 &&
      c.主职 === card.主职 &&
      c.等级 === '大师'
    )

    // 标记已处理的卡片
    processedIndices.add(index)
    if (专精Index !== -1) processedIndices.add(专精Index)
    if (大师Index !== -1) processedIndices.add(大师Index)

    // 创建三卡组（即使不完整也创建）
    const triple = {
      card1: card,
      card2: 专精Index !== -1 ? cards[专精Index] : null,
      card3: 大师Index !== -1 ? cards[大师Index] : null,
      index1: index,
      index2: 专精Index !== -1 ? 专精Index : -1,
      index3: 大师Index !== -1 ? 大师Index : -1,
      子职业: card.子职业 || '未命名子职业',
      主职: card.主职 || '未指定主职'
    }

    triples.push(triple)
  })

  return triples
}

// 创建测试用的子职业卡
function createTestSubclassCard(
  name: string,
  subclass: string,
  mainProf: string,
  level: '基石' | '专精' | '大师'
): SubclassCard {
  return {
    id: `test-${name}`,
    名称: name,
    子职业: subclass,
    主职: mainProf,
    等级: level,
    施法: '',
    描述: ''
  } as SubclassCard
}

describe('子职业卡分组逻辑', () => {
  it('应该正确分组完整的单个三卡组', () => {
    const cards = [
      createTestSubclassCard('战士基石', '战士', '战斗', '基石'),
      createTestSubclassCard('战士专精', '战士', '战斗', '专精'),
      createTestSubclassCard('战士大师', '战士', '战斗', '大师'),
    ]

    const result = groupSubclassCards(cards)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      子职业: '战士',
      主职: '战斗',
      index1: 0,
      index2: 1,
      index3: 2
    })
    expect(result[0].card1?.名称).toBe('战士基石')
    expect(result[0].card2?.名称).toBe('战士专精')
    expect(result[0].card3?.名称).toBe('战士大师')
  })

  it('应该正确分组两个完整的三卡组', () => {
    const cards = [
      createTestSubclassCard('战士基石', '战士', '战斗', '基石'),
      createTestSubclassCard('战士专精', '战士', '战斗', '专精'),
      createTestSubclassCard('战士大师', '战士', '战斗', '大师'),
      createTestSubclassCard('法师基石', '法师', '魔法', '基石'),
      createTestSubclassCard('法师专精', '法师', '魔法', '专精'),
      createTestSubclassCard('法师大师', '法师', '魔法', '大师'),
    ]

    const result = groupSubclassCards(cards)

    expect(result).toHaveLength(2)

    // 第一组：战士
    expect(result[0].子职业).toBe('战士')
    expect(result[0].主职).toBe('战斗')
    expect(result[0].card1?.名称).toBe('战士基石')
    expect(result[0].card2?.名称).toBe('战士专精')
    expect(result[0].card3?.名称).toBe('战士大师')

    // 第二组：法师
    expect(result[1].子职业).toBe('法师')
    expect(result[1].主职).toBe('魔法')
    expect(result[1].card1?.名称).toBe('法师基石')
    expect(result[1].card2?.名称).toBe('法师专精')
    expect(result[1].card3?.名称).toBe('法师大师')
  })

  it('应该处理不完整的三卡组（缺少专精）', () => {
    const cards = [
      createTestSubclassCard('战士基石', '战士', '战斗', '基石'),
      createTestSubclassCard('战士大师', '战士', '战斗', '大师'),
    ]

    const result = groupSubclassCards(cards)

    expect(result).toHaveLength(1)
    expect(result[0].card1?.名称).toBe('战士基石')
    expect(result[0].card2).toBeNull() // 缺少专精
    expect(result[0].card3?.名称).toBe('战士大师')
    expect(result[0].index2).toBe(-1) // 缺少专精的索引
  })

  it('应该处理不完整的三卡组（只有基石）', () => {
    const cards = [
      createTestSubclassCard('战士基石', '战士', '战斗', '基石'),
    ]

    const result = groupSubclassCards(cards)

    expect(result).toHaveLength(1)
    expect(result[0].card1?.名称).toBe('战士基石')
    expect(result[0].card2).toBeNull()
    expect(result[0].card3).toBeNull()
    expect(result[0].index2).toBe(-1)
    expect(result[0].index3).toBe(-1)
  })

  it('应该忽略没有基石的卡片组', () => {
    const cards = [
      createTestSubclassCard('战士专精', '战士', '战斗', '专精'),
      createTestSubclassCard('战士大师', '战士', '战斗', '大师'),
    ]

    const result = groupSubclassCards(cards)

    expect(result).toHaveLength(0) // 没有基石，不创建三卡组
  })

  it('应该正确处理混合顺序的卡片', () => {
    const cards = [
      createTestSubclassCard('法师专精', '法师', '魔法', '专精'), // 不是基石，应该被跳过
      createTestSubclassCard('战士基石', '战士', '战斗', '基石'),
      createTestSubclassCard('法师大师', '法师', '魔法', '大师'),
      createTestSubclassCard('战士大师', '战士', '战斗', '大师'),
      createTestSubclassCard('法师基石', '法师', '魔法', '基石'),
      createTestSubclassCard('战士专精', '战士', '战斗', '专精'),
    ]

    const result = groupSubclassCards(cards)

    expect(result).toHaveLength(2)

    // 第一组：战士（基石在索引1）
    expect(result[0].子职业).toBe('战士')
    expect(result[0].index1).toBe(1) // 战士基石的索引
    expect(result[0].index2).toBe(5) // 战士专精的索引
    expect(result[0].index3).toBe(3) // 战士大师的索引

    // 第二组：法师（基石在索引4）
    expect(result[1].子职业).toBe('法师')
    expect(result[1].index1).toBe(4) // 法师基石的索引
    expect(result[1].index2).toBe(0) // 法师专精的索引
    expect(result[1].index3).toBe(2) // 法师大师的索引
  })

  it('应该区分相同名称但不同主职的子职业', () => {
    const cards = [
      createTestSubclassCard('元素师基石', '元素师', '火系', '基石'),
      createTestSubclassCard('元素师专精', '元素师', '火系', '专精'),
      createTestSubclassCard('元素师大师', '元素师', '火系', '大师'),
      createTestSubclassCard('元素师基石', '元素师', '水系', '基石'), // 同名但不同主职
      createTestSubclassCard('元素师专精', '元素师', '水系', '专精'),
      createTestSubclassCard('元素师大师', '元素师', '水系', '大师'),
    ]

    const result = groupSubclassCards(cards)

    expect(result).toHaveLength(2)

    // 两组应该分别按主职分组
    const fireGroup = result.find(g => g.主职 === '火系')
    const waterGroup = result.find(g => g.主职 === '水系')

    expect(fireGroup).toBeDefined()
    expect(waterGroup).toBeDefined()
    expect(fireGroup?.子职业).toBe('元素师')
    expect(waterGroup?.子职业).toBe('元素师')
  })

  it('应该处理空卡片数组', () => {
    const result = groupSubclassCards([])
    expect(result).toHaveLength(0)
  })

  it('应该处理重复的基石卡片（边界情况）', () => {
    const cards = [
      createTestSubclassCard('战士基石1', '战士', '战斗', '基石'),
      createTestSubclassCard('战士基石2', '战士', '战斗', '基石'), // 重复的基石
      createTestSubclassCard('战士专精', '战士', '战斗', '专精'),
      createTestSubclassCard('战士大师', '战士', '战斗', '大师'),
    ]

    const result = groupSubclassCards(cards)

    // 应该有两个三卡组：
    // 1. 第一个基石 + 专精 + 大师
    // 2. 第二个基石（不完整）
    expect(result).toHaveLength(2)
    expect(result[0].card1?.名称).toBe('战士基石1')
    expect(result[0].card2?.名称).toBe('战士专精')
    expect(result[0].card3?.名称).toBe('战士大师')
    expect(result[1].card1?.名称).toBe('战士基石2')
    expect(result[1].card2).toBeNull() // 专精已被第一组占用
    expect(result[1].card3).toBeNull() // 大师已被第一组占用
  })
})