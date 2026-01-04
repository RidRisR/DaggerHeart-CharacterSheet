/**
 * AI 调试页面类型定义
 */

import type { AIChunkResponse, AIWarning } from '../card-editor/services/ai-types'
import type { CardPackageState } from '../card-editor/store/card-editor-store'

/**
 * 单个 Chunk 的完整日志
 */
export interface ChunkLog {
  id: string
  index: number
  timestamp: number

  // 输入信息
  textWindow: string
  position: number
  windowSize: number

  // Prompt 信息
  systemPrompt: string
  userPrompt: string

  // AI 响应信息
  rawResponse: string       // 原始 JSON 字符串
  parsedResponse: AIChunkResponse | null

  // 统计信息
  duration: number          // 耗时(ms)
  estimatedTokens: number
  estimatedCost: number

  // 结果信息
  cardsGenerated: number
  warnings: AIWarning[]
  error?: string

  // 处理状态
  status: 'processing' | 'success' | 'error'
}

/**
 * 调试状态
 */
export interface DebugState {
  // 执行状态
  isRunning: boolean
  isPaused: boolean
  currentChunkIndex: number
  totalChunks: number

  // 累计日志
  chunkLogs: ChunkLog[]

  // 累计数据
  accumulatedPackage: Partial<CardPackageState>

  // 总体统计
  totalDuration: number
  totalTokens: number
  totalCost: number
  totalCards: number
  totalWarnings: number
  totalErrors: number
}

/**
 * 调试回调信息
 */
export interface DebugCallbackInfo {
  chunkIndex: number
  textWindow: string
  position: number
  systemPrompt: string
  userPrompt: string
  startTime: number
}
