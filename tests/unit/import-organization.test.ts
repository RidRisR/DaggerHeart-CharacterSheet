import { describe, it, expect } from 'vitest'
import type { AncestryCard } from '@/card/ancestry-card/convert'
import type { SubClassCard } from '@/card/subclass-card/convert'
import type { CardPackageState } from '@/app/card-editor/types'

// 导入需要测试的实际函数
import {
  ensureAncestryPairs,
  ensureSubclassTriples
} from '@/app/card-editor/utils/import-export'

// 测试用的包数据
const mockPackageData: CardPackageState = {
  name: '测试卡包',
  author: '测试作者',
  description: '用于测试的卡包',
  profession: [],
  ancestry: [],
  community: [],
  subclass: [],
  domain: [],
  variant: [],
  customFieldDefinitions: {},
  isModified: false,
  lastSaved: new Date()
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

// 创建测试用的子职业卡
function createTestSubclassCard(
  name: string,
  subclass: string,
  mainProf: string,
  level: '基石' | '专精' | '大师',
  casting: string = '',
  description: string = ''
): SubClassCard {
  return {
    id: `test-${name}`,
    名称: name,
    子职业: subclass,
    主职: mainProf,
    等级: level,
    施法: casting,
    描述: description
  } as SubClassCard
}

describe('导入整理功能测试', () => {
  describe('种族卡配对补全功能', () => {
    it('应该保持完整配对不变', () => {
      const cards = [
        createTestAncestryCard('精灵能力1', '精灵', '森林的孩子', 1, '敏捷+1'),
        createTestAncestryCard('精灵能力2', '精灵', '森林的孩子', 2, '魔法抗性'),
      ]

      const result = ensureAncestryPairs(cards, mockPackageData)

      expect(result).toHaveLength(2)
      expect(result[0].名称).toBe('精灵能力1')
      expect(result[1].名称).toBe('精灵能力2')
      expect(result[0].类别).toBe(1)
      expect(result[1].类别).toBe(2)
    })

    it('应该为孤立的类别1卡片创建类别2配对', () => {
      const cards = [
        createTestAncestryCard('精灵能力1', '精灵', '森林的孩子', 1, '敏捷+1')
      ]

      const result = ensureAncestryPairs(cards, mockPackageData)

      expect(result).toHaveLength(2)
      expect(result[0].名称).toBe('精灵能力1')
      expect(result[0].类别).toBe(1)
      expect(result[1].类别).toBe(2)
      expect(result[1].种族).toBe('精灵')
      expect(result[1].简介).toBe('森林的孩子')
      expect(result[1].名称).toBe('精灵能力2')
    })

    it('应该为孤立的类别2卡片创建类别1配对', () => {
      const cards = [
        createTestAncestryCard('精灵能力2', '精灵', '森林的孩子', 2, '魔法抗性')
      ]

      const result = ensureAncestryPairs(cards, mockPackageData)

      expect(result).toHaveLength(2)
      expect(result[0].类别).toBe(1)
      expect(result[1].名称).toBe('精灵能力2')
      expect(result[1].类别).toBe(2)
      expect(result[0].种族).toBe('精灵')
      expect(result[0].简介).toBe('森林的孩子')
      expect(result[0].名称).toBe('精灵能力1')
    })

    it('应该处理多个不完整的种族组', () => {
      const cards = [
        createTestAncestryCard('精灵能力1', '精灵', '森林的孩子', 1),
        createTestAncestryCard('矮人能力2', '矮人', '山脉守护者', 2),
        createTestAncestryCard('人类能力1', '人类', '多才多艺', 1),
        createTestAncestryCard('人类能力2', '人类', '多才多艺', 2)
      ]

      const result = ensureAncestryPairs(cards, mockPackageData)

      expect(result).toHaveLength(6) // 3组 × 2卡

      // 精灵组：原有类别1 + 自动创建类别2
      const elfCards = result.filter(c => c.种族 === '精灵')
      expect(elfCards).toHaveLength(2)
      expect(elfCards.some(c => c.类别 === 1)).toBe(true)
      expect(elfCards.some(c => c.类别 === 2)).toBe(true)

      // 矮人组：自动创建类别1 + 原有类别2
      const dwarfCards = result.filter(c => c.种族 === '矮人')
      expect(dwarfCards).toHaveLength(2)
      expect(dwarfCards.some(c => c.类别 === 1)).toBe(true)
      expect(dwarfCards.some(c => c.类别 === 2)).toBe(true)

      // 人类组：原有完整配对
      const humanCards = result.filter(c => c.种族 === '人类')
      expect(humanCards).toHaveLength(2)
      expect(humanCards.some(c => c.类别 === 1)).toBe(true)
      expect(humanCards.some(c => c.类别 === 2)).toBe(true)
    })

    it('应该修复简介不一致问题', () => {
      const cards = [
        createTestAncestryCard('精灵能力1', '精灵', '森林的孩子', 1),
        createTestAncestryCard('精灵能力2', '精灵', '不一致的简介', 2)
      ]

      const result = ensureAncestryPairs(cards, mockPackageData)

      // 由于简介不一致，会被分成两个不同的组，每组都会补全缺失的配对
      expect(result).toHaveLength(4) // 两组，每组2张卡

      // 找到原始卡片对应的组
      const group1Cards = result.filter(c => c.简介 === '森林的孩子')
      const group2Cards = result.filter(c => c.简介 === '不一致的简介')

      expect(group1Cards).toHaveLength(2)
      expect(group2Cards).toHaveLength(2)

      // 每组都应该有类别1和类别2
      expect(group1Cards.some(c => c.类别 === 1)).toBe(true)
      expect(group1Cards.some(c => c.类别 === 2)).toBe(true)
      expect(group2Cards.some(c => c.类别 === 1)).toBe(true)
      expect(group2Cards.some(c => c.类别 === 2)).toBe(true)
    })

    it('应该处理空数组', () => {
      const result = ensureAncestryPairs([], mockPackageData)
      expect(result).toHaveLength(0)
    })
  })

  describe('子职业卡三卡组补全功能', () => {
    it('应该保持完整三卡组不变', () => {
      const cards = [
        createTestSubclassCard('战士基石', '战士', '战斗', '基石'),
        createTestSubclassCard('战士专精', '战士', '战斗', '专精'),
        createTestSubclassCard('战士大师', '战士', '战斗', '大师')
      ]

      const result = ensureSubclassTriples(cards, mockPackageData)

      expect(result).toHaveLength(3)
      expect(result[0].等级).toBe('基石')
      expect(result[1].等级).toBe('专精')
      expect(result[2].等级).toBe('大师')
      expect(result.every(c => c.子职业 === '战士')).toBe(true)
    })

    it('应该为只有基石的组补全专精和大师', () => {
      const cards = [
        createTestSubclassCard('战士基石', '战士', '战斗', '基石')
      ]

      const result = ensureSubclassTriples(cards, mockPackageData)

      expect(result).toHaveLength(3)
      expect(result[0].名称).toBe('战士基石') // 原有基石
      expect(result[0].等级).toBe('基石')
      expect(result[1].等级).toBe('专精') // 自动创建
      expect(result[2].等级).toBe('大师') // 自动创建
      expect(result.every(c => c.子职业 === '战士')).toBe(true)
      expect(result.every(c => c.主职 === '战斗')).toBe(true)
    })

    it('应该为只有大师的组补全基石和专精', () => {
      const cards = [
        createTestSubclassCard('法师大师', '法师', '魔法', '大师', '智力')
      ]

      const result = ensureSubclassTriples(cards, mockPackageData)

      expect(result).toHaveLength(3)
      expect(result[0].等级).toBe('基石') // 自动创建
      expect(result[1].等级).toBe('专精') // 自动创建
      expect(result[2].名称).toBe('法师大师') // 原有大师
      expect(result[2].等级).toBe('大师')
      expect(result.every(c => c.子职业 === '法师')).toBe(true)
      expect(result.every(c => c.主职 === '魔法')).toBe(true)
      expect(result.every(c => c.施法 === '智力')).toBe(true) // 应该复制施法属性
    })

    it('应该处理缺少专精的组', () => {
      const cards = [
        createTestSubclassCard('战士基石', '战士', '战斗', '基石'),
        createTestSubclassCard('战士大师', '战士', '战斗', '大师')
      ]

      const result = ensureSubclassTriples(cards, mockPackageData)

      expect(result).toHaveLength(3)
      expect(result[0].名称).toBe('战士基石')
      expect(result[0].等级).toBe('基石')
      expect(result[1].等级).toBe('专精') // 自动创建
      expect(result[2].名称).toBe('战士大师')
      expect(result[2].等级).toBe('大师')
    })

    it('应该处理多个不完整的子职业组', () => {
      const cards = [
        createTestSubclassCard('战士基石', '战士', '战斗', '基石'),
        createTestSubclassCard('法师大师', '法师', '魔法', '大师'),
        createTestSubclassCard('游侠专精', '游侠', '自然', '专精')
      ]

      const result = ensureSubclassTriples(cards, mockPackageData)

      expect(result).toHaveLength(9) // 3组 × 3卡

      // 战士组
      const warriorCards = result.filter(c => c.子职业 === '战士')
      expect(warriorCards).toHaveLength(3)
      expect(warriorCards.some(c => c.等级 === '基石')).toBe(true)
      expect(warriorCards.some(c => c.等级 === '专精')).toBe(true)
      expect(warriorCards.some(c => c.等级 === '大师')).toBe(true)

      // 法师组
      const mageCards = result.filter(c => c.子职业 === '法师')
      expect(mageCards).toHaveLength(3)
      expect(mageCards.some(c => c.等级 === '基石')).toBe(true)
      expect(mageCards.some(c => c.等级 === '专精')).toBe(true)
      expect(mageCards.some(c => c.等级 === '大师')).toBe(true)

      // 游侠组
      const rangerCards = result.filter(c => c.子职业 === '游侠')
      expect(rangerCards).toHaveLength(3)
      expect(rangerCards.some(c => c.等级 === '基石')).toBe(true)
      expect(rangerCards.some(c => c.等级 === '专精')).toBe(true)
      expect(rangerCards.some(c => c.等级 === '大师')).toBe(true)
    })

    it('应该区分相同子职业名但不同主职的组', () => {
      const cards = [
        createTestSubclassCard('元素师火基石', '元素师', '火系', '基石'),
        createTestSubclassCard('元素师水大师', '元素师', '水系', '大师')
      ]

      const result = ensureSubclassTriples(cards, mockPackageData)

      expect(result).toHaveLength(6) // 2组 × 3卡

      const fireCards = result.filter(c => c.主职 === '火系')
      const waterCards = result.filter(c => c.主职 === '水系')

      expect(fireCards).toHaveLength(3)
      expect(waterCards).toHaveLength(3)
      expect(fireCards.every(c => c.子职业 === '元素师')).toBe(true)
      expect(waterCards.every(c => c.子职业 === '元素师')).toBe(true)
    })

    it('应该处理空数组', () => {
      const result = ensureSubclassTriples([], mockPackageData)
      expect(result).toHaveLength(0)
    })
  })

  describe('边界情况测试', () => {
    it('应该处理undefined输入', () => {
      expect(() => ensureAncestryPairs(undefined as any, mockPackageData)).not.toThrow()
      expect(() => ensureSubclassTriples(undefined as any, mockPackageData)).not.toThrow()
    })

    it('应该处理缺少关键字段的卡片', () => {
      const invalidAncestryCard = {
        id: 'invalid',
        名称: '无效卡片',
        种族: '', // 空字符串
        简介: '', // 空字符串
        类别: 1,  // 设置类别
        效果: ''
      } as AncestryCard

      const result = ensureAncestryPairs([invalidAncestryCard], mockPackageData)
      expect(result.length).toBeGreaterThan(0) // 应该能处理而不崩溃
      expect(result).toHaveLength(2) // 应该自动补全配对
    })

    it('应该处理无效等级的子职业卡', () => {
      const invalidSubclassCard = {
        id: 'invalid',
        名称: '无效子职业',
        子职业: '测试',
        主职: '测试',
        等级: '无效等级' // 不是基石/专精/大师
      } as any

      const result = ensureSubclassTriples([invalidSubclassCard], mockPackageData)
      expect(result.length).toBeGreaterThan(0) // 应该能处理而不崩溃
    })
  })
})