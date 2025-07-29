import type { MaterialCost, ScrapMaterials } from './types'
import { MATERIAL_MAPPING } from './types'

// 检查材料是否满足需求的函数，返回 { canCraft: boolean, insufficientMaterials: string[] }
export const checkMaterialRequirements = (cost: MaterialCost, scrapMaterials: ScrapMaterials | undefined): { canCraft: boolean, insufficientMaterials: string[] } => {
  if (!scrapMaterials) return { canCraft: false, insufficientMaterials: [] }

  const insufficientMaterials: string[] = []

  // 检查碎片需求
  if (cost.fragments) {
    for (const [materialName, required] of Object.entries(cost.fragments)) {
      const index = MATERIAL_MAPPING.fragments[materialName]
      if (index === undefined) continue
      const available = scrapMaterials.fragments?.[index] || 0
      if (available < required) {
        insufficientMaterials.push(`${materialName}(缺${required - available})`)
      }
    }
  }

  // 检查金属需求
  if (cost.metals) {
    for (const [materialName, required] of Object.entries(cost.metals)) {
      const index = MATERIAL_MAPPING.metals[materialName]
      if (index === undefined) continue
      const available = scrapMaterials.metals?.[index] || 0
      if (available < required) {
        insufficientMaterials.push(`${materialName}(缺${required - available})`)
      }
    }
  }

  // 检查组件需求
  if (cost.components) {
    for (const [materialName, required] of Object.entries(cost.components)) {
      const index = MATERIAL_MAPPING.components[materialName]
      if (index === undefined) continue
      const available = scrapMaterials.components?.[index] || 0
      if (available < required) {
        insufficientMaterials.push(`${materialName}(缺${required - available})`)
      }
    }
  }

  // 检查遗物需求
  if (cost.relics) {
    const totalRelicsRequired = Object.values(cost.relics).reduce((sum, count) => sum + count, 0)
    const availableRelics = scrapMaterials.relics?.filter((relic: string) => relic.trim() !== '').length || 0
    if (availableRelics < totalRelicsRequired) {
      insufficientMaterials.push(`遗物(缺${totalRelicsRequired - availableRelics})`)
    }
  }

  return { canCraft: insufficientMaterials.length === 0, insufficientMaterials }
}

// 渲染材料需求显示
export const renderMaterialCost = (cost: MaterialCost): string => {
  const parts: string[] = []
  
  if (cost.fragments) {
    for (const [material, count] of Object.entries(cost.fragments)) {
      parts.push(`${count}${material}`)
    }
  }
  
  if (cost.metals) {
    for (const [material, count] of Object.entries(cost.metals)) {
      parts.push(`${count}${material}`)
    }
  }
  
  if (cost.components) {
    for (const [material, count] of Object.entries(cost.components)) {
      parts.push(`${count}${material}`)
    }
  }
  
  if (cost.relics) {
    for (const [material, count] of Object.entries(cost.relics)) {
      parts.push(`${count}${material}`)
    }
  }
  
  return parts.join(', ')
}

// 渲染材料需求显示（包含可用性信息）- 返回数据结构用于组件渲染
export const getMaterialCostWithAvailability = (cost: MaterialCost, scrapMaterials: ScrapMaterials | undefined): Array<{text: string, isSufficient: boolean}> => {
  if (!scrapMaterials) {
    return [{text: renderMaterialCost(cost), isSufficient: true}]
  }

  const parts: Array<{text: string, isSufficient: boolean}> = []
  
  if (cost.fragments) {
    for (const [material, count] of Object.entries(cost.fragments)) {
      const index = MATERIAL_MAPPING.fragments[material]
      if (index !== undefined) {
        const available = scrapMaterials.fragments?.[index] || 0
        const isSufficient = available >= count
        const displayText = !isSufficient 
          ? `${count}${material}(${available}/${count})` 
          : `${count}${material}`
        parts.push({text: displayText, isSufficient})
      } else {
        parts.push({text: `${count}${material}`, isSufficient: true})
      }
    }
  }
  
  if (cost.metals) {
    for (const [material, count] of Object.entries(cost.metals)) {
      const index = MATERIAL_MAPPING.metals[material]
      if (index !== undefined) {
        const available = scrapMaterials.metals?.[index] || 0
        const isSufficient = available >= count
        const displayText = !isSufficient 
          ? `${count}${material}(${available}/${count})` 
          : `${count}${material}`
        parts.push({text: displayText, isSufficient})
      } else {
        parts.push({text: `${count}${material}`, isSufficient: true})
      }
    }
  }
  
  if (cost.components) {
    for (const [material, count] of Object.entries(cost.components)) {
      const index = MATERIAL_MAPPING.components[material]
      if (index !== undefined) {
        const available = scrapMaterials.components?.[index] || 0
        const isSufficient = available >= count
        const displayText = !isSufficient 
          ? `${count}${material}(${available}/${count})` 
          : `${count}${material}`
        parts.push({text: displayText, isSufficient})
      } else {
        parts.push({text: `${count}${material}`, isSufficient: true})
      }
    }
  }
  
  if (cost.relics) {
    const totalRelicsRequired = Object.values(cost.relics).reduce((sum, count) => sum + count, 0)
    const availableRelics = scrapMaterials.relics?.filter((relic: string) => relic.trim() !== '').length || 0
    for (const [material, count] of Object.entries(cost.relics)) {
      const isSufficient = availableRelics >= totalRelicsRequired
      const displayText = !isSufficient 
        ? `${count}${material}(${availableRelics}/${totalRelicsRequired})` 
        : `${count}${material}`
      parts.push({text: displayText, isSufficient})
    }
  }
  
  return parts
}