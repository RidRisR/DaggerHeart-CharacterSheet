/**
 * AI服务
 *
 * 使用 Vercel AI SDK 提供统一的LLM提供商接口
 * 使用 Chat Completions API 格式（兼容 OpenAI、火山引擎等主流提供商）
 */

import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import type { AIServiceConfig, AIChunkResponse } from './ai-types'

/**
 * AI服务
 */
export class AIService {
  private config: AIServiceConfig
  private client: ReturnType<typeof createOpenAI>

  constructor(config: AIServiceConfig) {
    this.config = config

    // 创建 OpenAI 兼容客户端
    // 支持火山引擎、OpenAI 等使用 Chat Completions API 的提供商
    this.client = createOpenAI({
      baseURL: config.baseURL,
      apiKey: config.apiKey,
      name: config.provider // 提供商标识
    })
  }

  /**
   * 调用AI生成内容
   *
   * @param systemPrompt 系统提示词
   * @param userPrompt 用户提示词
   * @returns AI响应
   */
  async generate(systemPrompt: string, userPrompt: string): Promise<AIChunkResponse> {
    try {
      // 在系统提示词中明确要求JSON格式（因为某些提供商不支持response_format）
      const enhancedSystemPrompt = `${systemPrompt}

IMPORTANT: 你必须严格返回有效的JSON格式，不要包含任何markdown代码块标记（如\`\`\`json），直接返回纯JSON对象。`

      // 使用 Vercel AI SDK 的 generateText
      // .chat() 方法使用标准的 Chat Completions API（火山引擎等提供商兼容）
      const result = await generateText({
        model: this.client.chat(this.config.model),
        system: enhancedSystemPrompt,
        prompt: userPrompt,
        temperature: 0.1, // 低温度确保严格遵守格式
        maxTokens: 4096
      })

      const content = result.text

      // 解析JSON
      let parsed: AIChunkResponse
      try {
        parsed = JSON.parse(content)
      } catch (error) {
        throw new Error(`AI返回的内容不是有效的JSON: ${content.substring(0, 200)}...`)
      }

      // 验证必需字段
      if (!parsed.metadata || parsed.metadata.processedUpTo === undefined) {
        throw new Error('AI响应缺少必需的metadata.processedUpTo字段')
      }

      if (!Array.isArray(parsed.cards)) {
        throw new Error('AI响应的cards字段不是数组')
      }

      return parsed
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`AI服务调用失败: ${error.message}`)
      }
      throw new Error('AI服务调用失败: 未知错误')
    }
  }

  /**
   * 测试API配置是否有效
   * 使用简单的生成调用来验证连接
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // 使用简单的生成调用测试连接
      const result = await generateText({
        model: this.client.chat(this.config.model),
        prompt: 'test',
        maxTokens: 10
      })

      if (result.text) {
        return {
          success: true,
          message: '连接成功'
        }
      } else {
        return {
          success: false,
          message: '连接失败: 响应为空'
        }
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '连接失败: 网络错误'
      }
    }
  }

  /**
   * 估算token消耗
   * 简单估算: 中文约2字符=1token, 英文约4字符=1token
   */
  estimateTokens(text: string): number {
    // 统计中文字符和英文字符
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
    const otherChars = text.length - chineseChars

    // 粗略估算
    const chineseTokens = chineseChars / 2
    const otherTokens = otherChars / 4

    return Math.ceil(chineseTokens + otherTokens)
  }

  /**
   * 估算API调用成本
   * 基于GPT-4o的定价: 输入$2.5/1M, 输出$10/1M
   */
  estimateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1_000_000) * 2.5
    const outputCost = (outputTokens / 1_000_000) * 10
    return inputCost + outputCost
  }
}
