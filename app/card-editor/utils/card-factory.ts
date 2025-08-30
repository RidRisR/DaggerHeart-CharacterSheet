import type { ProfessionCard, AncestryCard, RawVariantCard } from '@/card/card-types'
import type { CardPackageState, CardType } from '../types'
import { generateSmartCardId } from './id-generator'

// 创建默认卡牌
export function createDefaultCard(type: string, packageData: CardPackageState): unknown {
  
  switch (type) {
    case 'profession':
      const professionName = '新职业'
      return {
        id: generateSmartCardId(packageData.name || '新建卡包', packageData.author || '作者', 'profession', professionName, packageData),
        名称: professionName,
        简介: '',
        领域1: '',
        领域2: '',
        起始生命: 10,
        起始闪避: 8,
        起始物品: '',
        希望特性: '',
        职业特性: ''
      } as ProfessionCard
    case 'ancestry':
      const ancestryName = '新能力'
      return {
        id: generateSmartCardId(packageData.name || '新建卡包', packageData.author || '作者', 'ancestry', ancestryName, packageData),
        名称: ancestryName,
        种族: '',
        简介: '',
        效果: '',
        类别: 1
      } as AncestryCard
    case 'variant':
      const variantName = '新物品'
      return {
        id: generateSmartCardId(packageData.name || '新建卡包', packageData.author || '作者', 'variant', variantName, packageData),
        名称: variantName,
        类型: '',
        效果: '',
        子类别: '',
        等级: undefined,
        简略信息: {}
      } as RawVariantCard
    default:
      return {}
  }
}