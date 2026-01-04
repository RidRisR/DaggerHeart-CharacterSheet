/**
 * AI文本转换工具 - 类型定义
 *
 * 定义AI服务相关的所有TypeScript类型
 */

import type { CardPackageState } from '@/app/card-editor/store/card-editor-store'

// ==================== AI服务配置 ====================

/**
 * AI服务配置
 */
export interface AIServiceConfig {
  /** 提供商类型 */
  provider: 'openai' | 'claude' | 'volcengine' | 'custom'
  /** API密钥 */
  apiKey: string
  /** API基础URL */
  baseURL: string
  /** 模型名称 */
  model: string
}

// ==================== AI响应格式 ====================

/**
 * AI块响应
 * 每次处理一个文本窗口后返回的数据
 */
export interface AIChunkResponse {
  /** 这次处理识别的卡牌数据 */
  cards: any[]
  /** 处理元数据 */
  metadata: {
    /** 处理到原文第几个字符 */
    processedUpTo: number
    /** 最后处理的5-10个字 */
    lastProcessedText: string
    /** 建议下次从哪开始(可选) */
    nextShouldStartFrom?: number
    /** 处理完整度 */
    confidence: 'complete' | 'partial'
  }
  /** AI标注的警告(可选) */
  _warnings?: AIWarning[]
}

// ==================== 处理状态 ====================

/**
 * 处理阶段
 */
export type ProcessPhase = 'parsing' | 'validating' | 'completed'

/**
 * 处理状态
 * 用于实时更新UI进度
 */
export interface ProcessState {
  /** 当前处理阶段 */
  phase: ProcessPhase
  /** 总进度百分比 (0-100) */
  progress: number
  /** 当前处理位置(字符索引) */
  currentPosition?: number
  /** 总文本长度 */
  totalLength?: number
  /** 当前处理块信息 */
  currentChunk?: {
    /** 块唯一标识 */
    id: string
    /** 块索引(从0开始) */
    index: number
    /** 总块数 */
    total: number
    /** 预估该块的卡牌数 */
    estimatedCards: number
  }
  /** 统计信息 */
  stats?: {
    /** 总块数 */
    totalChunks?: number
    /** 已处理块数 */
    processedChunks?: number
    /** 总卡牌数 */
    totalCards: number
    /** 已处理卡牌数 */
    processedCards: number
    /** 按类型统计卡牌数 */
    cardsByType: Partial<Record<CardType, number>>
  }
  /** 警告列表 */
  warnings?: AIWarning[]
  /** 错误列表 */
  errors?: ValidationError[]
}

// ==================== 警告和错误 ====================

/**
 * AI标注的警告信息
 */
export interface AIWarning {
  /** 严重程度 */
  severity: 'info' | 'warning' | 'error'
  /** 字段路径 */
  path: string
  /** 警告消息 */
  message: string
  /** 建议(可选) */
  suggestion?: string
}

/**
 * 验证错误
 */
export interface ValidationError {
  /** 字段路径 */
  path: string
  /** 错误消息 */
  message: string
  /** 错误代码(可选) */
  code?: string
}

// ==================== 解析结果 ====================

/**
 * 解析结果
 */
export interface ParseResult {
  /** 是否成功 */
  success: boolean
  /** 解析的数据(成功时) */
  data?: Partial<CardPackageState>
  /** 警告列表 */
  warnings: AIWarning[]
  /** 错误列表 */
  errors: ValidationError[]
  /** 统计信息 */
  stats?: {
    /** 总卡牌数 */
    totalCards: number
    /** 按类型统计 */
    cardsByType: Partial<Record<CardType, number>>
  }
}

// ==================== 合并选项 ====================

/**
 * JSON合并选项
 */
export interface MergeOptions {
  /** 是否按ID去重 */
  deduplicateById?: boolean
  /** 冲突策略 */
  conflictStrategy?: 'overwrite' | 'keep_existing' | 'merge'
}

// ==================== 选择的卡牌 ====================

/**
 * 用户选择的卡牌索引
 */
export interface SelectedCards {
  /** 职业卡索引 */
  profession: number[]
  /** 种族卡索引 */
  ancestry: number[]
  /** 社群卡索引 */
  community: number[]
  /** 子职业卡索引 */
  subclass: number[]
  /** 领域卡索引 */
  domain: number[]
  /** 变体卡索引 */
  variant: number[]
}

// ==================== 卡牌类型 ====================

/**
 * 卡牌类型
 */
export type CardType =
  | 'profession'
  | 'ancestry'
  | 'community'
  | 'subclass'
  | 'domain'
  | 'variant'

/**
 * 卡牌类型中文名映射
 */
export const CARD_TYPE_NAMES: Record<CardType, string> = {
  profession: '职业卡',
  ancestry: '种族卡',
  community: '社群卡',
  subclass: '子职业卡',
  domain: '领域卡',
  variant: '变体卡'
}

// ==================== AI提供商配置 ====================

/**
 * AI提供商预设
 */
export interface AIProviderPreset {
  /** 提供商名称 */
  name: string
  /** 基础URL */
  baseURL: string
  /** 可用模型列表 */
  models: string[]
  /** 是否需要自定义URL */
  customURLRequired?: boolean
}

/**
 * 预设提供商配置
 */
export const AI_PROVIDERS: Record<
  'openai' | 'claude' | 'volcengine' | 'custom',
  AIProviderPreset
> = {
  openai: {
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo']
  },
  claude: {
    name: 'Claude (OpenAI兼容)',
    baseURL: 'https://api.anthropic.com/v1',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022']
  },
  volcengine: {
    name: '火山引擎豆包 (Volcengine Ark)',
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    models: ['ep-20260104190511-tk2mc'] // 用户的模型端点
  },
  custom: {
    name: '自定义',
    baseURL: '',
    models: [],
    customURLRequired: true
  }
}
