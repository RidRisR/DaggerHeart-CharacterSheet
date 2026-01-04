/**
 * JSON合并函数测试
 *
 * 测试json-merger.ts的所有功能
 */

import { describe, it, expect } from 'vitest'
import { mergeCardData, countCards, countCardsByType } from '@/app/card-editor/services/json-merger'

describe('JSON Merger', () => {
  describe('mergeCardData', () => {
    it('应该合并空数据而不出错', () => {
      const existing = {}
      const incoming = {}
      const result = mergeCardData(existing, incoming)

      expect(result).toBeDefined()
      expect(result).toEqual(existing)
    })

    it('应该合并customFieldDefinitions并去重', () => {
      const existing = {
        customFieldDefinitions: {
          professions: ['战士', '法师']
        }
      }

      const incoming = {
        customFieldDefinitions: {
          professions: ['法师', '游侠'] // '法师'重复
        }
      }

      const result = mergeCardData(existing, incoming)

      expect(result.customFieldDefinitions?.professions).toHaveLength(3)
      expect(result.customFieldDefinitions?.professions).toContain('战士')
      expect(result.customFieldDefinitions?.professions).toContain('法师')
      expect(result.customFieldDefinitions?.professions).toContain('游侠')
    })

    it('应该使用overwrite策略覆盖相同ID的卡牌', () => {
      const existing = {
        profession: [
          { id: '1', 名称: '战士', 简介: '旧简介' }
        ]
      }

      const incoming = {
        profession: [
          { id: '1', 名称: '战士', 简介: '新简介' }
        ]
      }

      const result = mergeCardData(existing, incoming, {
        deduplicateById: true,
        conflictStrategy: 'overwrite'
      })

      expect(result.profession).toHaveLength(1)
      expect(result.profession?.[0].简介).toBe('新简介')
    })

    it('应该使用keep_existing策略保留旧卡牌', () => {
      const existing = {
        profession: [
          { id: '1', 名称: '战士', 简介: '旧简介' }
        ]
      }

      const incoming = {
        profession: [
          { id: '1', 名称: '战士', 简介: '新简介' }
        ]
      }

      const result = mergeCardData(existing, incoming, {
        deduplicateById: true,
        conflictStrategy: 'keep_existing'
      })

      expect(result.profession).toHaveLength(1)
      expect(result.profession?.[0].简介).toBe('旧简介')
    })

    it('应该使用merge策略进行字段级合并', () => {
      const existing = {
        profession: [
          { id: '1', 名称: '战士', 简介: '', 领域1: '武技' }
        ]
      }

      const incoming = {
        profession: [
          { id: '1', 名称: '战士', 简介: '近战专家', 领域2: '防御' }
        ]
      }

      const result = mergeCardData(existing, incoming, {
        deduplicateById: true,
        conflictStrategy: 'merge'
      })

      expect(result.profession).toHaveLength(1)
      expect(result.profession?.[0].简介).toBe('近战专家') // 新值填充空字段
      expect(result.profession?.[0].领域1).toBe('武技') // 保留existing的值
      expect(result.profession?.[0].领域2).toBe('防御') // 新增字段
    })

    it('应该在不去重模式下保留所有卡牌', () => {
      const existing = {
        profession: [
          { id: '1', 名称: '战士' }
        ]
      }

      const incoming = {
        profession: [
          { id: '1', 名称: '战士' }
        ]
      }

      const result = mergeCardData(existing, incoming, {
        deduplicateById: false
      })

      expect(result.profession).toHaveLength(2) // 不去重,保留两张
    })

    it('应该合并多种类型的卡牌', () => {
      const existing = {
        profession: [{ id: '1', 名称: '战士' }],
        ancestry: [{ id: '2', 名称: '人类' }]
      }

      const incoming = {
        profession: [{ id: '3', 名称: '法师' }],
        community: [{ id: '4', 名称: '剑宗' }]
      }

      const result = mergeCardData(existing, incoming)

      expect(result.profession).toHaveLength(2)
      expect(result.ancestry).toHaveLength(1)
      expect(result.community).toHaveLength(1)
    })

    it('应该更新元数据字段', () => {
      const existing = {
        name: '旧卡包',
        version: '1.0.0'
      }

      const incoming = {
        name: '新卡包',
        author: '测试作者'
      }

      const result = mergeCardData(existing, incoming)

      expect(result.name).toBe('新卡包')
      expect(result.version).toBe('1.0.0')
      expect(result.author).toBe('测试作者')
    })
  })

  describe('countCards', () => {
    it('应该正确统计空数据的卡牌数', () => {
      const data = {}
      expect(countCards(data)).toBe(0)
    })

    it('应该正确统计单个类型的卡牌数', () => {
      const data = {
        profession: [{ id: '1' }, { id: '2' }]
      }
      expect(countCards(data)).toBe(2)
    })

    it('应该正确统计多个类型的卡牌总数', () => {
      const data = {
        profession: [{ id: '1' }, { id: '2' }],
        ancestry: [{ id: '3' }],
        community: [{ id: '4' }, { id: '5' }, { id: '6' }]
      }
      expect(countCards(data)).toBe(6)
    })
  })

  describe('countCardsByType', () => {
    it('应该返回空对象当数据为空时', () => {
      const data = {}
      const result = countCardsByType(data)
      expect(Object.keys(result)).toHaveLength(0)
    })

    it('应该正确统计各类型卡牌数量', () => {
      const data = {
        profession: [{ id: '1' }, { id: '2' }],
        ancestry: [{ id: '3' }],
        community: [{ id: '4' }, { id: '5' }]
      }

      const result = countCardsByType(data)

      expect(result.profession).toBe(2)
      expect(result.ancestry).toBe(1)
      expect(result.community).toBe(2)
      expect(result.subclass).toBeUndefined()
    })
  })
})
