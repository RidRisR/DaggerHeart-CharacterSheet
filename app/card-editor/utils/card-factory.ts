import type { ProfessionCard, AncestryCard, RawVariantCard } from '@/card/card-types'
import type { CommunityCard } from '@/card/community-card/convert'
import type { SubClassCard } from '@/card/subclass-card/convert'
import type { DomainCard } from '@/card/domain-card/convert'
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
        等级: '',
        简略信息: {
          item1: '',
          item2: '',
          item3: '',
          item4: ''
        }
      } as RawVariantCard
    case 'community':
      const communityName = '新社群'
      return {
        id: generateSmartCardId(packageData.name || '新建卡包', packageData.author || '作者', 'community', communityName, packageData),
        名称: communityName,
        社群: '',
        社群能力: '',
        简介: '',
        效果: ''
      } as CommunityCard
    case 'subclass':
      const subclassName = '新子职业'
      return {
        id: generateSmartCardId(packageData.name || '新建卡包', packageData.author || '作者', 'subclass', subclassName, packageData),
        名称: subclassName,
        主职业: '',
        等级: '基石',
        施法属性: '',
        简介: '',
        效果: ''
      } as SubClassCard
    case 'domain':
      const domainName = '新领域'
      return {
        id: generateSmartCardId(packageData.name || '新建卡包', packageData.author || '作者', 'domain', domainName, packageData),
        名称: domainName,
        领域: '',
        属性: '',
        等级: 1,
        回想: '',
        简介: '',
        效果: ''
      } as DomainCard
    default:
      return {}
  }
}

// 复制现有卡牌，生成新的ID和名称
export function copyCard(originalCard: unknown, type: CardType, packageData: CardPackageState): unknown {
  if (!originalCard || typeof originalCard !== 'object') {
    return createDefaultCard(type, packageData)
  }

  // 深拷贝原卡牌数据
  const copiedCard = JSON.parse(JSON.stringify(originalCard)) as any
  
  // 生成新的ID
  const originalName = copiedCard.名称 || '未命名'
  const newName = `${originalName} - 副本`
  copiedCard.名称 = newName
  
  // 生成新的唯一ID
  copiedCard.id = generateSmartCardId(
    packageData.name || '新建卡包', 
    packageData.author || '作者', 
    type, 
    newName, 
    packageData
  )
  
  // 特殊处理变体卡牌的简略信息字段，确保结构完整
  if (type === 'variant') {
    if (!copiedCard.简略信息 || typeof copiedCard.简略信息 !== 'object') {
      copiedCard.简略信息 = {
        item1: '',
        item2: '',
        item3: '',
        item4: ''
      }
    } else {
      // 确保所有必需的item字段都存在
      copiedCard.简略信息 = {
        item1: copiedCard.简略信息.item1 || '',
        item2: copiedCard.简略信息.item2 || '',
        item3: copiedCard.简略信息.item3 || '',
        item4: copiedCard.简略信息.item4 || ''
      }
    }
  }
  
  return copiedCard
}