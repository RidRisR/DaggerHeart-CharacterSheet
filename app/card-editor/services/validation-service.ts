import type { CardPackageState, CardType } from '../types'
import type { ValidationError, ValidationContext } from '@/card/type-validators'

// Re-export ValidationError for use in other modules
export type { ValidationError }

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  totalCards: number
  errorsByType: Record<CardType, ValidationError[]>
  summary: {
    totalErrors: number
    errorsByType: Record<CardType, number>
  }
}

export interface CardValidationService {
  validatePackage(packageData: CardPackageState): Promise<ValidationResult>
  validateCard(type: CardType, card: unknown, packageData: CardPackageState): ValidationResult
  validateCardField(type: CardType, card: unknown, fieldName: string, packageData: CardPackageState): ValidationError | null
}

class ValidationService implements CardValidationService {
  
  /**
   * 验证整个卡包
   */
  async validatePackage(packageData: CardPackageState): Promise<ValidationResult> {
    try {
      // 动态导入验证器以避免循环依赖
      const { CardTypeValidator } = await import('@/card/type-validators')
      
      // 创建验证上下文
      const context = this.createValidationContext(packageData)
      
      // 准备导入数据格式
      const importData = {
        name: packageData.name,
        version: packageData.version,
        description: packageData.description,
        author: packageData.author,
        customFieldDefinitions: packageData.customFieldDefinitions,
        profession: packageData.profession || [],
        ancestry: packageData.ancestry || [],
        community: packageData.community || [],
        subclass: packageData.subclass || [],
        domain: packageData.domain || [],
        variant: packageData.variant || []
      }
      
      // 使用现有的验证器
      const validationResult = CardTypeValidator.validateImportData(importData, context)
      
      // 添加血统卡配对验证
      const ancestryPairErrors = this.validateAncestryPairs(packageData.ancestry as any[] || [])
      if (ancestryPairErrors.length > 0) {
        validationResult.errors.push(...ancestryPairErrors)
        validationResult.isValid = false
      }
      
      // 将验证结果转换为我们的格式
      return this.formatValidationResult(validationResult)
      
    } catch (error) {
      console.error('验证过程中发生错误:', error)
      return {
        isValid: false,
        errors: [{
          path: 'system',
          message: `验证系统错误: ${error instanceof Error ? error.message : '未知错误'}`
        }],
        totalCards: 0,
        errorsByType: {} as Record<CardType, ValidationError[]>,
        summary: {
          totalErrors: 1,
          errorsByType: {} as Record<CardType, number>
        }
      }
    }
  }

  /**
   * 验证单个卡牌
   */
  validateCard(type: CardType, card: unknown, packageData: CardPackageState): ValidationResult {
    try {
      // 创建验证上下文
      const context = this.createValidationContext(packageData)
      
      // 根据卡牌类型选择合适的验证器
      const { validateProfessionCard, validateAncestryCard, validateVariantCard } = require('@/card/type-validators')
      
      let validationResult
      switch (type) {
        case 'profession':
          validationResult = validateProfessionCard(card, 0, undefined, context)
          break
        case 'ancestry':
          validationResult = validateAncestryCard(card, 0, undefined, context)
          break
        case 'variant':
          validationResult = validateVariantCard(card, 0, undefined, context)
          break
        default:
          return {
            isValid: false,
            errors: [{ path: type, message: `不支持的卡牌类型: ${type}` }],
            totalCards: 1,
            errorsByType: { [type]: [{ path: type, message: `不支持的卡牌类型: ${type}` }] } as Record<CardType, ValidationError[]>,
            summary: { totalErrors: 1, errorsByType: { [type]: 1 } as Record<CardType, number> }
          }
      }
      
      // 格式化单卡验证结果
      const errorsByType = {} as Record<CardType, ValidationError[]>
      if (validationResult.errors.length > 0) {
        errorsByType[type] = validationResult.errors
      }
      
      const errorsByTypeCount = {} as Record<CardType, number>
      if (validationResult.errors.length > 0) {
        errorsByTypeCount[type] = validationResult.errors.length
      }
      
      return {
        isValid: validationResult.isValid,
        errors: validationResult.errors,
        totalCards: 1,
        errorsByType,
        summary: {
          totalErrors: validationResult.errors.length,
          errorsByType: errorsByTypeCount
        }
      }
      
    } catch (error) {
      console.error('单卡验证过程中发生错误:', error)
      return {
        isValid: false,
        errors: [{
          path: type,
          message: `验证错误: ${error instanceof Error ? error.message : '未知错误'}`
        }],
        totalCards: 1,
        errorsByType: { [type]: [{
          path: type,
          message: `验证错误: ${error instanceof Error ? error.message : '未知错误'}`
        }] } as Record<CardType, ValidationError[]>,
        summary: {
          totalErrors: 1,
          errorsByType: { [type]: 1 } as Record<CardType, number>
        }
      }
    }
  }

  /**
   * 验证单个卡牌字段
   */
  validateCardField(type: CardType, card: unknown, fieldName: string, packageData: CardPackageState): ValidationError | null {
    try {
      // 使用单卡验证，然后过滤出指定字段的错误
      const cardValidationResult = this.validateCard(type, card, packageData)
      
      // 查找与指定字段相关的错误
      const fieldError = cardValidationResult.errors.find(error => {
        const fieldPath = error.path.split('.').pop()
        return fieldPath === fieldName
      })
      
      return fieldError || null
    } catch (error) {
      console.error(`验证字段 ${fieldName} 时发生错误:`, error)
      return {
        path: `${type}.${fieldName}`,
        message: '字段验证失败'
      }
    }
  }

  /**
   * 创建验证上下文
   */
  private createValidationContext(packageData: CardPackageState): ValidationContext {
    // 从卡包数据中提取自定义字段定义
    const customFieldDefinitions = packageData.customFieldDefinitions || {}
    
    // 确保自定义字段定义是字符串数组格式
    const ensureStringArray = (field: string[] | Record<string, any> | undefined): string[] => {
      if (Array.isArray(field)) {
        return field
      }
      if (field && typeof field === 'object') {
        return Object.keys(field)
      }
      return []
    }
    
    return {
      customFields: {
        professions: ensureStringArray(customFieldDefinitions.professions),
        ancestries: ensureStringArray(customFieldDefinitions.ancestries),
        communities: ensureStringArray(customFieldDefinitions.communities),
        domains: ensureStringArray(customFieldDefinitions.domains),
        variants: ensureStringArray(customFieldDefinitions.variants)
      },
      variantTypes: customFieldDefinitions.variantTypes || {},
      tempBatchId: 'validation_context'
    }
  }

  /**
   * 验证血统卡配对
   */
  private validateAncestryPairs(ancestryCards: any[]): ValidationError[] {
    const errors: ValidationError[] = []
    const pairMap = new Map<string, any[]>()
    
    // 只按种族分组（不再检查简介一致性）
    ancestryCards.forEach((card, index) => {
      const key = card.种族
      if (!pairMap.has(key)) {
        pairMap.set(key, [])
      }
      pairMap.get(key)!.push({ ...card, originalIndex: index })
    })
    
    // 检查每个分组
    pairMap.forEach((cards, 种族) => {
      // 检查是否有两张卡
      if (cards.length !== 2) {
        if (cards.length === 1) {
          errors.push({
            path: `ancestry[${cards[0].originalIndex}]`,
            message: `血统"${种族}"缺少配对卡片。每个种族必须有类别1和类别2两张卡片`
          })
        } else if (cards.length > 2) {
          cards.forEach(card => {
            errors.push({
              path: `ancestry[${card.originalIndex}]`,
              message: `血统"${种族}"有${cards.length}张卡片，但应该只有2张（类别1和类别2）`
            })
          })
        }
        return
      }
      
      // 检查类别
      const categories = cards.map(c => c.类别).sort()
      if (categories[0] !== 1 || categories[1] !== 2) {
        errors.push({
          path: `ancestry.${种族}`,
          message: `血统"${种族}"的两张卡片类别不正确。应该分别为1和2，实际为${categories.join('和')}`
        })
      }
    })
    
    return errors
  }

  /**
   * 格式化验证结果
   */
  private formatValidationResult(validationResult: { isValid: boolean; errors: ValidationError[]; totalCards: number }): ValidationResult {
    // 按卡牌类型分组错误
    const errorsByType = {} as Record<CardType, ValidationError[]>
    const errorsByTypeCount = {} as Record<CardType, number>
    
    // 初始化所有卡牌类型的错误数组
    const cardTypes: CardType[] = ['profession', 'ancestry', 'community', 'subclass', 'domain', 'variant']
    cardTypes.forEach(type => {
      errorsByType[type] = []
      errorsByTypeCount[type] = 0
    })
    
    // 分组错误
    validationResult.errors.forEach(error => {
      // 从错误路径中提取卡牌类型
      const pathParts = error.path.split('[')[0] // 例如 "profession[0].名称" -> "profession"
      const cardType = pathParts as CardType
      
      if (cardTypes.includes(cardType)) {
        errorsByType[cardType].push(error)
        errorsByTypeCount[cardType]++
      } else {
        // 如果无法识别类型，放到variant类别作为默认
        errorsByType.variant.push(error)
        errorsByTypeCount.variant++
      }
    })
    
    return {
      isValid: validationResult.isValid,
      errors: validationResult.errors,
      totalCards: validationResult.totalCards,
      errorsByType,
      summary: {
        totalErrors: validationResult.errors.length,
        errorsByType: errorsByTypeCount
      }
    }
  }
}

// 导出单例实例
export const validationService = new ValidationService()