/**
 * Card Data Transformer
 * 将编辑表单数据实时转换为 StandardCard 格式用于预览
 */

import type { StandardCard } from '@/card/card-types'
import type { ProfessionCard } from '@/card/profession-card/convert'
import type { AncestryCard } from '@/card/ancestry-card/convert'
import type { CommunityCard } from '@/card/community-card/convert'
import type { RawVariantCard } from '@/card/variant-card/convert'
import { professionCardConverter } from '@/card/profession-card/convert'
import { ancestryCardConverter } from '@/card/ancestry-card/convert'
import { communityCardConverter } from '@/card/community-card/convert'
import { variantCardConverter } from '@/card/variant-card/convert'
import { createEmptyCard } from '@/card/card-converter'

/**
 * 转换职业卡牌数据为标准格式
 */
export function transformProfessionCard(card: ProfessionCard): StandardCard {
  try {
    if (!card) return createEmptyCard('profession')
    return professionCardConverter.toStandard(card)
  } catch (error) {
    console.error('[transformProfessionCard] 转换失败:', error)
    return createEmptyCard('profession')
  }
}

/**
 * 转换血统卡牌数据为标准格式
 */
export function transformAncestryCard(card: AncestryCard): StandardCard {
  try {
    if (!card) return createEmptyCard('ancestry')
    return ancestryCardConverter.toStandard(card)
  } catch (error) {
    console.error('[transformAncestryCard] 转换失败:', error)
    return createEmptyCard('ancestry')
  }
}

/**
 * 转换社群卡牌数据为标准格式
 */
export function transformCommunityCard(card: CommunityCard): StandardCard {
  try {
    if (!card) return createEmptyCard('community')
    return communityCardConverter.toStandard(card)
  } catch (error) {
    console.error('[transformCommunityCard] 转换失败:', error)
    return createEmptyCard('community')
  }
}

/**
 * 转换变体卡牌数据为标准格式
 */
export function transformVariantCard(card: RawVariantCard): StandardCard {
  try {
    if (!card) return createEmptyCard('variant')
    return variantCardConverter.toStandard(card)
  } catch (error) {
    console.error('[transformVariantCard] 转换失败:', error)
    return createEmptyCard('variant')
  }
}

/**
 * 通用转换函数，根据卡牌类型自动选择转换器
 */
export function transformCardToStandard(
  card: ProfessionCard | AncestryCard | CommunityCard | RawVariantCard | any,
  cardType: 'profession' | 'ancestry' | 'community' | 'variant'
): StandardCard {
  switch (cardType) {
    case 'profession':
      return transformProfessionCard(card as ProfessionCard)
    case 'ancestry':
      return transformAncestryCard(card as AncestryCard)
    case 'community':
      return transformCommunityCard(card as CommunityCard)
    case 'variant':
      return transformVariantCard(card as RawVariantCard)
    default:
      console.warn(`[transformCardToStandard] 未知的卡牌类型: ${cardType}`)
      return createEmptyCard(cardType)
  }
}

/**
 * 为预览添加水印或标识
 */
export function addPreviewWatermark(card: StandardCard): StandardCard {
  return {
    ...card,
    // 可以在这里添加预览标识，例如修改名称或添加特殊标记
    // name: `${card.name} (预览)`,
    // 或者添加一个特殊字段供 ImageCard 组件识别
    // isPreview: true
  }
}