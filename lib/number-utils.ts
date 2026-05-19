/**
 * 数字和表达式工具函数
 */

const NUMBER_PATTERN = /^[+-]?\d+\.?\d*$/
const NUMBER_EXPRESSION_PATTERN = /^[0-9+\-*/().\s]+$/

function ceilFinite(value: number): number | undefined {
  return Number.isFinite(value) ? Math.ceil(value) : undefined
}

/**
 * 判断字符串是否为有效的纯数字(不包括表达式)
 * @param value - 输入的字符串
 * @returns 是否为有效数字
 */
export const isValidNumber = (value: string): boolean => {
  if (!value || typeof value !== 'string') {
    return false;
  }

  // 移除空格
  const cleanValue = value.trim();

  // 空字符串不是有效数字
  if (cleanValue === '') {
    return false;
  }

  return NUMBER_PATTERN.test(cleanValue) && tryParseNumber(cleanValue) !== undefined
};

/**
 * 解析为纯数字；解析失败返回 undefined。
 */
export const tryParseNumber = (value: unknown): number | undefined => {
  if (typeof value === "number") return ceilFinite(value)
  if (typeof value !== "string") return undefined

  const cleanValue = value.trim()
  if (cleanValue === "" || !NUMBER_PATTERN.test(cleanValue)) return undefined

  return ceilFinite(Number(cleanValue))
};

/**
 * 解析为简单数字表达式；解析失败返回 undefined。
 */
export const tryParseNumberExpression = (value: unknown): number | undefined => {
  if (typeof value === "number") return ceilFinite(value)
  if (typeof value !== "string") return undefined

  const cleanExpression = value.replace(/\s/g, "")
  if (cleanExpression === "" || !NUMBER_EXPRESSION_PATTERN.test(value)) return undefined

  try {
    const result = new Function(`return (${cleanExpression})`)()
    return typeof result === "number" ? ceilFinite(result) : undefined
  } catch {
    return undefined
  }
}

export const parseNumberOr = (value: unknown, fallback: number): number => {
  return tryParseNumber(value) ?? fallback
}

export const parseNumberExpressionOr = (value: unknown, fallback: number): number => {
  return tryParseNumberExpression(value) ?? fallback
}

/**
 * 兼容旧 API：解析失败返回默认值。
 */
export const parseToNumber = (value: string, defaultValue: number = 0): number => {
  return parseNumberOr(value, defaultValue)
}
