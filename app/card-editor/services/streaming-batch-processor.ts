/**
 * 流式批量处理器
 *
 * 协调大文本的分块处理流程
 */

import type { CardPackageState } from '@/app/card-editor/types'
import type { ProcessState, AIChunkResponse } from './ai-types'
import { AIService } from './ai-service'
import { AIPromptBuilder } from './ai-prompt-builder'
import { mergeCardData, countCards, countCardsByType } from './json-merger'
import { resultParser } from './result-parser'

/**
 * 流式批量处理器
 */
export class StreamingBatchProcessor {
  /** 每次处理的文本窗口大小(字符数) */
  private readonly WINDOW_SIZE = 6000

  /** 窗口重叠大小(防止截断) */
  private readonly OVERLAP = 200

  /** 最大迭代次数(防死循环) */
  private readonly MAX_ITERATIONS = 50

  /**
   * 处理完整文本
   *
   * @param fullText 完整的输入文本
   * @param initialContext 初始上下文(通常为空)
   * @param aiService AI服务实例
   * @param onProgress 进度回调
   * @returns 处理完成的卡包数据
   */
  async process(
    fullText: string,
    initialContext: Partial<CardPackageState>,
    aiService: AIService,
    onProgress: (state: ProcessState) => void
  ): Promise<Partial<CardPackageState>> {
    let currentPosition = 0
    let accumulatedData: Partial<CardPackageState> = { ...initialContext }
    let iterationCount = 0
    const totalChunks = Math.ceil(fullText.length / this.WINDOW_SIZE)

    const promptBuilder = new AIPromptBuilder()

    // 获取系统提示词(只需一次)
    const systemPrompt = promptBuilder.buildSystemPrompt()

    console.log('[StreamingBatchProcessor] 开始处理文本')
    console.log(`  总长度: ${fullText.length} 字符`)
    console.log(`  预估块数: ${totalChunks}`)

    while (currentPosition < fullText.length && iterationCount < this.MAX_ITERATIONS) {
      iterationCount++

      console.log(`\n[Chunk ${iterationCount}] 开始处理...`)
      console.log(`  位置: ${currentPosition} / ${fullText.length}`)

      // 1. 提取文本窗口(带重叠)
      const windowEnd = Math.min(currentPosition + this.WINDOW_SIZE, fullText.length)
      const textWindow = fullText.slice(
        Math.max(0, currentPosition - this.OVERLAP),
        windowEnd
      )

      // 2. 构建用户提示词
      const userPrompt = promptBuilder.buildUserPrompt(
        textWindow,
        accumulatedData,
        iterationCount === 1,
        currentPosition,
        fullText.length
      )

      // 3. 更新进度 - 解析阶段
      onProgress({
        phase: 'parsing',
        progress: (currentPosition / fullText.length) * 90,
        currentPosition,
        totalLength: fullText.length,
        currentChunk: {
          id: `chunk-${iterationCount}`,
          index: iterationCount - 1,
          total: totalChunks,
          estimatedCards: 0
        },
        stats: {
          totalChunks,
          processedChunks: iterationCount - 1,
          totalCards: countCards(accumulatedData),
          processedCards: countCards(accumulatedData),
          cardsByType: countCardsByType(accumulatedData)
        }
      })

      // 4. 调用AI
      let response: AIChunkResponse
      try {
        response = await aiService.generate(systemPrompt, userPrompt)
        console.log(`  AI返回: ${response.cards.length} 张卡牌`)
        console.log(`  处理到: ${response.metadata.processedUpTo} (置信度: ${response.metadata.confidence})`)
      } catch (error) {
        console.error(`  AI调用失败:`, error)
        // 失败时跳过一段继续
        currentPosition = Math.min(currentPosition + 1000, fullText.length)
        continue
      }

      // 5. 合并结果
      if (response.cards && response.cards.length > 0) {
        const incomingData = this.convertToPackageData(response.cards, response._warnings)
        accumulatedData = mergeCardData(accumulatedData, incomingData, {
          deduplicateById: true,
          conflictStrategy: 'merge'
        })
        console.log(`  合并后总卡牌数: ${countCards(accumulatedData)}`)
      }

      // 6. 更新位置
      const nextPosition =
        response.metadata.nextShouldStartFrom || response.metadata.processedUpTo

      // 7. 验证进度(防死循环)
      if (nextPosition <= currentPosition) {
        console.warn(`  ⚠️ AI未能前进 (${nextPosition} <= ${currentPosition}), 强制跳过`)
        currentPosition = Math.min(currentPosition + 1000, fullText.length)
      } else {
        currentPosition = nextPosition
      }

      // 8. 检查是否已处理完成
      if (currentPosition >= fullText.length) {
        console.log('  ✅ 文本处理完成')
        break
      }
    }

    // 检查是否超过最大迭代次数
    if (iterationCount >= this.MAX_ITERATIONS) {
      console.error(`⚠️ 超过最大迭代次数 (${this.MAX_ITERATIONS}), 可能存在问题`)
    }

    // 最终验证
    console.log('\n[StreamingBatchProcessor] 开始验证...')
    onProgress({ phase: 'validating', progress: 95 })

    const parseResult = await resultParser.parse(accumulatedData)

    console.log('验证完成:')
    console.log(`  成功: ${parseResult.success}`)
    console.log(`  错误数: ${parseResult.errors.length}`)
    console.log(`  警告数: ${parseResult.warnings.length}`)
    console.log(`  总卡牌数: ${parseResult.stats?.totalCards || 0}`)

    // 完成
    onProgress({
      phase: 'completed',
      progress: 100,
      currentPosition: fullText.length,
      totalLength: fullText.length,
      stats: {
        totalCards: parseResult.stats?.totalCards || 0,
        processedCards: parseResult.stats?.totalCards || 0,
        cardsByType: parseResult.stats?.cardsByType || {}
      },
      warnings: parseResult.warnings,
      errors: parseResult.errors
    })

    return accumulatedData
  }

  /**
   * 将AI返回的cards数组转换为CardPackageState格式
   */
  private convertToPackageData(
    cards: any[],
    warnings?: any[]
  ): Partial<CardPackageState> {
    const packageData: Partial<CardPackageState> = {
      customFieldDefinitions: {},
      profession: [],
      ancestry: [],
      community: [],
      subclass: [],
      domain: [],
      variant: []
    }

    // 按类型分组卡牌
    cards.forEach((card) => {
      // 尝试推断卡牌类型
      const type = this.inferCardType(card)

      if (type && packageData[type]) {
        ;(packageData[type] as any[]).push(card)
      } else {
        console.warn('[convertToPackageData] 无法确定卡牌类型:', card)
      }
    })

    // 提取customFieldDefinitions
    packageData.customFieldDefinitions = this.extractCustomFieldDefinitions(packageData)

    // 保存警告(如果有)
    if (warnings && warnings.length > 0) {
      ;(packageData as any)._warnings = warnings
    }

    return packageData
  }

  /**
   * 推断卡牌类型
   */
  private inferCardType(card: any): keyof CardPackageState | null {
    // 优先检查是否有明确的类型字段（AI 应该返回此字段）
    if (card.type) {
      const typeValue = card.type.toLowerCase()
      const typeMap: Record<string, keyof CardPackageState> = {
        profession: 'profession',
        职业: 'profession',
        ancestry: 'ancestry',
        种族: 'ancestry',
        community: 'community',
        社群: 'community',
        subclass: 'subclass',
        子职业: 'subclass',
        domain: 'domain',
        领域: 'domain',
        领域法术: 'domain',
        variant: 'variant',
        变体: 'variant',
        扩展: 'variant'
      }
      const mappedType = typeMap[typeValue]
      if (mappedType) {
        return mappedType
      }
    }

    // 根据特征字段推断类型（作为后备方案）

    // 职业卡：有领域1/领域2、起始生命、职业特性
    if ((card.领域1 && card.领域2) || card.职业特性 || card.起始物品) {
      return 'profession'
    }

    // 种族卡：有种族字段和类别（1或2）
    if (card.种族 && (card.类别 === 1 || card.类别 === 2)) {
      return 'ancestry'
    }

    // 社群卡：有特性字段（社群特有）
    if (card.特性 && card.简介 && !card.施法 && !card.等级) {
      return 'community'
    }

    // 子职业卡：有主职、子职业、等级（基石/专精/大师）和施法属性
    if (card.主职 || card.子职业 || (card.施法 && card.等级 && typeof card.等级 === 'string')) {
      return 'subclass'
    }

    // 领域法术卡：有领域（单一领域字段）、等级（数字）、回想、属性
    if (card.领域 && card.回想 !== undefined && typeof card.等级 === 'number') {
      return 'domain'
    }

    // 变体卡：有类型字段（变体类型如"神器"、"盟友"等）
    if (card.类型 && card.效果) {
      return 'variant'
    }

    // 默认为variant
    return 'variant'
  }

  /**
   * 从卡包数据中提取customFieldDefinitions
   */
  private extractCustomFieldDefinitions(
    packageData: Partial<CardPackageState>
  ): Record<string, string[]> {
    const definitions: Record<string, string[]> = {
      professions: [],
      ancestries: [],
      communities: [],
      domains: [],
      variants: []
    }

    // 提取职业名称
    if (packageData.profession) {
      packageData.profession.forEach((card: any) => {
        if (card.名称) definitions.professions.push(card.名称)
        // 同时从职业卡中提取领域
        if (card.领域1) definitions.domains.push(card.领域1)
        if (card.领域2) definitions.domains.push(card.领域2)
      })
    }

    // 提取种族名称（从种族字段而非名称）
    if (packageData.ancestry) {
      packageData.ancestry.forEach((card: any) => {
        if (card.种族) definitions.ancestries.push(card.种族)
      })
    }

    // 提取社群名称
    if (packageData.community) {
      packageData.community.forEach((card: any) => {
        if (card.名称) definitions.communities.push(card.名称)
      })
    }

    // 提取领域法术卡中的领域名称
    if (packageData.domain) {
      packageData.domain.forEach((card: any) => {
        if (card.领域) definitions.domains.push(card.领域)
      })
    }

    // 提取变体类型（从类型字段而非名称）
    if (packageData.variant) {
      packageData.variant.forEach((card: any) => {
        if (card.类型) definitions.variants.push(card.类型)
      })
    }

    // 去重
    Object.keys(definitions).forEach((key) => {
      definitions[key] = Array.from(new Set(definitions[key]))
    })

    return definitions
  }
}
