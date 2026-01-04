/**
 * AI服务
 *
 * 提供OpenAI兼容的API调用功能
 */

import type { AIServiceConfig, AIChunkResponse } from './ai-types'

/**
 * AI服务
 */
export class AIService {
  private config: AIServiceConfig

  constructor(config: AIServiceConfig) {
    this.config = config
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
      const response = await fetch(`${this.config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.1, // 低温度确保严格遵守格式
          response_format: { type: 'json_object' } // 强制JSON输出
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API调用失败 (${response.status}): ${errorText}`)
      }

      const data = await response.json()

      // 检查响应格式
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('API响应格式错误: 缺少choices或message字段')
      }

      const content = data.choices[0].message.content

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
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.config.baseURL}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`
        }
      })

      if (response.ok) {
        return {
          success: true,
          message: '连接成功'
        }
      } else {
        const errorText = await response.text()
        return {
          success: false,
          message: `连接失败 (${response.status}): ${errorText}`
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
