import { describe, it, expect } from 'vitest'
import type { AncestryCard } from '@/card/ancestry-card/convert'

// 提取分组逻辑为独立函数，便于测试
export function groupAncestryCards(cards: AncestryCard[]) {
  interface AncestryPair {
    card1: AncestryCard | null
    card2: AncestryCard | null
    index1: number
    index2: number
    种族: string
  }

  const pairs: AncestryPair[] = []
  const processedIndices = new Set<number>()

  cards.forEach((card, index) => {
    if (processedIndices.has(index)) return

    // 找配对的卡片
    const pairedIndex = cards.findIndex((c, i) =>
      i !== index &&
      !processedIndices.has(i) &&
      c.种族 === card.种族 &&
      c.简介 === card.简介 &&
      c.类别 !== card.类别
    )

    if (pairedIndex !== -1) {
      // 找到配对
      processedIndices.add(index)
      processedIndices.add(pairedIndex)

      const card1 = card.类别 === 1 ? card : cards[pairedIndex]
      const card2 = card.类别 === 2 ? card : cards[pairedIndex]
      const index1 = card.类别 === 1 ? index : pairedIndex
      const index2 = card.类别 === 2 ? index : pairedIndex

      pairs.push({
        card1,
        card2,
        index1,
        index2,
        种族: card.种族 || '未命名种族'
      })
    } else {
      // 未找到配对，创建不完整配对
      processedIndices.add(index)
      pairs.push({
        card1: card.类别 === 1 ? card : null,
        card2: card.类别 === 2 ? card : null,
        index1: card.类别 === 1 ? index : -1,
        index2: card.类别 === 2 ? index : -1,
        种族: card.种族 || '未命名种族'
      })
    }
  })

  return pairs
}

// 创建测试用的种族卡
function createTestAncestryCard(
  name: string,
  race: string,
  intro: string,
  category: 1 | 2,
  effect: string = ''
): AncestryCard {
  return {
    id: `test-${name}`,
    名称: name,
    种族: race,
    简介: intro,
    类别: category,
    效果: effect
  } as AncestryCard
}

describe('种族卡分组逻辑', () => {
  it('应该正确分组完整的单个配对', () => {
    const cards = [
      createTestAncestryCard('精灵能力1', '精灵', '森林的孩子', 1, '敏捷+1'),
      createTestAncestryCard('精灵能力2', '精灵', '森林的孩子', 2, '魔法抗性'),
    ]

    const result = groupAncestryCards(cards)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      种族: '精灵',
      index1: 0,
      index2: 1
    })
    expect(result[0].card1?.名称).toBe('精灵能力1')
    expect(result[0].card1?.类别).toBe(1)
    expect(result[0].card2?.名称).toBe('精灵能力2')
    expect(result[0].card2?.类别).toBe(2)
  })

  it('应该正确分组两个完整的配对', () => {
    const cards = [
      createTestAncestryCard('精灵能力1', '精灵', '森林的孩子', 1),
      createTestAncestryCard('精灵能力2', '精灵', '森林的孩子', 2),
      createTestAncestryCard('矮人能力1', '矮人', '山脉的守护者', 1),
      createTestAncestryCard('矮人能力2', '矮人', '山脉的守护者', 2),
    ]

    const result = groupAncestryCards(cards)

    expect(result).toHaveLength(2)

    // 第一组：精灵
    const elfPair = result.find(p => p.种族 === '精灵')
    expect(elfPair).toBeDefined()
    expect(elfPair?.card1?.类别).toBe(1)
    expect(elfPair?.card2?.类别).toBe(2)

    // 第二组：矮人
    const dwarfPair = result.find(p => p.种族 === '矮人')
    expect(dwarfPair).toBeDefined()
    expect(dwarfPair?.card1?.类别).toBe(1)
    expect(dwarfPair?.card2?.类别).toBe(2)
  })

  it('应该处理不完整的配对（只有类别1）', () => {
    const cards = [
      createTestAncestryCard('精灵能力1', '精灵', '森林的孩子', 1),
    ]

    const result = groupAncestryCards(cards)

    expect(result).toHaveLength(1)
    expect(result[0].card1?.名称).toBe('精灵能力1')
    expect(result[0].card2).toBeNull()
    expect(result[0].index1).toBe(0)
    expect(result[0].index2).toBe(-1)
  })

  it('应该处理不完整的配对（只有类别2）', () => {
    const cards = [
      createTestAncestryCard('精灵能力2', '精灵', '森林的孩子', 2),
    ]

    const result = groupAncestryCards(cards)

    expect(result).toHaveLength(1)
    expect(result[0].card1).toBeNull()
    expect(result[0].card2?.名称).toBe('精灵能力2')
    expect(result[0].index1).toBe(-1)
    expect(result[0].index2).toBe(0)
  })

  it('应该正确处理混合顺序的卡片', () => {
    const cards = [
      createTestAncestryCard('矮人能力2', '矮人', '山脉的守护者', 2), // 类别2在前
      createTestAncestryCard('精灵能力1', '精灵', '森林的孩子', 1),
      createTestAncestryCard('矮人能力1', '矮人', '山脉的守护者', 1), // 类别1在后
      createTestAncestryCard('精灵能力2', '精灵', '森林的孩子', 2),
    ]

    const result = groupAncestryCards(cards)

    expect(result).toHaveLength(2)

    // 矮人配对（从索引0开始处理）
    const dwarfPair = result.find(p => p.种族 === '矮人')
    expect(dwarfPair).toBeDefined()
    expect(dwarfPair?.index1).toBe(2) // 矮人能力1的索引
    expect(dwarfPair?.index2).toBe(0) // 矮人能力2的索引

    // 精灵配对
    const elfPair = result.find(p => p.种族 === '精灵')
    expect(elfPair).toBeDefined()
    expect(elfPair?.index1).toBe(1) // 精灵能力1的索引
    expect(elfPair?.index2).toBe(3) // 精灵能力2的索引
  })

  it('应该区分相同种族但不同简介的配对', () => {
    const cards = [
      createTestAncestryCard('高等精灵1', '精灵', '高贵血统', 1),
      createTestAncestryCard('高等精灵2', '精灵', '高贵血统', 2),
      createTestAncestryCard('森林精灵1', '精灵', '自然之子', 1),
      createTestAncestryCard('森林精灵2', '精灵', '自然之子', 2),
    ]

    const result = groupAncestryCards(cards)

    expect(result).toHaveLength(2)

    // 应该根据简介区分不同的精灵亚种
    const noblePair = result.find(p =>
      p.card1?.简介 === '高贵血统' || p.card2?.简介 === '高贵血统'
    )
    const naturePair = result.find(p =>
      p.card1?.简介 === '自然之子' || p.card2?.简介 === '自然之子'
    )

    expect(noblePair).toBeDefined()
    expect(naturePair).toBeDefined()
    expect(noblePair?.种族).toBe('精灵')
    expect(naturePair?.种族).toBe('精灵')
  })

  it('应该处理空卡片数组', () => {
    const result = groupAncestryCards([])
    expect(result).toHaveLength(0)
  })

  it('应该处理重复的类别1卡片（边界情况）', () => {
    const cards = [
      createTestAncestryCard('精灵能力1A', '精灵', '森林的孩子', 1),
      createTestAncestryCard('精灵能力1B', '精灵', '森林的孩子', 1), // 重复的类别1
      createTestAncestryCard('精灵能力2', '精灵', '森林的孩子', 2),
    ]

    const result = groupAncestryCards(cards)

    // 应该有两个配对：
    // 1. 第一个类别1 + 类别2
    // 2. 第二个类别1（不完整）
    expect(result).toHaveLength(2)

    const completePair = result.find(p => p.card1 && p.card2)
    const incompletePair = result.find(p => p.card1 && !p.card2)

    expect(completePair).toBeDefined()
    expect(incompletePair).toBeDefined()
    expect(completePair?.card1?.名称).toBe('精灵能力1A')
    expect(completePair?.card2?.名称).toBe('精灵能力2')
    expect(incompletePair?.card1?.名称).toBe('精灵能力1B')
  })

  it('应该处理重复的类别2卡片（边界情况）', () => {
    const cards = [
      createTestAncestryCard('精灵能力1', '精灵', '森林的孩子', 1),
      createTestAncestryCard('精灵能力2A', '精灵', '森林的孩子', 2),
      createTestAncestryCard('精灵能力2B', '精灵', '森林的孩子', 2), // 重复的类别2
    ]

    const result = groupAncestryCards(cards)

    expect(result).toHaveLength(2)

    const completePair = result.find(p => p.card1 && p.card2)
    const incompletePair = result.find(p => !p.card1 && p.card2)

    expect(completePair).toBeDefined()
    expect(incompletePair).toBeDefined()
    expect(completePair?.card1?.名称).toBe('精灵能力1')
    expect(completePair?.card2?.名称).toBe('精灵能力2A')
    expect(incompletePair?.card2?.名称).toBe('精灵能力2B')
  })

  it('应该正确处理默认的空字段值', () => {
    const cards = [
      createTestAncestryCard('默认1', '', '', 1), // 空的种族和简介
      createTestAncestryCard('默认2', '', '', 2),
    ]

    const result = groupAncestryCards(cards)

    expect(result).toHaveLength(1)
    expect(result[0].种族).toBe('未命名种族') // 应该使用默认值
    expect(result[0].card1?.名称).toBe('默认1')
    expect(result[0].card2?.名称).toBe('默认2')
  })

  it('应该处理分组条件严格匹配', () => {
    const cards = [
      createTestAncestryCard('精灵1', '精灵', '森林', 1),
      createTestAncestryCard('精灵2', '精灵', '森林王子', 2), // 简介不匹配
      createTestAncestryCard('高精灵1', '高等精灵', '森林', 1), // 种族不匹配
      createTestAncestryCard('精灵3', '精灵', '森林', 2), // 正确匹配
    ]

    const result = groupAncestryCards(cards)

    expect(result).toHaveLength(3) // 三个不完整配对

    // 应该找到正确的配对
    const correctPair = result.find(p => p.card1 && p.card2)
    expect(correctPair).toBeDefined()
    expect(correctPair?.card1?.名称).toBe('精灵1')
    expect(correctPair?.card2?.名称).toBe('精灵3')

    // 其他应该是不完整配对
    const incompletePairs = result.filter(p => !p.card1 || !p.card2)
    expect(incompletePairs).toHaveLength(2)
  })
})