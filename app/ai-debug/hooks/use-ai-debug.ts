/**
 * AI 调试核心 Hook
 *
 * 管理调试状态、执行流程、日志记录
 */

import { useState, useCallback, useRef } from 'react'
import type { ChunkLog, DebugState, DebugCallbackInfo } from '../types'
import type { AIServiceConfig, AIChunkResponse } from '@/app/card-editor/services/ai-types'
import type { CardPackageState } from '@/app/card-editor/store/card-editor-store'
import { AIService } from '@/app/card-editor/services/ai-service'
import { AIPromptBuilder } from '@/app/card-editor/services/ai-prompt-builder'
import { mergeCardData } from '@/app/card-editor/services/json-merger'

export function useAIDebug() {
  const [state, setState] = useState<DebugState>({
    isRunning: false,
    isPaused: false,
    currentChunkIndex: 0,
    totalChunks: 0,
    chunkLogs: [],
    accumulatedPackage: {},
    totalDuration: 0,
    totalTokens: 0,
    totalCost: 0,
    totalCards: 0,
    totalWarnings: 0,
    totalErrors: 0
  })

  // 使用 ref 存储累计数据，避免闭包问题
  const accumulatedRef = useRef<Partial<CardPackageState>>({})
  const startTimeRef = useRef<number>(0)

  /**
   * 开始处理
   */
  const startProcessing = useCallback(async (
    inputText: string,
    config: AIServiceConfig
  ) => {
    // 重置状态
    setState({
      isRunning: true,
      isPaused: false,
      currentChunkIndex: 0,
      totalChunks: 0,
      chunkLogs: [],
      accumulatedPackage: {},
      totalDuration: 0,
      totalTokens: 0,
      totalCost: 0,
      totalCards: 0,
      totalWarnings: 0,
      totalErrors: 0
    })

    accumulatedRef.current = {}
    startTimeRef.current = Date.now()

    try {
      const aiService = new AIService(config)
      const promptBuilder = new AIPromptBuilder()

      // 配置参数
      const WINDOW_SIZE = 6000
      const OVERLAP = 200
      const MAX_ITERATIONS = 50

      let currentPosition = 0
      let iterationCount = 0
      const totalChunks = Math.ceil(inputText.length / WINDOW_SIZE)

      // 更新总 chunks 数
      setState(prev => ({ ...prev, totalChunks }))

      // 获取系统提示词
      const systemPrompt = promptBuilder.buildSystemPrompt()

      while (currentPosition < inputText.length && iterationCount < MAX_ITERATIONS) {
        iterationCount++
        const chunkStartTime = Date.now()

        // 1. 提取文本窗口
        const windowEnd = Math.min(currentPosition + WINDOW_SIZE, inputText.length)
        const textWindow = inputText.slice(
          Math.max(0, currentPosition - OVERLAP),
          windowEnd
        )

        // 2. 构建用户提示词
        const userPrompt = promptBuilder.buildUserPrompt(
          textWindow,
          accumulatedRef.current,
          iterationCount === 1,
          currentPosition,
          inputText.length
        )

        // 3. 估算 tokens 和成本
        const estimatedTokens = aiService.estimateTokens(systemPrompt + userPrompt)
        const estimatedCost = aiService.estimateCost(estimatedTokens)

        // 4. 创建 ChunkLog (processing 状态)
        const chunkLog: ChunkLog = {
          id: `chunk-${iterationCount}`,
          index: iterationCount - 1,
          timestamp: Date.now(),
          textWindow,
          position: currentPosition,
          windowSize: textWindow.length,
          systemPrompt,
          userPrompt,
          rawResponse: '',
          parsedResponse: null,
          duration: 0,
          estimatedTokens,
          estimatedCost,
          cardsGenerated: 0,
          warnings: [],
          status: 'processing'
        }

        // 更新状态 - 添加处理中的 chunk
        setState(prev => ({
          ...prev,
          currentChunkIndex: iterationCount - 1,
          chunkLogs: [...prev.chunkLogs, chunkLog]
        }))

        try {
          // 5. 调用 AI
          const response = await aiService.generate(systemPrompt, userPrompt)
          const chunkDuration = Date.now() - chunkStartTime

          // 6. 合并结果
          let newCardsCount = 0
          if (response.cards && response.cards.length > 0) {
            const incomingData = convertToPackageData(response.cards, response._warnings)
            accumulatedRef.current = mergeCardData(accumulatedRef.current, incomingData, {
              deduplicateById: true,
              conflictStrategy: 'merge'
            })
            newCardsCount = response.cards.length
          }

          // 7. 提取警告
          const warnings = response._warnings || []

          // 8. 更新 ChunkLog (success 状态)
          const updatedLog: ChunkLog = {
            ...chunkLog,
            rawResponse: JSON.stringify(response, null, 2),
            parsedResponse: response,
            duration: chunkDuration,
            cardsGenerated: newCardsCount,
            warnings,
            status: 'success'
          }

          setState(prev => {
            const newLogs = [...prev.chunkLogs]
            newLogs[newLogs.length - 1] = updatedLog

            return {
              ...prev,
              chunkLogs: newLogs,
              accumulatedPackage: accumulatedRef.current,
              totalDuration: Date.now() - startTimeRef.current,
              totalTokens: prev.totalTokens + estimatedTokens,
              totalCost: prev.totalCost + estimatedCost,
              totalCards: prev.totalCards + newCardsCount,
              totalWarnings: prev.totalWarnings + warnings.length
            }
          })

          // 9. 更新位置
          const nextPosition = response.metadata.nextShouldStartFrom || response.metadata.processedUpTo

          if (nextPosition <= currentPosition) {
            console.warn(`AI未能前进，强制跳过`)
            currentPosition = Math.min(currentPosition + 1000, inputText.length)
          } else {
            currentPosition = nextPosition
          }

        } catch (error) {
          const chunkDuration = Date.now() - chunkStartTime
          const errorMessage = error instanceof Error ? error.message : '未知错误'

          // 更新 ChunkLog (error 状态)
          const errorLog: ChunkLog = {
            ...chunkLog,
            duration: chunkDuration,
            error: errorMessage,
            status: 'error'
          }

          setState(prev => {
            const newLogs = [...prev.chunkLogs]
            newLogs[newLogs.length - 1] = errorLog

            return {
              ...prev,
              chunkLogs: newLogs,
              totalErrors: prev.totalErrors + 1
            }
          })

          // 错误时跳过一段继续
          currentPosition = Math.min(currentPosition + 1000, inputText.length)
        }
      }

      // 处理完成
      setState(prev => ({
        ...prev,
        isRunning: false,
        accumulatedPackage: accumulatedRef.current,
        totalDuration: Date.now() - startTimeRef.current
      }))

    } catch (error) {
      console.error('[useAIDebug] 处理失败:', error)
      setState(prev => ({
        ...prev,
        isRunning: false
      }))
    }
  }, [])

  /**
   * 清空日志
   */
  const clearLogs = useCallback(() => {
    setState({
      isRunning: false,
      isPaused: false,
      currentChunkIndex: 0,
      totalChunks: 0,
      chunkLogs: [],
      accumulatedPackage: {},
      totalDuration: 0,
      totalTokens: 0,
      totalCost: 0,
      totalCards: 0,
      totalWarnings: 0,
      totalErrors: 0
    })
    accumulatedRef.current = {}
  }, [])

  return {
    state,
    startProcessing,
    clearLogs
  }
}

/**
 * 将 AI 返回的 cards 数组转换为 CardPackageState 格式
 */
function convertToPackageData(
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
    const type = inferCardType(card)
    if (type && packageData[type]) {
      ;(packageData[type] as any[]).push(card)
    }
  })

  return packageData
}

/**
 * 推断卡牌类型
 */
function inferCardType(card: any): keyof CardPackageState | null {
  if (card.type || card.类型) {
    const typeValue = (card.type || card.类型).toLowerCase()
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
      variant: 'variant',
      变体: 'variant'
    }
    return typeMap[typeValue] || null
  }

  // 根据字段推断
  if (card.领域1 || card.领域2 || card.起始生命 !== undefined) {
    return 'profession'
  }
  if (card.种族 || card.类别 !== undefined) {
    return 'ancestry'
  }
  if (card.等级 !== undefined) {
    return 'subclass'
  }

  return null
}
