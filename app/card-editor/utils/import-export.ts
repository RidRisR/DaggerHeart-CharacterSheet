import { toast } from 'sonner'
import type { ImportData, AncestryCard } from '@/card/card-types'
import type { CardPackageState } from '../types'

// 修复血统卡配对的简介不一致问题
function fixAncestryPairs(ancestryCards: AncestryCard[]): AncestryCard[] {
  if (!ancestryCards || ancestryCards.length === 0) return ancestryCards
  
  const pairMap = new Map<string, AncestryCard[]>()
  
  // 按种族分组
  ancestryCards.forEach(card => {
    const race = card.种族
    if (!pairMap.has(race)) {
      pairMap.set(race, [])
    }
    pairMap.get(race)!.push(card)
  })
  
  const fixedCards: AncestryCard[] = []
  
  // 处理每个种族组
  pairMap.forEach(cards => {
    if (cards.length === 2) {
      // 找到类别1和类别2
      const card1 = cards.find(c => c.类别 === 1)
      const card2 = cards.find(c => c.类别 === 2)
      
      if (card1 && card2) {
        // 如果简介不同，用类别1的简介覆盖类别2
        if (card1.简介 !== card2.简介) {
          console.log(`[Import] 同步血统"${card1.种族}"的简介：从类别1覆盖类别2`)
          card2.简介 = card1.简介
        }
      }
      
      fixedCards.push(...cards)
    } else {
      // 不是配对的情况，直接添加
      fixedCards.push(...cards)
    }
  })
  
  return fixedCards
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
        
        // 修复血统卡配对的简介不一致问题
        if (importedData.ancestry && Array.isArray(importedData.ancestry)) {
          importedData.ancestry = fixAncestryPairs(importedData.ancestry as AncestryCard[])
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