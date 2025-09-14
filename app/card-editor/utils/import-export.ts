import { toast } from 'sonner'
import type { ImportData } from '@/card/card-types'
import type { AncestryCard } from '@/card/ancestry-card/convert'
import type { SubClassCard } from '@/card/subclass-card/convert'
import type { CardPackageState } from '../types'
import { createDefaultCard } from './card-factory'

// 创建空白种族卡
export function createBlankAncestryCard(packageData: CardPackageState, referenceCard: AncestryCard, category: 1 | 2): AncestryCard {
  const blankCard = createDefaultCard('ancestry', packageData) as AncestryCard

  // 复制关键字段确保配对关系
  blankCard.种族 = referenceCard.种族 || '新种族'
  blankCard.简介 = referenceCard.简介 || ''
  blankCard.类别 = category
  blankCard.名称 = `${referenceCard.种族 || '新种族'}能力${category}`
  blankCard.效果 = `${category === 1 ? '基础' : '进阶'}能力效果`

  return blankCard
}

// 创建空白子职业卡
export function createBlankSubclassCard(packageData: CardPackageState, referenceCard: SubClassCard, level: '基石' | '专精' | '大师'): SubClassCard {
  const blankCard = createDefaultCard('subclass', packageData) as SubClassCard

  // 复制关键字段确保分组关系
  blankCard.子职业 = referenceCard.子职业 || '新子职业'
  blankCard.主职 = referenceCard.主职 || referenceCard.子职业 || '新主职'
  blankCard.等级 = level
  blankCard.名称 = `${referenceCard.子职业 || '新子职业'}${level}`
  blankCard.描述 = `${level}等级能力描述`
  blankCard.施法 = referenceCard.施法 || ''

  return blankCard
}

// 确保种族卡配对完整（原fixAncestryPairs功能增强版）
export function ensureAncestryPairs(ancestryCards: AncestryCard[], packageData: CardPackageState): AncestryCard[] {
  if (!ancestryCards || ancestryCards.length === 0) return ancestryCards

  const pairMap = new Map<string, { card1?: AncestryCard, card2?: AncestryCard, intro?: string }>()

  // 按种族+简介组合分组（更精确的分组条件）
  ancestryCards.forEach(card => {
    const groupKey = `${card.种族}-${card.简介}`
    if (!pairMap.has(groupKey)) {
      pairMap.set(groupKey, {})
    }
    const group = pairMap.get(groupKey)!

    if (card.类别 === 1) {
      group.card1 = card
      group.intro = card.简介
    } else if (card.类别 === 2) {
      group.card2 = card
      // 如果没有类别1卡片设定简介，使用类别2的
      if (!group.intro) {
        group.intro = card.简介
      }
    }
  })

  const completeCards: AncestryCard[] = []

  // 处理每个分组
  pairMap.forEach(group => {
    if (group.card1 && group.card2) {
      // 完整配对，修复简介不一致问题
      if (group.card1.简介 !== group.card2.简介) {
        console.log(`[Import] 同步种族"${group.card1.种族}"的简介：从类别1覆盖类别2`)
        group.card2.简介 = group.card1.简介
      }
      completeCards.push(group.card1, group.card2)
    } else if (group.card1) {
      // 只有类别1，创建配对的类别2
      console.log(`[Import] 种族"${group.card1.种族}"缺少类别2卡片，自动创建空白配对`)
      const blankCard2 = createBlankAncestryCard(packageData, group.card1, 2)
      completeCards.push(group.card1, blankCard2)
    } else if (group.card2) {
      // 只有类别2，创建配对的类别1
      console.log(`[Import] 种族"${group.card2.种族}"缺少类别1卡片，自动创建空白配对`)
      const blankCard1 = createBlankAncestryCard(packageData, group.card2, 1)
      completeCards.push(blankCard1, group.card2)
    }
  })

  return completeCards
}

// 确保子职业卡三卡组完整
export function ensureSubclassTriples(subclassCards: SubClassCard[], packageData: CardPackageState): SubClassCard[] {
  if (!subclassCards || subclassCards.length === 0) return subclassCards

  const tripleMap = new Map<string, {
    基石?: SubClassCard,
    专精?: SubClassCard,
    大师?: SubClassCard,
    referenceCard?: SubClassCard  // 用于创建空白卡的参考
  }>()

  // 按子职业+主职组合分组
  subclassCards.forEach(card => {
    const groupKey = `${card.子职业}-${card.主职}`
    if (!tripleMap.has(groupKey)) {
      tripleMap.set(groupKey, {})
    }
    const group = tripleMap.get(groupKey)!

    // 设置参考卡片（用于创建空白卡时复制字段）
    if (!group.referenceCard) {
      group.referenceCard = card
    }

    if (card.等级 === '基石') {
      group.基石 = card
    } else if (card.等级 === '专精') {
      group.专精 = card
    } else if (card.等级 === '大师') {
      group.大师 = card
    }
  })

  const completeCards: SubClassCard[] = []

  // 处理每个分组，确保三卡组完整
  tripleMap.forEach(group => {
    const ref = group.referenceCard!
    const groupName = `${ref.子职业}(${ref.主职})`

    // 确保基石卡存在
    if (!group.基石) {
      console.log(`[Import] 子职业"${groupName}"缺少基石卡片，自动创建空白卡`)
      group.基石 = createBlankSubclassCard(packageData, ref, '基石')
    }

    // 确保专精卡存在
    if (!group.专精) {
      console.log(`[Import] 子职业"${groupName}"缺少专精卡片，自动创建空白卡`)
      group.专精 = createBlankSubclassCard(packageData, ref, '专精')
    }

    // 确保大师卡存在
    if (!group.大师) {
      console.log(`[Import] 子职业"${groupName}"缺少大师卡片，自动创建空白卡`)
      group.大师 = createBlankSubclassCard(packageData, ref, '大师')
    }

    // 按基石-专精-大师顺序添加到结果
    completeCards.push(group.基石, group.专精, group.大师)
  })

  return completeCards
}

// 导出卡包
export function exportCardPackage(data: CardPackageState): void {
  const exportData = { ...data }
  // 移除编辑器状态字段
  delete exportData.isModified
  delete exportData.lastSaved
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${data.name || '卡包'}.json`
  a.click()
  URL.revokeObjectURL(url)
  toast.success('卡包已导出')
}

// 导入卡包
export function importCardPackage(): Promise<CardPackageState | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) {
        resolve(null)
        return
      }

      try {
        const text = await file.text()
        const importedData = JSON.parse(text) as ImportData
        
        // 创建临时的包数据用于生成ID
        const tempPackageData: CardPackageState = {
          ...importedData,
          name: importedData.name || '导入卡包',
          author: importedData.author || '未知作者',
          isModified: false,
          lastSaved: new Date()
        }

        // 整理种族卡配对（修复简介不一致 + 自动补全缺失配对）
        if (importedData.ancestry && Array.isArray(importedData.ancestry)) {
          console.log(`[Import] 开始整理 ${importedData.ancestry.length} 张种族卡`)
          importedData.ancestry = ensureAncestryPairs(importedData.ancestry as AncestryCard[], tempPackageData)
          console.log(`[Import] 整理完成，共 ${importedData.ancestry.length} 张种族卡`)
        }

        // 整理子职业卡三卡组（自动补全缺失的基石/专精/大师卡）
        if (importedData.subclass && Array.isArray(importedData.subclass)) {
          console.log(`[Import] 开始整理 ${importedData.subclass.length} 张子职业卡`)
          importedData.subclass = ensureSubclassTriples(importedData.subclass as SubClassCard[], tempPackageData)
          console.log(`[Import] 整理完成，共 ${importedData.subclass.length} 张子职业卡`)
        }
        
        const newPackage: CardPackageState = {
          ...importedData,
          isModified: false,
          lastSaved: new Date()
        }
        toast.success('卡包已导入')
        resolve(newPackage)
      } catch {
        toast.error('导入失败：文件格式不正确')
        resolve(null)
      }
    }
    input.click()
  })
}