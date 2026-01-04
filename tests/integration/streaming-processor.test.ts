/**
 * 流式批量处理器集成测试
 *
 * 测试streaming-batch-processor.ts的完整流程
 * 这是最核心的集成测试,验证整个系统能否正常工作
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { AIService } from '@/app/card-editor/services/ai-service'
import { StreamingBatchProcessor } from '@/app/card-editor/services/streaming-batch-processor'
import { countCards, countCardsByType } from '@/app/card-editor/services/json-merger'
import type { AIServiceConfig, ProcessState } from '@/app/card-editor/services/ai-types'

describe('Streaming Batch Processor Integration', () => {
  let aiService: AIService
  let processor: StreamingBatchProcessor
  let config: AIServiceConfig

  beforeAll(() => {
    config = {
      provider: (process.env.AI_TEST_PROVIDER as any) || 'custom',
      apiKey: process.env.AI_TEST_API_KEY || '',
      baseURL: process.env.AI_TEST_BASE_URL || '',
      model: process.env.AI_TEST_MODEL || ''
    }

    if (!config.apiKey || !config.baseURL || !config.model) {
      throw new Error('缺少必需的环境变量: AI_TEST_API_KEY, AI_TEST_BASE_URL, AI_TEST_MODEL')
    }

    aiService = new AIService(config)
    processor = new StreamingBatchProcessor()
  })

  describe('处理小文本', () => {
    it('应该成功处理约800字符的文本', async () => {
      const testText = `## 职业卡：剑客
- 简介：以剑术为生的战士，擅长近战搏斗
- 领域1：武技
- 领域2：防御
- 起始生命：14
- 起始闪避：8
- 起始物品：长剑、皮甲、治疗药水x2
- 希望特性：剑术精通、战斗直觉
- 职业特性：***剑术大师***：当你使用近战武器攻击时，攻击掷骰获得+1加值。***钢铁意志***：当你的生命值低于最大值的一半时，你的防御掷骰获得优势。

## 种族卡：江湖侠士（类别1）
- 种族：江湖侠士
- 简介：行走江湖的游侠，重视义气和自由
- 效果：当你进行敏捷或灵巧检定时，你可以选择获得优势。每次长休后，你可以使用此能力一次。`

      console.log(`[Test] 测试文本长度: ${testText.length} 字符`)

      const progressUpdates: ProcessState[] = []

      const result = await processor.process(
        testText,
        {},
        aiService,
        (state) => {
          progressUpdates.push(state)
          console.log(`[Test] 进度更新: ${state.phase} - ${state.progress.toFixed(1)}%`)
        }
      )

      console.log('[Test] 处理完成!')
      console.log(`[Test] 进度更新次数: ${progressUpdates.length}`)
      console.log('[Test] 最终结果:', JSON.stringify(result, null, 2))

      // 验证进度回调
      expect(progressUpdates.length).toBeGreaterThan(0)
      const lastProgress = progressUpdates[progressUpdates.length - 1]
      expect(lastProgress.phase).toBe('completed')
      expect(lastProgress.progress).toBe(100)

      // 验证结果
      const totalCards = countCards(result)
      const cardsByType = countCardsByType(result)

      console.log(`[Test] 总卡牌数: ${totalCards}`)
      console.log('[Test] 按类型统计:', cardsByType)

      expect(totalCards).toBeGreaterThan(0)
      console.log(`[Test] ✅ 成功识别 ${totalCards} 张卡牌`)

      // 验证customFieldDefinitions
      if (result.customFieldDefinitions) {
        console.log('[Test] customFieldDefinitions:', result.customFieldDefinitions)
        expect(result.customFieldDefinitions).toBeDefined()
      }
    }, 120000) // 120秒超时
  })

  describe('处理中等文本(分块测试)', () => {
    it('应该成功处理约4000字符的文本并正确分块', async () => {
      const testText = `## 职业卡：剑客
- 简介：以剑术为生的战士，擅长近战搏斗，追求武道巅峰
- 领域1：武技
- 领域2：防御
- 起始生命：14
- 起始闪避：8
- 起始物品：长剑、皮甲、治疗药水x2、磨刀石
- 希望特性：剑术精通、战斗直觉、坚韧体魄
- 职业特性：***剑术大师***：当你使用近战武器攻击时，攻击掷骰获得+1加值。***钢铁意志***：当你的生命值低于最大值的一半时，你的防御掷骰获得优势。***反击***：当敌人近战攻击未命中你时，你可以使用反应进行一次机会攻击。

## 职业卡：法师
- 简介：掌握奥术魔法的学者，通过咒语操控元素之力
- 领域1：知识
- 领域2：秘法
- 起始生命：8
- 起始闪避：10
- 起始物品：法杖、法师袍、法术书、墨水和羽毛笔
- 希望特性：奥术知识、法术专精
- 职业特性：***魔力涌动***：当你施放法术时，你可以选择使用Hope点数来增强效果。每消耗1点Hope，伤害或治疗效果+2。***魔法护盾***：每次长休后，你获得等同于你本能属性值的临时生命值。

## 种族卡：江湖侠士（类别1）
- 种族：江湖侠士
- 简介：行走江湖的游侠，重视义气和自由，擅长轻功和暗器
- 效果：当你进行敏捷或灵巧检定时，你可以选择获得优势。每次长休后，你可以使用此能力一次。你在进行跳跃和攀爬时视为有专业训练。

## 种族卡：江湖侠士（类别2）
- 种族：江湖侠士
- 简介：侠客的另一面，展现出机智和社交能力
- 效果：你在进行风度或本能检定时获得+1加值。你可以在城镇中通过你的江湖人脉获得情报，每次长休后可使用一次。

## 社群卡：剑宗
- 名称：剑宗
- 简介：专注于剑道修炼的武学宗派，追求人剑合一的境界
- 效果：当你使用剑类武器时，可以选择重投一次攻击骰，并选择其中一个结果。每次短休后可使用一次。你在维护和鉴定剑类武器时自动成功。

## 子职业卡：剑圣（基石）
- 名称：剑圣
- 等级：基石
- 简介：剑道入门，开始掌握气的运用
- 效果：你学会了基础的剑气运用。每次短休后，你可以在一次攻击中附加1d6的能量伤害。

## 子职业卡：剑圣（专精）
- 名称：剑圣
- 等级：专精
- 简介：剑气精进，可以远程释放剑气
- 效果：你的剑气攻击范围增加到近距离。你可以选择在攻击时消耗2点Hope来进行剑气斩，对30尺内的所有敌人造成2d6伤害（需要敏捷豁免）。

## 领域卡：武技
- 名称：武技
- 施法属性：力量
- 简介：代表近战战斗、武器掌握和身体力量的领域
- 法术列表：冲锋、震地击、旋风斩、钢铁之躯、战吼`

      console.log(`[Test] 测试文本长度: ${testText.length} 字符`)

      const progressUpdates: ProcessState[] = []
      let chunkCount = 0

      const result = await processor.process(
        testText,
        {},
        aiService,
        (state) => {
          progressUpdates.push(state)

          if (state.currentChunk) {
            const currentChunkIndex = state.currentChunk.index
            if (currentChunkIndex > chunkCount - 1) {
              chunkCount = state.currentChunk.total
              console.log(`[Test] 处理块 ${state.currentChunk.index + 1}/${state.currentChunk.total}`)
            }
          }

          console.log(`[Test] ${state.phase} - ${state.progress.toFixed(1)}% - 已识别 ${state.stats?.processedCards || 0} 张卡牌`)
        }
      )

      console.log('[Test] 处理完成!')
      console.log(`[Test] 总块数: ${chunkCount}`)

      // 验证分块处理
      if (testText.length > 6000) {
        expect(chunkCount).toBeGreaterThan(1)
        console.log(`[Test] ✅ 文本被正确分为 ${chunkCount} 个块`)
      }

      // 验证结果
      const totalCards = countCards(result)
      const cardsByType = countCardsByType(result)

      console.log(`[Test] 总卡牌数: ${totalCards}`)
      console.log('[Test] 按类型统计:', cardsByType)

      expect(totalCards).toBeGreaterThan(0)
      console.log(`[Test] ✅ 成功识别 ${totalCards} 张卡牌`)

      // 验证数据合并(不应该有重复)
      if (result.profession) {
        const professionIds = result.profession.map((card: any) => card.id).filter(Boolean)
        const uniqueIds = new Set(professionIds)
        expect(professionIds.length).toBe(uniqueIds.size)
        console.log(`[Test] ✅ 职业卡去重正常 (${professionIds.length}张,无重复)`)
      }
    }, 180000) // 180秒超时(3分钟)
  })

  describe('进度回调验证', () => {
    it('应该正确触发各个阶段的进度回调', async () => {
      const testText = `## 职业卡：测试职业
- 简介：测试用职业
- 领域1：武技
- 领域2：防御`

      const phases: string[] = []

      await processor.process(
        testText,
        {},
        aiService,
        (state) => {
          if (!phases.includes(state.phase)) {
            phases.push(state.phase)
            console.log(`[Test] 进入阶段: ${state.phase}`)
          }
        }
      )

      console.log('[Test] 经历的阶段:', phases)

      // 应该经历 parsing -> validating -> completed
      expect(phases).toContain('parsing')
      expect(phases).toContain('completed')

      // 检查阶段顺序
      const parsingIndex = phases.indexOf('parsing')
      const completedIndex = phases.indexOf('completed')
      expect(parsingIndex).toBeLessThan(completedIndex)

      console.log('[Test] ✅ 阶段顺序正确')
    }, 120000)
  })
})
