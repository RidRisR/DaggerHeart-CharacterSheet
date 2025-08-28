import { toast } from 'sonner'
import type { ImportData } from '@/card/card-types'
import type { CardPackageState } from '../types'

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