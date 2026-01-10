/**
 * 结果解析器
 *
 * 解析AI输出,提取警告并验证数据
 */

import type { ParseResult, AIWarning, CardType } from './ai-types'
import type { CardPackageState } from '@/app/card-editor/types'
import { countCards, countCardsByType } from './json-merger'

/**
 * 结果解析器
 */
export class ResultParser {
  /**
   * 解析AI输出的JSON
   */
  async parse(data: Partial<CardPackageState>): Promise<ParseResult> {
    try {
      // 1. 提取AI标注的警告
      const warnings = this.extractWarnings(data)

      // 2. 数据验证
      const errors = await this.validate(data)

      // 3. 统计信息
      const stats = {
        totalCards: countCards(data),
        cardsByType: countCardsByType(data)
      }

      return {
        success: errors.length === 0,
        data,
        warnings,
        errors,
        stats
      }
    } catch (error) {
      return {
        success: false,
        warnings: [],
        errors: [
          {
            path: 'root',
            message: `解析失败: ${error instanceof Error ? error.message : '未知错误'}`
          }
        ]
      }
    }
  }

  /**
   * 从数据中提取AI标注的警告
   */
  private extractWarnings(data: any): AIWarning[] {
    const warnings: AIWarning[] = []

    // 从_warnings字段提取
    if (data._warnings && Array.isArray(data._warnings)) {
      warnings.push(...data._warnings)
      // 清理_warnings字段(不需要保存到最终数据)
      delete data._warnings
    }

    // 从各个卡牌中提取_note或_warning字段
    const cardTypes: CardType[] = [
      'profession',
      'ancestry',
      'community',
      'subclass',
      'domain',
      'variant'
    ]

    cardTypes.forEach((type) => {
      const cards = data[type]
      if (!cards || !Array.isArray(cards)) return

      cards.forEach((card: any, index: number) => {
        if (card._note) {
          warnings.push({
            severity: 'info',
            path: `${type}[${index}]`,
            message: card._note
          })
          delete card._note
        }

        if (card._warning) {
          warnings.push({
            severity: 'warning',
            path: `${type}[${index}]`,
            message: card._warning
          })
          delete card._warning
        }
      })
    })

    return warnings
  }

  /**
   * 验证数据
   */
  private async validate(data: Partial<CardPackageState>) {
    try {
      // 动态导入验证服务(避免循环依赖)
      const { validationService } = await import('./validation-service')

      // 构造完整的CardPackageState(填充缺失字段)
      const fullData: CardPackageState = {
        name: data.name || 'AI转换卡包',
        version: data.version || '1.0.0',
        author: data.author || '',
        description: data.description || '',
        customFieldDefinitions: data.customFieldDefinitions || {},
        profession: data.profession || [],
        ancestry: data.ancestry || [],
        community: data.community || [],
        subclass: data.subclass || [],
        domain: data.domain || [],
        variant: data.variant || []
      }

      const result = await validationService.validatePackage(fullData)
      return result.errors
    } catch (error) {
      console.error('[ResultParser] 验证失败:', error)
      // 验证失败不影响整体流程,返回空数组
      return []
    }
  }

  /**
   * 统计警告数量
   */
  countWarningsBySeverity(warnings: AIWarning[]): {
    info: number
    warning: number
    error: number
  } {
    return {
      info: warnings.filter((w) => w.severity === 'info').length,
      warning: warnings.filter((w) => w.severity === 'warning').length,
      error: warnings.filter((w) => w.severity === 'error').length
    }
  }

  /**
   * 按类型分组警告
   */
  groupWarningsByType(warnings: AIWarning[]): Record<string, AIWarning[]> {
    const groups: Record<string, AIWarning[]> = {}

    warnings.forEach((warning) => {
      // 从path中提取类型 (如 "profession[0].领域1" -> "profession")
      const match = warning.path.match(/^([a-z]+)/)
      const type = match ? match[1] : 'other'

      if (!groups[type]) {
        groups[type] = []
      }
      groups[type].push(warning)
    })

    return groups
  }
}

/**
 * 单例导出
 */
export const resultParser = new ResultParser()
