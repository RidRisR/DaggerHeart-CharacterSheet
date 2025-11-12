/**
 * 数字和表达式工具函数
 */

/**
 * 安全地计算表达式或解析数字
 * @param expression - 输入的字符串表达式或数字
 * @returns 计算结果的整数(向上取整),无效输入返回 0
 */
export const safeEvaluateExpression = (expression: string): number => {
  if (!expression || typeof expression !== 'string') {
    return 0;
  }

  // 移除空格
  const cleanExpression = expression.replace(/\s/g, '');

  // 只允许数字、+、-、*、/、()和小数点
  if (!/^[0-9+\-*/().]+$/.test(cleanExpression)) {
    // 如果包含非法字符,尝试解析为普通数字
    const parsed = parseInt(cleanExpression, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  try {
    // 使用 Function 构造函数来安全地计算表达式
    const result = new Function(`return ${cleanExpression}`)();

    // 确保结果是有效数字
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      return Math.ceil(result); // 向上取整,确保是整数
    }

    return 0;
  } catch (error) {
    // 如果计算失败,尝试解析为普通数字
    const parsed = parseInt(expression, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
};

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

  // 允许数字、小数点,以及开头的正负号(+/-)
  if (!/^[+-]?\d+\.?\d*$/.test(cleanValue)) {
    return false;
  }

  // 尝试解析为数字
  const parsed = parseFloat(cleanValue);
  return !isNaN(parsed) && isFinite(parsed);
};

/**
 * 安全地将字符串解析为数字
 * @param value - 输入的字符串
 * @param defaultValue - 解析失败时的默认值
 * @returns 解析后的数字
 */
export const parseToNumber = (value: string, defaultValue: number = 0): number => {
  if (!isValidNumber(value)) {
    return defaultValue;
  }

  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : Math.ceil(parsed);
};
