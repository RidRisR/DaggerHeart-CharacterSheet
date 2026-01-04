/**
 * AI服务集成测试
 *
 * 测试ai-service.ts与真实API的集成
 * 需要环境变量: AI_TEST_API_KEY, AI_TEST_BASE_URL, AI_TEST_MODEL
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { AIService } from '@/app/card-editor/services/ai-service'
import { AIPromptBuilder } from '@/app/card-editor/services/ai-prompt-builder'
import type { AIServiceConfig } from '@/app/card-editor/services/ai-types'

describe('AI Service Integration', () => {
  let aiService: AIService
  let promptBuilder: AIPromptBuilder
  let config: AIServiceConfig

  beforeAll(() => {
    // 从环境变量读取配置
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
    promptBuilder = new AIPromptBuilder()
  })

  describe('连接测试', () => {
    it('应该能够连接到API', async () => {
      const result = await aiService.testConnection()

      console.log('[Test] Connection test result:', result)

      // 注意: 某些API可能不支持/models端点,这是正常的
      // 只要不抛出网络错误即可
      expect(result).toBeDefined()
      expect(result.message).toBeDefined()
    }, 30000) // 30秒超时
  })

  describe('AI生成测试', () => {
    it('应该成功生成简单内容', async () => {
      const testText = `## 职业卡：剑客
- 简介：以剑术为生的战士
- 领域1：武技
- 领域2：防御
- 起始生命：14
- 起始闪避：8`

      const systemPrompt = promptBuilder.buildSystemPrompt()
      const userPrompt = promptBuilder.buildUserPrompt(
        testText,
        {},
        true,
        0,
        testText.length
      )

      const response = await aiService.generate(systemPrompt, userPrompt)

      console.log('[Test] AI response:', JSON.stringify(response, null, 2))

      // 验证响应格式
      expect(response).toBeDefined()
      expect(response.cards).toBeDefined()
      expect(Array.isArray(response.cards)).toBe(true)
      expect(response.metadata).toBeDefined()
      expect(response.metadata.processedUpTo).toBeDefined()
      expect(typeof response.metadata.processedUpTo).toBe('number')
      expect(response.metadata.confidence).toBeDefined()

      // 验证识别到卡牌
      console.log(`[Test] 识别到 ${response.cards.length} 张卡牌`)
      if (response.cards.length > 0) {
        console.log('[Test] 第一张卡牌:', response.cards[0])
      }
    }, 60000) // 60秒超时
  })

  describe('Token估算', () => {
    it('应该正确估算中文Token数量', () => {
      const chineseText = '这是一段中文测试文本，用于验证Token估算功能。'
      const tokens = aiService.estimateTokens(chineseText)

      console.log(`[Test] 中文文本长度: ${chineseText.length} 字符`)
      console.log(`[Test] 估算Token数: ${tokens}`)

      expect(tokens).toBeGreaterThan(0)
      // 中文约2字符=1token
      expect(tokens).toBeGreaterThanOrEqual(chineseText.length / 3)
      expect(tokens).toBeLessThanOrEqual(chineseText.length)
    })

    it('应该正确估算英文Token数量', () => {
      const englishText = 'This is an English test text for token estimation.'
      const tokens = aiService.estimateTokens(englishText)

      console.log(`[Test] 英文文本长度: ${englishText.length} 字符`)
      console.log(`[Test] 估算Token数: ${tokens}`)

      expect(tokens).toBeGreaterThan(0)
      // 英文约4字符=1token
      expect(tokens).toBeGreaterThanOrEqual(englishText.length / 5)
      expect(tokens).toBeLessThanOrEqual(englishText.length / 2)
    })

    it('应该正确估算混合文本Token数量', () => {
      const mixedText = 'This is 一个混合文本 with English and 中文字符.'
      const tokens = aiService.estimateTokens(mixedText)

      console.log(`[Test] 混合文本长度: ${mixedText.length} 字符`)
      console.log(`[Test] 估算Token数: ${tokens}`)

      expect(tokens).toBeGreaterThan(0)
    })
  })

  describe('成本估算', () => {
    it('应该正确估算API调用成本', () => {
      const inputTokens = 1000
      const outputTokens = 500

      const cost = aiService.estimateCost(inputTokens, outputTokens)

      console.log(`[Test] 输入Token: ${inputTokens}`)
      console.log(`[Test] 输出Token: ${outputTokens}`)
      console.log(`[Test] 估算成本: $${cost.toFixed(6)}`)

      expect(cost).toBeGreaterThan(0)
      // 基于GPT-4o定价: 输入$2.5/1M, 输出$10/1M
      // 1000 input + 500 output ≈ $0.0075
      expect(cost).toBeGreaterThan(0.005)
      expect(cost).toBeLessThan(0.01)
    })
  })
})
