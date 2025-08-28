import type { ProfessionCard, AncestryCard, RawVariantCard } from '@/card/card-types'
import type { CardPackageState } from '../types'

// 创建默认卡牌
export function createDefaultCard(type: string, packageData: CardPackageState): unknown {
  const baseId = `${packageData.name || '新建卡包'}-${packageData.author || '作者'}`
  
  switch (type) {
    case 'profession':
      return {
        id: `${baseId}-prof-新职业`,
        名称: '新职业',
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
      return {
        id: `${baseId}-ance-新能力`,
        名称: '新能力',
        种族: '',
        简介: '',
        效果: '',
        类别: 1
      } as AncestryCard
    case 'variant':
      return {
        id: `${baseId}-vari-新物品`,
        名称: '新物品',
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