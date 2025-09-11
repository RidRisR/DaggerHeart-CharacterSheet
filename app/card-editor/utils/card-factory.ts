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
        等级: undefined,
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
        特性: '',
        简介: '',
        描述: ''
      } as CommunityCard
    case 'subclass':
      const subclassName = '新子职业'
      return {
        id: generateSmartCardId(packageData.name || '新建卡包', packageData.author || '作者', 'subclass', subclassName, packageData),
        名称: subclassName,
        主职: '',
        子职业: '',
        等级: '基石',
        施法: '',
        描述: ''
      } as SubClassCard
    case 'domain':
      const domainName = '新领域'
      return {
        id: generateSmartCardId(packageData.name || '新建卡包', packageData.author || '作者', 'domain', domainName, packageData),
        名称: domainName,
        领域: '',
        属性: '',
        等级: 1,
        回想: 0,
        描述: ''
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
  
  // 根据卡牌类型确保所有必需字段都存在
  switch (type) {
    case 'profession':
      // 职业卡牌字段验证
      copiedCard.简介 = copiedCard.简介 || ''
      copiedCard.领域1 = copiedCard.领域1 || ''
      copiedCard.领域2 = copiedCard.领域2 || ''
      copiedCard.起始生命 = copiedCard.起始生命 || 10
      copiedCard.起始闪避 = copiedCard.起始闪避 || 8
      copiedCard.起始物品 = copiedCard.起始物品 || ''
      copiedCard.希望特性 = copiedCard.希望特性 || ''
      copiedCard.职业特性 = copiedCard.职业特性 || ''
      break
      
    case 'ancestry':
      // 种族卡牌字段验证
      copiedCard.种族 = copiedCard.种族 || ''
      copiedCard.简介 = copiedCard.简介 || ''
      copiedCard.效果 = copiedCard.效果 || ''
      copiedCard.类别 = copiedCard.类别 || 1
      break
      
    case 'variant':
      // 变体卡牌字段验证
      copiedCard.类型 = copiedCard.类型 || ''
      copiedCard.效果 = copiedCard.效果 || ''
      copiedCard.子类别 = copiedCard.子类别 || ''
      // 等级字段应该保持 undefined 如果原来是空的，或者保持原来的数字值
      copiedCard.等级 = copiedCard.等级 !== undefined ? copiedCard.等级 : undefined
      
      // 确保简略信息字段结构完整
      if (!copiedCard.简略信息 || typeof copiedCard.简略信息 !== 'object') {
        copiedCard.简略信息 = {
          item1: '',
          item2: '',
          item3: '',
          item4: ''
        }
      } else {
        copiedCard.简略信息 = {
          item1: copiedCard.简略信息.item1 || '',
          item2: copiedCard.简略信息.item2 || '',
          item3: copiedCard.简略信息.item3 || '',
          item4: copiedCard.简略信息.item4 || ''
        }
      }
      break
      
    case 'community':
      // 社群卡牌字段验证和兼容性处理
      // 处理旧字段名的兼容性
      if (copiedCard.社群能力 && !copiedCard.特性) {
        copiedCard.特性 = copiedCard.社群能力
      }
      if (copiedCard.效果 && !copiedCard.描述) {
        copiedCard.描述 = copiedCard.效果
      }
      
      // 确保新字段存在
      copiedCard.特性 = copiedCard.特性 || ''
      copiedCard.简介 = copiedCard.简介 || ''
      copiedCard.描述 = copiedCard.描述 || ''
      
      // 删除旧字段
      delete copiedCard.社群
      delete copiedCard.社群能力
      delete copiedCard.效果
      break
      
    case 'subclass':
      // 子职业卡牌字段验证和兼容性处理
      // 处理旧字段名的兼容性
      if (copiedCard.主职业 && !copiedCard.主职) {
        copiedCard.主职 = copiedCard.主职业
      }
      if (copiedCard.施法属性 && !copiedCard.施法) {
        copiedCard.施法 = copiedCard.施法属性
      }
      if (copiedCard.效果 && !copiedCard.描述) {
        copiedCard.描述 = copiedCard.效果
      }
      
      // 确保新字段存在
      copiedCard.主职 = copiedCard.主职 || ''
      copiedCard.子职业 = copiedCard.子职业 || ''
      copiedCard.等级 = copiedCard.等级 || '基石'
      copiedCard.施法 = copiedCard.施法 || ''
      copiedCard.描述 = copiedCard.描述 || ''
      
      // 删除旧字段
      delete copiedCard.主职业
      delete copiedCard.施法属性
      delete copiedCard.简介
      delete copiedCard.效果
      break
      
    case 'domain':
      // 领域卡牌字段验证和兼容性处理
      // 处理旧字段名的兼容性
      if (copiedCard.效果 && !copiedCard.描述) {
        copiedCard.描述 = copiedCard.效果
      }
      
      // 确保新字段存在
      copiedCard.领域 = copiedCard.领域 || ''
      copiedCard.属性 = copiedCard.属性 || ''
      copiedCard.等级 = copiedCard.等级 || 1
      copiedCard.回想 = copiedCard.回想 !== undefined ? copiedCard.回想 : 0
      copiedCard.描述 = copiedCard.描述 || ''
      
      // 删除旧字段
      delete copiedCard.简介
      delete copiedCard.效果
      break
  }
  
  return copiedCard
}