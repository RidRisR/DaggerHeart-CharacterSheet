import { StandardCard, CardSource, ExtendedStandardCard } from "@/card/card-types";
import { SheetData } from "./sheet-data";

/**
 * 生成 sheet 自定义卡牌的唯一 ID
 * 格式: sheet-custom-{characterId}-{timestamp}-{random}
 *
 * @param characterId - 当前角色ID
 * @returns 生成的卡牌ID
 */
export function generateSheetCustomCardId(characterId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6); // 4位随机字符串
  return `sheet-custom-${characterId}-${timestamp}-${random}`;
}

/**
 * 检测卡牌是否为 sheet 自定义卡牌
 *
 * @param card - 要检测的卡牌
 * @returns 如果是 sheet 自定义卡牌返回 true，否则返回 false
 */
export function isSheetCustomCard(card: StandardCard): boolean {
  // 检查是否有 source 字段且为 ADHOC
  const extCard = card as ExtendedStandardCard;
  if (extCard.source === CardSource.ADHOC) {
    return true;
  }

  // 备用检测：检查 ID 是否以 sheet-custom- 开头
  return card.id.startsWith('sheet-custom-');
}

/**
 * 检测卡牌ID是否与 sheet-data 中的现有卡牌冲突
 *
 * @param cardId - 要检测的卡牌ID
 * @param sheetData - 角色数据
 * @returns 如果ID冲突返回 true，否则返回 false
 */
export function checkIdConflict(cardId: string, sheetData: SheetData): boolean {
  // 检查聚焦卡组
  if (sheetData.cards && sheetData.cards.some(card => card.id === cardId)) {
    return true;
  }

  // 检查库存卡组
  if (sheetData.inventory_cards && sheetData.inventory_cards.some(card => card.id === cardId)) {
    return true;
  }

  return false;
}

/**
 * 从 sheet 自定义卡牌ID中提取角色ID
 *
 * @param cardId - 卡牌ID
 * @returns 如果是有效的 sheet 自定义卡牌ID，返回角色ID；否则返回 null
 */
export function extractCharacterIdFromCustomCard(cardId: string): string | null {
  // 格式: sheet-custom-{characterId}-{timestamp}-{random}
  if (!cardId.startsWith('sheet-custom-')) {
    return null;
  }

  const parts = cardId.split('-');
  // sheet-custom-{characterId}-{timestamp}-{random}
  // parts[0] = 'sheet'
  // parts[1] = 'custom'
  // parts[2...n-2] = characterId (可能包含 '-')
  // parts[n-1] = random
  // parts[n-2] = timestamp

  if (parts.length < 5) {
    return null;
  }

  // 提取中间部分作为 characterId (去掉前两个部分 'sheet' 'custom' 和最后两个部分 timestamp random)
  const characterIdParts = parts.slice(2, -2);
  return characterIdParts.join('-');
}
