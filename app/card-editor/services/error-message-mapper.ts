import type { ValidationError } from '../services/validation-service'
import type { CardType } from '../types'

export interface FriendlyError {
  title: string
  description: string
  suggestion: string
  severity: 'error' | 'warning'
  cardType: CardType | 'general'
  cardIndex?: number
  field?: string
}

const CARD_TYPE_NAMES: Record<CardType, string> = {
  profession: '职业',
  ancestry: '祖先',
  community: '群体',
  subclass: '子职业',
  domain: '领域',
  variant: '变体'
}

const FIELD_NAMES: Record<string, string> = {
  'id': '卡牌ID',
  '名称': '名称',
  '简介': '简介',
  '领域1': '第一领域',
  '领域2': '第二领域',
  '职业特性': '职业特性',
  '属性': '属性',
  '等级': '等级',
  '类型': '类型',
  '描述': '描述',
  '变体类型': '变体类型',
  '子类': '子类',
  '群体': '群体',
  '传承': '传承',
  'customFieldDefinitions': '自定义字段定义'
}

/**
 * 解析错误路径，提取卡牌类型、索引和字段信息
 */
function parseErrorPath(path: string): { cardType?: CardType, cardIndex?: number, field?: string } {
  // 匹配模式: profession[0].名称 或 system 或 general
  const match = path.match(/^(\w+)(?:\[(\d+)\])?(?:\.(.+))?$/)
  
  if (!match) {
    return {}
  }
  
  const [, cardType, indexStr, field] = match
  
  const result: any = {}
  
  if (cardType && ['profession', 'ancestry', 'community', 'subclass', 'domain', 'variant'].includes(cardType)) {
    result.cardType = cardType as CardType
  }
  
  if (indexStr) {
    result.cardIndex = parseInt(indexStr, 10)
  }
  
  if (field) {
    result.field = field
  }
  
  return result
}

/**
 * 生成用户友好的错误标题
 */
function generateFriendlyTitle(cardType?: CardType, cardIndex?: number, field?: string): string {
  if (!cardType) {
    return '系统错误'
  }
  
  const cardTypeName = CARD_TYPE_NAMES[cardType] || cardType
  const cardNumberText = cardIndex !== undefined ? `第${cardIndex + 1}张` : ''
  const fieldName = field ? FIELD_NAMES[field] || field : ''
  
  if (fieldName) {
    return `${cardNumberText}${cardTypeName}卡片的${fieldName}有问题`
  } else {
    return `${cardNumberText}${cardTypeName}卡片有问题`
  }
}

/**
 * 根据错误消息内容生成建议和描述
 */
function generateSuggestionAndDescription(message: string, field?: string): { description: string, suggestion: string } {
  // 必需字段错误
  if (message.includes('必需') || message.includes('required')) {
    return {
      description: `${FIELD_NAMES[field || ''] || '该字段'}不能为空`,
      suggestion: '请填写这个必需的字段内容'
    }
  }
  
  // 类型错误
  if (message.includes('必须是字符串') || message.includes('string')) {
    return {
      description: '字段内容格式不正确',
      suggestion: '请输入文本内容，不要留空'
    }
  }
  
  // 无效选项错误
  if (message.includes('有效选项') || message.includes('有效的')) {
    const validOptionsMatch = message.match(/有效选项:\s*([^(]+)/)
    const validOptions = validOptionsMatch ? validOptionsMatch[1].trim() : ''
    
    return {
      description: '选择的选项不在有效范围内',
      suggestion: validOptions ? `请从以下选项中选择：${validOptions}` : '请选择一个有效的选项或添加自定义字段'
    }
  }
  
  // 数组相关错误
  if (message.includes('数组') || message.includes('array')) {
    return {
      description: '列表格式不正确',
      suggestion: '请确保内容格式正确，如有多项请用逗号分隔'
    }
  }
  
  // ValidationContext错误
  if (message.includes('ValidationContext')) {
    return {
      description: '系统验证配置有误',
      suggestion: '这是系统内部错误，请刷新页面重试'
    }
  }
  
  // ID相关错误
  if (field === 'id' || message.includes('id')) {
    return {
      description: '卡牌标识符缺失或格式错误',
      suggestion: '请确保每张卡片都有唯一的标识符'
    }
  }
  
  // 默认情况
  return {
    description: '字段内容不符合要求',
    suggestion: '请检查并修正该字段的内容'
  }
}

/**
 * 确定错误严重程度
 */
function determineErrorSeverity(message: string, field?: string): 'error' | 'warning' {
  // 系统错误总是严重的
  if (message.includes('ValidationContext') || message.includes('系统错误')) {
    return 'error'
  }
  
  // 必需字段错误是严重的
  if (message.includes('必需') || message.includes('required')) {
    return 'error'
  }
  
  // ID错误是严重的
  if (field === 'id') {
    return 'error'
  }
  
  // 其他情况视为警告
  return 'warning'
}

/**
 * 将原始验证错误转换为用户友好的错误信息
 */
export function mapValidationErrorsToFriendly(errors: ValidationError[]): FriendlyError[] {
  return errors.map(error => {
    const { cardType, cardIndex, field } = parseErrorPath(error.path)
    const title = generateFriendlyTitle(cardType, cardIndex, field)
    const { description, suggestion } = generateSuggestionAndDescription(error.message, field)
    const severity = determineErrorSeverity(error.message, field)
    
    return {
      title,
      description,
      suggestion,
      severity,
      cardType: cardType || 'general',
      cardIndex,
      field
    }
  })
}

/**
 * 按严重程度和卡牌类型分组友好错误
 */
export function groupFriendlyErrors(friendlyErrors: FriendlyError[]): {
  critical: FriendlyError[]
  warnings: FriendlyError[]
  byCardType: Record<string, FriendlyError[]>
} {
  const critical = friendlyErrors.filter(error => error.severity === 'error')
  const warnings = friendlyErrors.filter(error => error.severity === 'warning')
  
  const byCardType: Record<string, FriendlyError[]> = {}
  friendlyErrors.forEach(error => {
    const key = error.cardType === 'general' ? '系统' : CARD_TYPE_NAMES[error.cardType as CardType]
    if (!byCardType[key]) {
      byCardType[key] = []
    }
    byCardType[key].push(error)
  })
  
  return { critical, warnings, byCardType }
}

/**
 * 生成修复进度摘要
 */
export function generateFixSummary(friendlyErrors: FriendlyError[]): {
  totalIssues: number
  criticalIssues: number
  warningIssues: number
  affectedCardTypes: string[]
} {
  const totalIssues = friendlyErrors.length
  const criticalIssues = friendlyErrors.filter(e => e.severity === 'error').length
  const warningIssues = friendlyErrors.filter(e => e.severity === 'warning').length
  
  const cardTypeSet = new Set<string>()
  friendlyErrors.forEach(error => {
    if (error.cardType !== 'general') {
      cardTypeSet.add(CARD_TYPE_NAMES[error.cardType as CardType])
    } else {
      cardTypeSet.add('系统')
    }
  })
  
  return {
    totalIssues,
    criticalIssues,
    warningIssues,
    affectedCardTypes: Array.from(cardTypeSet)
  }
}